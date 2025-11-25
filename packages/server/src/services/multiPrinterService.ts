import Printer from 'escpos';
import USB from 'escpos-usb';
import Network from 'escpos-network';
import prisma from '../db/client';
import { PrinterError } from '../errors/AppError';

export interface PrinterConnection {
  id: string;
  name: string;
  type: 'network' | 'usb' | 'serial';
  device: any;
  printer: Printer | null;
  categoryIds: string[];
  isConnected: boolean;
}

class MultiPrinterService {
  private printers: Map<string, PrinterConnection> = new Map();

  /**
   * Initialize all active printers from database
   */
  async initializeAllPrinters(): Promise<void> {
    try {
      // Check if printer table exists (after migration)
      const activePrinters = await (prisma as any).printer?.findMany({
        where: { isActive: true },
        include: {
          categoryMappings: true,
        },
      }) || [];

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
   */
  async connectPrinter(printerId: string): Promise<void> {
    try {
      const printerConfig = await (prisma as any).printer?.findUnique({
        where: { id: printerId },
        include: {
          categoryMappings: true,
        },
      });

      if (!printerConfig) {
        throw new PrinterError('Printer not found');
      }

      if (!printerConfig.isActive) {
        throw new PrinterError('Printer is not active');
      }

      // Create device based on type
      let device: any = null;

      switch (printerConfig.type) {
        case 'network':
          if (!printerConfig.address) {
            throw new PrinterError('Network printer requires address');
          }
          const [ip, port] = printerConfig.address.split(':');
          device = new Network(ip, parseInt(printerConfig.port || port || '9100'));
          break;

        case 'usb':
          if (!printerConfig.vendorId || !printerConfig.productId) {
            throw new PrinterError('USB printer requires vendorId and productId');
          }
          const vendorId = parseInt(printerConfig.vendorId.replace('0x', ''), 16);
          const productId = parseInt(printerConfig.productId.replace('0x', ''), 16);
          const usbDevice = USB.findPrinter(vendorId, productId);
          if (!usbDevice) {
            throw new PrinterError(`USB printer not found (${printerConfig.vendorId}:${printerConfig.productId})`);
          }
          device = new USB(usbDevice);
          break;

        case 'serial':
          throw new PrinterError('Serial printer support not yet implemented');

        default:
          throw new PrinterError(`Unsupported printer type: ${printerConfig.type}`);
      }

      // Open device connection
      await new Promise<void>((resolve, reject) => {
        device.open((error: Error) => {
          if (error) {
            reject(new PrinterError(`Failed to open printer: ${error.message}`));
          } else {
            resolve();
          }
        });
      });

      const printer = new Printer(device);
      const categoryIds = printerConfig.categoryMappings.map((m: any) => m.categoryId);

      this.printers.set(printerId, {
        id: printerId,
        name: printerConfig.name,
        type: printerConfig.type as 'network' | 'usb' | 'serial',
        device,
        printer,
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
   */
  async disconnectPrinter(printerId: string): Promise<void> {
    const connection = this.printers.get(printerId);
    if (!connection) return;

    try {
      if (connection.device) {
        await new Promise<void>((resolve) => {
          connection.device.close(() => resolve());
        });
      }
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
          items: {
            include: {
              menuItem: {
                include: {
                  category: true,
                },
              },
            },
          },
          table: true,
        },
      });

      if (!order) {
        throw new PrinterError('Order not found');
      }

      // Group items by category
      const itemsByCategory = new Map<string, typeof order.items>();
      for (const item of order.items) {
        const categoryId = item.menuItem.categoryId;
        if (!itemsByCategory.has(categoryId)) {
          itemsByCategory.set(categoryId, []);
        }
        itemsByCategory.get(categoryId)!.push(item);
      }

      // Get business settings
      const businessName = await this.getSetting('business_name', 'Restaurant');

      // Print items on their designated printers
      const printPromises: Promise<void>[] = [];

      for (const [categoryId, items] of itemsByCategory.entries()) {
        const printers = this.getPrintersForCategory(categoryId);
        
        if (printers.length === 0) {
          console.warn(`⚠️  No printer assigned for category ${items[0].menuItem.category.name}`);
          continue;
        }

        // Print on all printers assigned to this category
        for (const printerConnection of printers) {
          printPromises.push(
            this.printKitchenTicketOnPrinter(
              printerConnection,
              order,
              items,
              businessName
            )
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

  /**
   * Print kitchen ticket on a specific printer
   */
  private async printKitchenTicketOnPrinter(
    connection: PrinterConnection,
    order: any,
    items: any[],
    businessName: string
  ): Promise<void> {
    if (!connection.printer) {
      throw new PrinterError(`Printer ${connection.name} not initialized`);
    }

    try {
      connection.printer
        .font('a')
        .align('ct')
        .style('bu')
        .size(1, 1)
        .text(businessName)
        .text(`[${connection.name}]`)
        .style('normal')
        .size(0, 0)
        .text('================================')
        .align('lt')
        .text(`Time: ${new Date().toLocaleTimeString()}`)
        .text(`Order #: ${order.id.substring(0, 8)}`)
        .text(`Table: ${order.table.name}`)
        .text('================================');

      // Print items
      for (const item of items) {
        connection.printer
          .style('bu')
          .size(1, 1)
          .text(`${item.quantity}x ${item.menuItem.name}`)
          .style('normal')
          .size(0, 0);

        if (item.notes) {
          connection.printer.text(`Note: ${item.notes}`);
        }
        connection.printer.text('');
      }

      connection.printer
        .text('================================')
        .text('')
        .cut();

      // Manually flush the device buffer to send data
      if (connection.device && typeof connection.device.write === 'function') {
        const buffer = (connection.printer as any).buffer;
        if (buffer && buffer.length > 0) {
          connection.device.write(buffer);
          (connection.printer as any).buffer = Buffer.alloc(0);
        }
      }

      // Wait a bit for data to be sent
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log(`✅ Kitchen ticket printed on ${connection.name}`);
    } catch (error) {
      console.error(`Error printing on ${connection.name}:`, error);
      throw new PrinterError(
        `Failed to print on ${connection.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Print full customer receipt (all items on one printer)
   */
  async printCustomerReceipt(orderId: string, paymentId: string): Promise<void> {
    try {
      // Find a printer for customer receipts
      // Priority: First active printer or fallback to any printer
      const activePrinter = Array.from(this.printers.values())[0];

      if (!activePrinter) {
        console.warn('⚠️  No printer available for customer receipt');
        return;
      }

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
          table: true,
          payment: true,
        },
      });

      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      });

      if (!order || !payment) {
        throw new PrinterError('Order or payment not found');
      }

      // Get business settings
      const businessName = await this.getSetting('business_name', 'Restaurant');
      const businessAddress = await this.getSetting('business_address', '');
      const currency = await this.getSetting('currency', 'USD');

      if (!activePrinter.printer) {
        throw new PrinterError('Printer not initialized');
      }

      // Print customer receipt
      activePrinter.printer
        .font('a')
        .align('ct')
        .style('bu')
        .size(1, 1)
        .text(businessName)
        .style('normal')
        .size(0, 0)
        .text(businessAddress)
        .text('--------------------------------')
        .align('lt')
        .text(`Date: ${new Date().toLocaleString()}`)
        .text(`Order #: ${order.id.substring(0, 8)}`)
        .text(`Table: ${order.table.name}`)
        .text(`Payment: ${payment.method}`)
        .text('--------------------------------')
        .text('Items:')
        .text('');

      // Print items
      for (const item of order.items) {
        const itemName = item.menuItem.name;
        const qty = item.quantity;
        const price = item.price;
        const total = qty * price;

        activePrinter.printer
          .text(`${itemName}`)
          .text(`  ${qty} x ${currency} ${price.toFixed(2)} = ${currency} ${total.toFixed(2)}`);

        if (item.notes) {
          activePrinter.printer.text(`  Note: ${item.notes}`);
        }
      }

      // Print totals
      activePrinter.printer
        .text('')
        .text('--------------------------------')
        .text(`Subtotal: ${currency} ${order.subtotal.toFixed(2)}`)
        .text(`Tax: ${currency} ${order.tax.toFixed(2)}`);

      if (order.discount > 0) {
        activePrinter.printer.text(`Discount: -${currency} ${order.discount.toFixed(2)}`);
      }

      if (order.serviceCharge > 0) {
        activePrinter.printer.text(`Service Charge: ${currency} ${order.serviceCharge.toFixed(2)}`);
      }

      if (order.tip > 0) {
        activePrinter.printer.text(`Tip: ${currency} ${order.tip.toFixed(2)}`);
      }

      activePrinter.printer
        .text('--------------------------------')
        .style('bu')
        .size(1, 1)
        .text(`TOTAL: ${currency} ${order.total.toFixed(2)}`)
        .style('normal')
        .size(0, 0)
        .text('--------------------------------')
        .align('ct')
        .text('Thank you for your visit!')
        .text('')
        .text('')
        .cut();

      // Manually flush the device buffer to send data
      if (activePrinter.device && typeof activePrinter.device.write === 'function') {
        const buffer = (activePrinter.printer as any).buffer;
        if (buffer && buffer.length > 0) {
          activePrinter.device.write(buffer);
          (activePrinter.printer as any).buffer = Buffer.alloc(0);
        }
      }

      // Wait a bit for data to be sent
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log(`✅ Customer receipt printed for order ${orderId}`);
    } catch (error) {
      console.error('Error printing customer receipt:', error);
      throw error;
    }
  }

  /**
   * Test print on a specific printer
   */
  async testPrint(printerId: string): Promise<void> {
    const connection = this.printers.get(printerId);
    
    if (!connection) {
      // Try to connect if not already connected
      await this.connectPrinter(printerId);
      return this.testPrint(printerId);
    }

    if (!connection.printer) {
      throw new PrinterError(`Printer ${connection.name} not initialized`);
    }

    try {
      connection.printer
        .font('a')
        .align('ct')
        .style('bu')
        .size(1, 1)
        .text('TEST PRINT')
        .style('normal')
        .size(0, 0)
        .text('================================')
        .align('lt')
        .text(`Printer: ${connection.name}`)
        .text(`Type: ${connection.type}`)
        .text(`Time: ${new Date().toLocaleString()}`)
        .text('================================')
        .align('ct')
        .text('If you can read this,')
        .text('your printer is working!')
        .text('')
        .cut();

      // Manually flush the device buffer to send data
      if (connection.device && typeof connection.device.write === 'function') {
        const buffer = (connection.printer as any).buffer;
        if (buffer && buffer.length > 0) {
          connection.device.write(buffer);
          (connection.printer as any).buffer = Buffer.alloc(0);
        }
      }

      // Wait a bit for data to be sent
      await new Promise(resolve => setTimeout(resolve, 100));

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
    } catch (error) {
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

export const multiPrinterService = new MultiPrinterService();
