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
          if (!printerConfig.ipAddress) {
            throw new PrinterError('Network printer requires ipAddress');
          }
          const ip = String(printerConfig.ipAddress);
          const port = parseInt(printerConfig.port || '9100', 10);

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
   * Groups items by printer to avoid duplicate tickets
   */
  async printOrderByCategory(orderId: string): Promise<void> {
    try {
      // Fetch the order with full details including category information
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          table: true,
          items: {
            include: {
              menuItem: {
                include: {
                  category: true,
                  buffetCategories: {
                    include: {
                      buffetCategory: true
                    }
                  }
                },
              },
            },
          },
        },
      });

      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      // Get business name for printing
      const businessName = await this.getSetting('business_name', 'Restaurant');

      // Group items by printer (not just by category)
      const itemsByPrinter = new Map<string, any[]>();

      for (const item of order.items) {
        // Use the primary category
        const categoryId = item.menuItem.categoryId;
        const categoryName = item.menuItem.category?.name || 'Unknown';

        console.log(`📝 Item: ${item.menuItem.name}, Category: ${categoryName} (${categoryId})`);

        // Get printers assigned to this category
        const printersForCategory = this.getPrintersForCategory(categoryId);

        if (printersForCategory.length === 0) {
          console.warn(`⚠️  No printer assigned for category ${categoryName}`);
          continue;
        }

        // Use first printer for this category
        const printer = printersForCategory[0];

        if (!itemsByPrinter.has(printer.id)) {
          itemsByPrinter.set(printer.id, []);
        }
        itemsByPrinter.get(printer.id)!.push(item);
      }

      // Print to each printer
      let printedCount = 0;

      for (const [printerId, items] of itemsByPrinter.entries()) {
        const connection = this.printers.get(printerId);

        if (!connection) {
          console.warn(`⚠️  Printer ${printerId} not found or disconnected`);
          continue;
        }

        console.log(`🖨️  Printing ${items.length} items to printer ${connection.name}`);

        // Print to the assigned printer
        await this.printKitchenTicketOnPrinter(connection, order, items, businessName);
        printedCount++;
      }

      console.log(`✅ Order ${orderId} printed across ${printedCount} printer(s)`);
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

      // Create fresh instance for this print job
      const p = this.createPrinterInstance(activePrinter);

      // Header
      p.alignCenter();
      p.bold(true);
      p.setTextSize(1, 1);
      p.println(businessName);
      p.setTextNormal();

      if (businessAddress) {
        p.println(businessAddress);
      }
      p.drawLine();

      // Order details - Italian labels
      p.alignLeft();
      p.println(`Data: ${new Date().toLocaleString('it-IT')}`);
      p.println(`Ordine #: ${String(order.id).substring(0, 8)}`);
      p.println(`Tavolo: ${order.table.name}`);
      p.println(`Pagamento: ${payment.method}`);
      p.drawLine();
      p.println('Articoli:');
      p.newLine();

      // Items list
      const footerInstruction = this.extractFooterInstruction(order.items);
      for (const item of order.items) {
        const itemName = item.menuItem.name;
        const qty = item.quantity;
        const price = item.price;
        const total = qty * price;

        p.print(`${itemName}  `);
        p.println(`${qty} x ${price.toFixed(2)} EUR = ${total.toFixed(2)} EUR`);

        const note = typeof item.notes === 'string' ? item.notes.trim() : '';
        if (note && (!footerInstruction || note !== footerInstruction)) {
          p.println(`  Nota: ${note}`);
        }
      }

      // Totals - Italian labels
      p.newLine();
      p.drawLine();

      // Total
      p.alignCenter();
      p.bold(true);
      p.setTextSize(1, 1);
      p.println(`TOTALE: ${order.total.toFixed(2)} EUR`);
      p.setTextNormal();

      p.drawLine();
      p.println('Grazie per la vostra visita!');
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
      // Header - Business Name
      p.alignCenter();
      p.bold(true);
      p.setTextSize(1, 1); // Double size for header
      p.println(order.table.name);
      p.setTextNormal();
      p.drawLine();

      // Order info - Italian labels
      p.alignLeft();
      p.setTextSize(0, 0); // Normal size
      p.println(`Ora: ${new Date().toLocaleTimeString('it-IT')}`); // "Time" in Italian
      p.println(`Ordine #: ${String(order.id).substring(0, 8)}`); // "Order" in Italian
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
          p.println(`  Nota: ${note}`); // "Note" in Italian
        }
        p.newLine();
      }

      p.drawLine();
      p.newLine();
      if (footerInstruction) {
        p.println(`Istruzioni Speciali: ${footerInstruction}`); // "Special Instructions" in Italian
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

  /**
   * Print merged customer receipt for multiple orders from the same table
   */
  async printMergedReceipt(orderIds: string[], paymentId: string, tableId: number): Promise<void> {
    try {
      // Get any active printer (use first available)
      const activePrinter = Array.from(this.printers.values())[0];

      if (!activePrinter) {
        console.warn('⚠️  No printer available for merged receipt');
        return;
      }
      if (!activePrinter.printerConfig) {
        throw new PrinterError('Printer not initialized');
      }

      // Fetch all orders
      const orders = await prisma.order.findMany({
        where: { id: { in: orderIds } },
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
          table: true,
        },
        orderBy: { createdAt: 'asc' },
      });

      if (orders.length === 0) {
        throw new Error('No orders found');
      }

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      // Get business settings
      const businessName = await this.getSetting('business_name', 'Restaurant');
      const businessAddress = await this.getSetting('business_address', '');

      // Calculate totals
      const totalSubtotal = orders.reduce((sum, o) => sum + o.subtotal, 0);
      const totalTax = orders.reduce((sum, o) => sum + o.tax, 0);
      const totalDiscount = orders.reduce((sum, o) => sum + o.discount, 0);
      const totalServiceCharge = orders.reduce((sum, o) => sum + o.serviceCharge, 0);
      const totalTip = orders.reduce((sum, o) => sum + o.tip, 0);
      const grandTotal = orders.reduce((sum, o) => sum + o.total, 0);

      // Collect all items
      const allItems: any[] = [];
      orders.forEach(order => {
        order.items.forEach(item => {
          allItems.push(item);
        });
      });

      // Create fresh printer instance for this print job
      const p = this.createPrinterInstance(activePrinter);

      // Header
      p.alignCenter();
      p.bold(true);
      p.setTextSize(1, 1);
      p.println(businessName);
      p.setTextNormal();

      if (businessAddress) {
        p.println(businessAddress);
      }
      p.drawLine();

      // Order details - Italian labels
      p.alignLeft();
      p.println(`Data: ${new Date().toLocaleString('it-IT')}`);
      p.println(`Tavolo: ${orders[0].table.name}`);
      p.println(`Ordini: ${orders.length}`);
      p.println(`Pagamento: ${payment.method}`);
      p.drawLine();
      p.println('Articoli:');
      p.newLine();

      // Items list
      const footerInstruction = this.extractFooterInstruction(allItems);
      for (const item of allItems) {
        const itemName = item.menuItem.name;
        const qty = item.quantity;
        const price = item.price;
        const total = qty * price;

        p.print(`${itemName}  `);
        p.println(`${qty} x ${price.toFixed(2)} EUR = ${total.toFixed(2)} EUR`);

        const note = typeof item.notes === 'string' ? item.notes.trim() : '';
        if (note && (!footerInstruction || note !== footerInstruction)) {
          p.println(`  Nota: ${note}`);
        }
      }

      // Totals - Italian labels
      p.newLine();
      p.drawLine();
      p.println(`Subtotale: ${totalSubtotal.toFixed(2)} EUR`);

      if (totalDiscount > 0) {
        p.println(`Sconto: -${totalDiscount.toFixed(2)} EUR`);
      }
      if (totalServiceCharge > 0) {
        p.println(`Servizio: ${totalServiceCharge.toFixed(2)} EUR`);
      }
      if (totalTip > 0) {
        p.println(`Mancia: ${totalTip.toFixed(2)} EUR`);
      }

      p.drawLine();

      if (footerInstruction) {
        p.println(`Istruzioni Speciali: ${footerInstruction}`);
      }

      // Total
      p.alignCenter();
      p.bold(true);
      p.setTextSize(1, 1);
      p.println(`TOTALE: ${grandTotal.toFixed(2)} EUR`);
      p.setTextNormal();

      p.drawLine();
      p.println('Grazie per la vostra visita!');
      p.newLine();
      p.newLine();
      p.cut();

      // Execute ONCE
      await p.execute();

      console.log(`✅ Merged customer receipt printed for ${orders.length} orders`);
    } catch (error) {
      console.error('Error printing merged receipt:', error);
      throw error;
    }
  }
}

// Export both default and named export
export const multiPrinterService = new MultiPrinterService();
export default multiPrinterService;
