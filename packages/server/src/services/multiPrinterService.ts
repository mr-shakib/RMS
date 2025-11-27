import { ThermalPrinter, PrinterTypes } from 'node-thermal-printer';
import prisma from '../db/client';
import { PrinterError } from '../errors/AppError';

export interface PrinterConnection {
  id: string;
  name: string;
  type: 'network' | 'usb' | 'serial';
  device: any;
  printer: ThermalPrinter | null;
  categoryIds: string[];
  isConnected: boolean;
  // Store printer config instead of reusing instance
  printerConfig: {
    type: any;
    interface: string;
    options: any;
  };
}

class MultiPrinterService {
  private printers: Map<string, PrinterConnection> = new Map();

  private extractFooterInstruction(items: any[]): string | null {
    const counts = new Map<string, number>();
    for (const it of items) {
      const n = typeof it.notes === 'string' ? it.notes.trim() : '';
      if (!n) continue;
      counts.set(n, (counts.get(n) || 0) + 1);
    }
    if (counts.size === 0) return null;
    let bestNote = '';
    let bestCount = 0;
    for (const [note, count] of counts.entries()) {
      if (count > bestCount) {
        bestNote = note;
        bestCount = count;
      }
    }
    if (!bestNote) return null;
    return bestNote;
  }

  /**
   * Initialize all active printers from database
   */
  async initializeAllPrinters(): Promise<void> {
    try {
      const activePrinters =
        ((prisma as any).printer?.findMany
          ? await (prisma as any).printer.findMany({
            where: { isActive: true },
            include: { categoryMappings: true },
          })
          : []) || [];

      console.log(`🖨️  Found ${activePrinters.length} active printer(s)`);

      for (const printerConfig of activePrinters) {
        try {
          await this.connectPrinter(printerConfig.id);
        } catch (error) {
          console.error(`⚠️  Failed to connect printer ${printerConfig.name}:`, error);
        }
      }
    } catch (error) {
      console.error('⚠️  Failed to initialize printers:', error);
    }
  }

  /**
   * Connect to a specific printer
   * Uses node-thermal-printer. Currently network printers are supported.
   */
  async connectPrinter(printerId: string): Promise<void> {
    try {
      const printerConfig = await (prisma as any).printer?.findUnique({
        where: { id: printerId },
        include: { categoryMappings: true },
      });

      if (!printerConfig) throw new PrinterError('Printer not found');
      if (!printerConfig.isActive) throw new PrinterError('Printer is not active');

      let printerInstanceConfig: any = null;

      switch (printerConfig.type) {
        case 'network': {
          if (!printerConfig.address) {
            throw new PrinterError('Network printer requires address');
          }
          const [ip, portFromAddr] = String(printerConfig.address).split(':');
          const port = parseInt(printerConfig.port || portFromAddr || '9100', 10);

          printerInstanceConfig = {
            type: PrinterTypes.EPSON,
            interface: `tcp://${ip}:${port}`,
            options: { timeout: 3000 },
          };

          // Test connection
          const testPrinter = new ThermalPrinter(printerInstanceConfig);
          const ok = await testPrinter.isPrinterConnected();
          if (!ok) throw new PrinterError(`Printer at ${ip}:${port} is not reachable`);
          break;
        }

        case 'usb':
          throw new PrinterError('USB printer support not yet implemented with node-thermal-printer');

        case 'serial':
          throw new PrinterError('Serial printer support not yet implemented with node-thermal-printer');

        default:
          throw new PrinterError(`Unsupported printer type: ${printerConfig.type}`);
      }

      const categoryIds = printerConfig.categoryMappings.map((m: any) => m.categoryId);

      this.printers.set(printerId, {
        id: printerId,
        name: printerConfig.name,
        type: printerConfig.type as 'network' | 'usb' | 'serial',
        device: null,
        printer: null, // Don't store instance
        printerConfig: printerInstanceConfig, // Store config instead
        categoryIds,
        isConnected: true,
      });

      console.log(`✅ Printer connected: ${printerConfig.name}`);
    } catch (error) {
      console.error(`❌ Failed to connect printer ${printerId}:`, error);
      throw error;
    }
  }

  /**
   * Disconnect a specific printer
   * node-thermal-printer does not keep an open connection; just drop the instance.
   */
  async disconnectPrinter(printerId: string): Promise<void> {
    const connection = this.printers.get(printerId);
    if (!connection) return;

    try {
      // No explicit close is required for node-thermal-printer
      this.printers.delete(printerId);
      console.log(`🔌 Printer disconnected: ${connection.name}`);
    } catch (error) {
      console.error(`Error disconnecting printer ${connection.name}:`, error);
    }
  }

  /**
   * Disconnect all printers
   */
  async disconnectAll(): Promise<void> {
    const printerIds = Array.from(this.printers.keys());
    for (const printerId of printerIds) {
      await this.disconnectPrinter(printerId);
    }
  }

  /**
   * Get printers for a specific category
   */
  getPrintersForCategory(categoryId: string): PrinterConnection[] {
    const printers: PrinterConnection[] = [];
    for (const connection of this.printers.values()) {
      if (connection.categoryIds.includes(categoryId) && connection.isConnected) {
        printers.push(connection);
      }
    }
    return printers;
  }

  /**
   * Print order items on appropriate printers based on category
   */
  async printOrderByCategory(orderId: string): Promise<void> {
    try {
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { menuItem: { include: { category: true } } } },
          table: true,
        },
      });

      if (!order) {
        throw new PrinterError('Order not found');
      }

      const itemsByCategory = new Map<string, typeof order.items>();
      for (const item of order.items) {
        const categoryId = item.menuItem.categoryId;
        if (!itemsByCategory.has(categoryId)) itemsByCategory.set(categoryId, []);
        itemsByCategory.get(categoryId)!.push(item);
      }

      const businessName = await this.getSetting('business_name', 'Restaurant');

      const printPromises: Promise<void>[] = [];

      for (const [categoryId, items] of itemsByCategory.entries()) {
        const printers = this.getPrintersForCategory(categoryId);

        if (printers.length === 0) {
          console.warn(`⚠️  No printer assigned for category ${items[0].menuItem.category.name}`);
          continue;
        }

        for (const printerConnection of printers) {
          printPromises.push(
            this.printKitchenTicketOnPrinter(printerConnection, order, items, businessName)
          );
        }
      }

      await Promise.all(printPromises);
      console.log(`✅ Order ${orderId} printed across ${printPromises.length} printer(s)`);
    } catch (error) {
      console.error('Error printing order by category:', error);
      throw error;
    }
  }

  async printFullOrder(orderId: string): Promise<void> {
    const printerId = await this.getSetting('full_order_printer_id', '');
    if (!printerId) return;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: { include: { menuItem: { include: { category: true } } } },
        table: true,
      },
    });
    if (!order) throw new PrinterError('Order not found');
    let connection = this.printers.get(printerId);
    if (!connection) {
      await this.connectPrinter(printerId);
      connection = this.printers.get(printerId) || null as any;
    }
    if (!connection) throw new PrinterError('Printer not available');
    const businessName = await this.getSetting('business_name', 'Restaurant');
    await this.printKitchenTicketOnPrinter(connection, order, order.items, businessName);
  }

  /**
   * Create a fresh printer instance for each print job
   */
  private createPrinterInstance(connection: PrinterConnection): ThermalPrinter {
    return new ThermalPrinter(connection.printerConfig);
  }

  /**
   * Print full customer receipt (all items on one printer)
   */
  async printCustomerReceipt(orderId: string, paymentId: string): Promise<void> {
    try {
      const activePrinter = Array.from(this.printers.values())[0];

      if (!activePrinter) {
        console.warn('⚠️  No printer available for customer receipt');
        return;
      }
      if (!activePrinter.printerConfig) {
        throw new PrinterError('Printer not initialized');
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { menuItem: true } },
          table: true,
          payment: true,
        },
      });

      const payment = await prisma.payment.findUnique({ where: { id: paymentId } });

      if (!order || !payment) {
        throw new PrinterError('Order or payment not found');
      }

      const businessName = await this.getSetting('business_name', 'Restaurant');
      const businessAddress = await this.getSetting('business_address', '');
      const currency = await this.getSetting('currency', 'USD');

      // Create fresh instance for this print job
      const p = this.createPrinterInstance(activePrinter);

      // Header
      p.alignCenter();
      p.bold(true);
      p.setTextSize(1, 1); // Use setTextSize instead of individual methods
      p.println(businessName);
      p.setTextNormal(); // Reset to normal

      if (businessAddress) {
        p.println(businessAddress);
      }
      p.drawLine();

      // Order details
      p.alignLeft();
      p.println(`Date: ${new Date().toLocaleString()}`);
      p.println(`Order #: ${String(order.id).substring(0, 8)}`);
      p.println(`Table: ${order.table.name}`);
      p.println(`Payment: ${payment.method}`);
      p.drawLine();
      p.println('Items:');
      p.newLine();

      // Items list
      const footerInstruction = this.extractFooterInstruction(order.items);
      for (const item of order.items) {
        const itemName = item.menuItem.name;
        const qty = item.quantity;
        const price = item.price;
        const total = qty * price;

        p.print(`${itemName}  `);
        p.println(`${qty} x ${currency} ${price.toFixed(2)} = ${currency} ${total.toFixed(2)}`);

        const note = typeof item.notes === 'string' ? item.notes.trim() : '';
        if (note && (!footerInstruction || note !== footerInstruction)) {
          p.println(`  Note: ${note}`);
        }
      }

      // Totals
      p.newLine();
      p.drawLine();
      p.println(`Subtotal: ${currency} ${order.subtotal.toFixed(2)}`);
      p.println(`Tax: ${currency} ${order.tax.toFixed(2)}`);

      if (order.discount > 0) {
        p.println(`Discount: -${currency} ${order.discount.toFixed(2)}`);
      }
      if (order.serviceCharge > 0) {
        p.println(`Service Charge: ${currency} ${order.serviceCharge.toFixed(2)}`);
      }
      if (order.tip > 0) {
        p.println(`Tip: ${currency} ${order.tip.toFixed(2)}`);
      }

      p.drawLine();

      if (footerInstruction) {
        p.println(`Special Instructions: ${footerInstruction}`);
      }

      // Total
      p.alignCenter();
      p.bold(true);
      p.setTextSize(1, 1);
      p.println(`TOTAL: ${currency} ${order.total.toFixed(2)}`);
      p.setTextNormal();

      p.drawLine();
      p.println('Thank you for your visit!');
      p.newLine();
      p.newLine();
      p.cut();

      // Execute ONCE
      await p.execute();

      console.log(`✅ Customer receipt printed for order ${orderId}`);
    } catch (error) {
      console.error('Error printing customer receipt:', error);
      throw error;
    }
  }

  /**
   * Print kitchen ticket on a specific printer
   */
  private async printKitchenTicketOnPrinter(
    connection: PrinterConnection,
    order: any,
    items: any[],
    businessName: string
  ): Promise<void> {
    if (!connection.printerConfig) {
      throw new PrinterError(`Printer ${connection.name} not initialized`);
    }

    // Create fresh instance for this print job
    const p = this.createPrinterInstance(connection);

    try {
      // Header
      p.alignCenter();
      p.bold(true);
      p.setTextSize(1, 1); // Double size for header
      p.println(businessName);
      p.setTextNormal();
      p.drawLine();

      // Order info
      p.alignLeft();
      p.setTextSize(0, 0); // Normal size
      p.println(`Time: ${new Date().toLocaleTimeString()}`);
      p.println(`Order #: ${String(order.id).substring(0, 8)}`);
      p.println(`Table: ${order.table.name}`);
      p.drawLine();

      // Items - with moderate emphasis
      const footerInstruction = this.extractFooterInstruction(items);
      for (const item of items) {
        p.bold(true);
        p.setTextSize(1, 0); // Wide but not tall - more readable
        p.println(`${item.quantity}x ${item.menuItem.name}`);
        p.setTextNormal();

        const note = typeof item.notes === 'string' ? item.notes.trim() : '';
        if (note && (!footerInstruction || note !== footerInstruction)) {
          p.setTextSize(0, 0); // Normal size for notes
          p.println(`  Note: ${note}`);
        }
        p.newLine();
      }

      p.drawLine();
      p.newLine();
      if (footerInstruction) {
        p.println(`Special Instructions: ${footerInstruction}`);
        p.newLine();
      }
      p.cut();

      // Execute ONCE
      await p.execute();

      console.log(`✅ Kitchen ticket printed on ${connection.name}`);
    } catch (error) {
      console.error(`Error printing on ${connection.name}:`, error);
      throw new PrinterError(
        `Failed to print on ${connection.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Test print on a specific printer
   */
  async testPrint(printerId: string): Promise<void> {
    const connection = this.printers.get(printerId);

    if (!connection) {
      await this.connectPrinter(printerId);
      return this.testPrint(printerId);
    }

    if (!connection.printerConfig) {
      throw new PrinterError(`Printer ${connection.name} not initialized`);
    }

    // Create fresh instance for this print job
    const p = this.createPrinterInstance(connection);

    try {
      p.alignCenter();
      p.bold(true);
      p.setTextSize(1, 1);
      p.println('TEST PRINT');
      p.setTextNormal();
      p.drawLine();
      
      p.alignLeft();
      p.println(`Printer: ${connection.name}`);
      p.println(`Type: ${connection.type}`);
      p.println(`Time: ${new Date().toLocaleString()}`);
      p.drawLine();
      
      p.alignCenter();
      p.println('If you can read this,');
      p.println('your printer is working!');
      p.newLine();
      p.cut();

      // Execute ONCE
      await p.execute();

      console.log(`✅ Test print successful on ${connection.name}`);
    } catch (error) {
      console.error(`Error test printing on ${connection.name}:`, error);
      throw new PrinterError(
        `Test print failed on ${connection.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Helper to get setting value
   */
  private async getSetting(key: string, defaultValue: string): Promise<string> {
    try {
      const setting = await prisma.setting.findUnique({ where: { key } });
      return setting?.value || defaultValue;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Get status of all printers
   */
  getStatus(): Map<string, boolean> {
    const status = new Map<string, boolean>();
    for (const [id, connection] of this.printers.entries()) {
      status.set(id, connection.isConnected);
    }
    return status;
  }
}

// Export both default and named export
export const multiPrinterService = new MultiPrinterService();
export default multiPrinterService;
