import Printer from 'escpos';
import USB from 'escpos-usb';
import Network from 'escpos-network';
import prisma from '../db/client';
import { PrinterError } from '../errors/AppError';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { emitPrinterError } from '../websocket';

export type PrinterType = 'network' | 'usb' | 'serial';

export interface PrinterConfig {
  type: PrinterType;
  address?: string; // For network printers (IP:PORT)
  vendorId?: number; // For USB printers
  productId?: number; // For USB printers
  serialPath?: string; // For serial printers
}

export interface PrinterStatus {
  connected: boolean;
  type?: PrinterType;
  lastError?: string;
  queueLength?: number;
}

interface PrintJob {
  id: string;
  type: 'customer_receipt' | 'kitchen_ticket' | 'test';
  orderId?: string;
  paymentId?: string;
  retries: number;
  maxRetries: number;
  execute: () => Promise<void>;
}

class PrinterService {
  private printer: Printer | null = null;
  private device: any = null;
  private config: PrinterConfig | null = null;
  private status: PrinterStatus = { connected: false };
  private printQueue: PrintJob[] = [];
  private isProcessingQueue: boolean = false;

  /**
   * Connect to printer based on configuration
   */
  async connect(config: PrinterConfig): Promise<void> {
    try {
      // Disconnect existing connection if any
      if (this.printer) {
        await this.disconnect();
      }

      this.config = config;

      // Create device based on type
      switch (config.type) {
        case 'network':
          if (!config.address) {
            throw new PrinterError('Network printer requires address (IP:PORT)');
          }
          const [ip, port] = config.address.split(':');
          this.device = new Network(ip, parseInt(port || '9100'));
          break;

        case 'usb':
          if (!config.vendorId || !config.productId) {
            throw new PrinterError('USB printer requires vendorId and productId');
          }
          // Find USB device
          const usbDevice = USB.findPrinter(config.vendorId, config.productId);
          if (!usbDevice) {
            throw new PrinterError(
              `USB printer not found (vendorId: ${config.vendorId}, productId: ${config.productId})`
            );
          }
          this.device = new USB(usbDevice);
          break;

        case 'serial':
          if (!config.serialPath) {
            throw new PrinterError('Serial printer requires serialPath');
          }
          // Serial support would require additional library
          throw new PrinterError('Serial printer support not yet implemented');

        default:
          throw new PrinterError(`Unsupported printer type: ${config.type}`);
      }

      // Open device connection
      await new Promise<void>((resolve, reject) => {
        this.device.open((error: Error) => {
          if (error) {
            reject(new PrinterError(`Failed to open printer: ${error.message}`));
          } else {
            resolve();
          }
        });
      });

      // Create printer instance
      this.printer = new Printer(this.device);

      // Update status
      this.status = {
        connected: true,
        type: config.type,
      };

      // Save configuration to database
      await this.saveConfig(config);

      console.log(`✅ Printer connected: ${config.type}`);
    } catch (error) {
      this.status = {
        connected: false,
        lastError: error instanceof Error ? error.message : 'Unknown error',
      };
      throw error;
    }
  }

  /**
   * Disconnect from printer with proper resource cleanup
   */
  async disconnect(): Promise<void> {
    try {
      if (this.device) {
        await new Promise<void>((resolve) => {
          this.device.close(() => {
            resolve();
          });
        });
      }

      this.printer = null;
      this.device = null;
      this.config = null;
      this.status = { connected: false };

      console.log('✅ Printer disconnected');
    } catch (error) {
      console.error('Error disconnecting printer:', error);
      // Still reset state even if disconnect fails
      this.printer = null;
      this.device = null;
      this.config = null;
      this.status = { connected: false };
    }
  }

  /**
   * Check printer connection status
   */
  getStatus(): PrinterStatus {
    return { 
      ...this.status,
      queueLength: this.printQueue.length,
    };
  }

  /**
   * Check if printer is connected
   */
  isConnected(): boolean {
    return this.status.connected && this.printer !== null;
  }

  /**
   * Load printer configuration from database
   */
  async loadConfig(): Promise<PrinterConfig | null> {
    try {
      const typeSetting = await prisma.setting.findUnique({
        where: { key: 'printer_type' },
      });

      if (!typeSetting) {
        return null;
      }

      const config: PrinterConfig = {
        type: typeSetting.value as PrinterType,
      };

      // Load type-specific settings
      switch (config.type) {
        case 'network':
          const addressSetting = await prisma.setting.findUnique({
            where: { key: 'printer_address' },
          });
          if (addressSetting) {
            config.address = addressSetting.value;
          }
          break;

        case 'usb':
          const vendorIdSetting = await prisma.setting.findUnique({
            where: { key: 'printer_vendor_id' },
          });
          const productIdSetting = await prisma.setting.findUnique({
            where: { key: 'printer_product_id' },
          });
          if (vendorIdSetting && productIdSetting) {
            config.vendorId = parseInt(vendorIdSetting.value);
            config.productId = parseInt(productIdSetting.value);
          }
          break;

        case 'serial':
          const serialPathSetting = await prisma.setting.findUnique({
            where: { key: 'printer_serial_path' },
          });
          if (serialPathSetting) {
            config.serialPath = serialPathSetting.value;
          }
          break;
      }

      return config;
    } catch (error) {
      console.error('Error loading printer config:', error);
      return null;
    }
  }

  /**
   * Save printer configuration to database
   */
  private async saveConfig(config: PrinterConfig): Promise<void> {
    try {
      // Save printer type
      await prisma.setting.upsert({
        where: { key: 'printer_type' },
        update: { value: config.type },
        create: { key: 'printer_type', value: config.type },
      });

      // Save type-specific settings
      switch (config.type) {
        case 'network':
          if (config.address) {
            await prisma.setting.upsert({
              where: { key: 'printer_address' },
              update: { value: config.address },
              create: { key: 'printer_address', value: config.address },
            });
          }
          break;

        case 'usb':
          if (config.vendorId !== undefined) {
            await prisma.setting.upsert({
              where: { key: 'printer_vendor_id' },
              update: { value: config.vendorId.toString() },
              create: { key: 'printer_vendor_id', value: config.vendorId.toString() },
            });
          }
          if (config.productId !== undefined) {
            await prisma.setting.upsert({
              where: { key: 'printer_product_id' },
              update: { value: config.productId.toString() },
              create: { key: 'printer_product_id', value: config.productId.toString() },
            });
          }
          break;

        case 'serial':
          if (config.serialPath) {
            await prisma.setting.upsert({
              where: { key: 'printer_serial_path' },
              update: { value: config.serialPath },
              create: { key: 'printer_serial_path', value: config.serialPath },
            });
          }
          break;
      }
    } catch (error) {
      console.error('Error saving printer config:', error);
    }
  }

  /**
   * Initialize printer connection from saved configuration
   */
  async initialize(): Promise<boolean> {
    try {
      const config = await this.loadConfig();
      if (!config) {
        console.log('ℹ️ No printer configuration found');
        return false;
      }

      await this.connect(config);
      return true;
    } catch (error) {
      console.error('Failed to initialize printer:', error);
      return false;
    }
  }

  /**
   * Add print job to queue
   */
  private async addToQueue(job: Omit<PrintJob, 'retries' | 'maxRetries'>): Promise<void> {
    const printJob: PrintJob = {
      ...job,
      retries: 0,
      maxRetries: 3,
    };
    
    this.printQueue.push(printJob);
    console.log(`📋 Print job added to queue: ${job.type} (Queue length: ${this.printQueue.length})`);
    
    // Start processing queue if not already processing
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * Process print queue with retry logic
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue) {
      return;
    }

    this.isProcessingQueue = true;

    while (this.printQueue.length > 0) {
      const job = this.printQueue.shift();
      if (!job) continue;

      try {
        console.log(`🖨️  Processing print job: ${job.type} (Attempt ${job.retries + 1}/${job.maxRetries + 1})`);
        await job.execute();
        console.log(`✅ Print job completed: ${job.type}`);
      } catch (error) {
        console.error(`❌ Print job failed: ${job.type}`, error);
        
        // Check if we should retry
        if (job.retries < job.maxRetries) {
          job.retries++;
          const retryDelay = Math.min(1000 * Math.pow(2, job.retries), 10000); // Exponential backoff, max 10s
          
          console.log(`🔄 Retrying print job in ${retryDelay}ms (Attempt ${job.retries + 1}/${job.maxRetries + 1})`);
          
          // Re-add to queue after delay
          setTimeout(() => {
            this.printQueue.push(job);
            if (!this.isProcessingQueue) {
              this.processQueue();
            }
          }, retryDelay);
        } else {
          // Max retries exceeded, emit error
          console.error(`❌ Print job failed after ${job.maxRetries + 1} attempts: ${job.type}`);
          
          try {
            emitPrinterError({
              message: error instanceof Error 
                ? `Print failed after ${job.maxRetries + 1} attempts: ${error.message}`
                : 'Unknown printer error',
              type: job.type,
              orderId: job.orderId,
            });
          } catch (wsError) {
            console.error('Failed to emit printer error:', wsError);
          }
          
          // Generate PDF fallback for customer receipts
          if (job.type === 'customer_receipt' && job.orderId && job.paymentId) {
            try {
              console.log('📄 Generating PDF fallback for failed print job');
              // Fetch order and payment data
              const order = await prisma.order.findUnique({
                where: { id: job.orderId },
                include: {
                  table: true,
                  items: {
                    include: {
                      menuItem: true,
                    },
                  },
                },
              });
              
              const payment = await prisma.payment.findUnique({
                where: { id: job.paymentId },
              });
              
              if (order && payment) {
                const businessName = (await prisma.setting.findUnique({ where: { key: 'business_name' } }))?.value || 'Restaurant';
                const businessAddress = (await prisma.setting.findUnique({ where: { key: 'business_address' } }))?.value || '';
                const currency = (await prisma.setting.findUnique({ where: { key: 'currency' } }))?.value || 'USD';
                
                await this.generateCustomerReceiptPDF(order, payment, businessName, businessAddress, currency);
              }
            } catch (pdfError) {
              console.error('Failed to generate PDF fallback:', pdfError);
            }
          }
        }
      }

      // Small delay between print jobs to avoid overwhelming the printer
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    this.isProcessingQueue = false;
  }

  /**
   * Print customer receipt with formatted layout
   */
  async printCustomerReceipt(orderId: string, paymentId: string): Promise<void> {
    // Add to queue instead of printing directly
    await this.addToQueue({
      id: `receipt-${orderId}-${Date.now()}`,
      type: 'customer_receipt',
      orderId,
      paymentId,
      execute: async () => {
        await this.executePrintCustomerReceipt(orderId, paymentId);
      },
    });
  }

  /**
   * Execute customer receipt printing
   */
  private async executePrintCustomerReceipt(orderId: string, paymentId: string): Promise<void> {
    try {
      // Fetch order and payment details
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

      if (!this.isConnected()) {
        // Fallback to PDF if printer not connected
        await this.generateCustomerReceiptPDF(order, payment, businessName, businessAddress, currency);
        return;
      }

      if (!this.printer) {
        throw new PrinterError('Printer not initialized');
      }

      // Print receipt
      this.printer
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

        this.printer
          .text(`${itemName}`)
          .text(`  ${qty} x ${currency} ${price.toFixed(2)} = ${currency} ${total.toFixed(2)}`);

        if (item.notes) {
          this.printer.text(`  Note: ${item.notes}`);
        }
      }

      // Print totals
      this.printer
        .text('')
        .text('--------------------------------')
        .text(`Subtotal: ${currency} ${order.subtotal.toFixed(2)}`)
        .text(`Tax: ${currency} ${order.tax.toFixed(2)}`);

      if (order.discount > 0) {
        this.printer.text(`Discount: -${currency} ${order.discount.toFixed(2)}`);
      }

      if (order.serviceCharge > 0) {
        this.printer.text(`Service Charge: ${currency} ${order.serviceCharge.toFixed(2)}`);
      }

      if (order.tip > 0) {
        this.printer.text(`Tip: ${currency} ${order.tip.toFixed(2)}`);
      }

      this.printer
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
        .cut()
        .close();

      console.log(`✅ Customer receipt printed for order ${orderId}`);
    } catch (error) {
      console.error('Error printing customer receipt:', error);
      throw new PrinterError(
        `Failed to print customer receipt: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Print kitchen ticket with simplified layout
   */
  async printKitchenTicket(orderId: string): Promise<void> {
    // Add to queue instead of printing directly
    await this.addToQueue({
      id: `kitchen-${orderId}-${Date.now()}`,
      type: 'kitchen_ticket',
      orderId,
      execute: async () => {
        await this.executePrintKitchenTicket(orderId);
      },
    });
  }

  /**
   * Execute kitchen ticket printing
   */
  private async executePrintKitchenTicket(orderId: string): Promise<void> {
    try {
      // Fetch order details
      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
          table: true,
        },
      });

      if (!order) {
        throw new PrinterError('Order not found');
      }

      if (!this.isConnected()) {
        // Fallback to PDF if printer not connected
        await this.generateKitchenTicketPDF(order);
        return;
      }

      if (!this.printer) {
        throw new PrinterError('Printer not initialized');
      }

      // Print kitchen ticket
      this.printer
        .font('a')
        .align('ct')
        .style('bu')
        .size(1, 1)
        .text('KITCHEN ORDER')
        .style('normal')
        .size(0, 0)
        .text('================================')
        .align('lt')
        .text(`Time: ${new Date().toLocaleTimeString()}`)
        .text(`Order #: ${order.id.substring(0, 8)}`)
        .style('bu')
        .size(1, 1)
        .text(`Table: ${order.table.name}`)
        .style('normal')
        .size(0, 0)
        .text('================================')
        .text('');

      // Print items (no prices for kitchen)
      for (const item of order.items) {
        this.printer
          .style('bu')
          .size(1, 1)
          .text(`${item.quantity}x ${item.menuItem.name}`)
          .style('normal')
          .size(0, 0);

        if (item.notes) {
          this.printer.text(`   ** ${item.notes} **`);
        }

        this.printer.text('');
      }

      this.printer
        .text('================================')
        .text('')
        .text('')
        .cut()
        .close();

      console.log(`✅ Kitchen ticket printed for order ${orderId}`);
    } catch (error) {
      console.error('Error printing kitchen ticket:', error);
      throw new PrinterError(
        `Failed to print kitchen ticket: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Test print function for configuration testing
   */
  async testPrint(): Promise<void> {
    // Add to queue instead of printing directly
    await this.addToQueue({
      id: `test-${Date.now()}`,
      type: 'test',
      execute: async () => {
        await this.executeTestPrint();
      },
    });
  }

  /**
   * Execute test print
   */
  private async executeTestPrint(): Promise<void> {
    try {
      if (!this.isConnected()) {
        throw new PrinterError('Printer not connected');
      }

      if (!this.printer) {
        throw new PrinterError('Printer not initialized');
      }

      const businessName = await this.getSetting('business_name', 'Restaurant');

      this.printer
        .font('a')
        .align('ct')
        .style('bu')
        .size(1, 1)
        .text(businessName)
        .style('normal')
        .size(0, 0)
        .text('--------------------------------')
        .text('TEST PRINT')
        .text('--------------------------------')
        .text(`Date: ${new Date().toLocaleString()}`)
        .text('')
        .text('If you can read this,')
        .text('your printer is working correctly!')
        .text('')
        .text('--------------------------------')
        .text(`Printer Type: ${this.config?.type || 'Unknown'}`)
        .text('--------------------------------')
        .text('')
        .text('')
        .cut()
        .close();

      console.log('✅ Test print completed');
    } catch (error) {
      console.error('Error during test print:', error);
      throw new PrinterError(
        `Test print failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Generate customer receipt as PDF (fallback when printer unavailable)
   */
  private async generateCustomerReceiptPDF(
    order: any,
    payment: any,
    businessName: string,
    businessAddress: string,
    currency: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const receiptsDir = path.join(process.cwd(), 'receipts');
        if (!fs.existsSync(receiptsDir)) {
          fs.mkdirSync(receiptsDir, { recursive: true });
        }

        const filename = `receipt-${order.id}-${Date.now()}.pdf`;
        const filepath = path.join(receiptsDir, filename);

        const doc = new PDFDocument({ size: [226.77, 841.89], margin: 20 }); // 80mm width
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        doc.fontSize(16).font('Helvetica-Bold').text(businessName, { align: 'center' });
        doc.fontSize(10).font('Helvetica').text(businessAddress, { align: 'center' });
        doc.moveDown();
        doc.text('--------------------------------', { align: 'center' });
        doc.moveDown();

        // Order info
        doc.fontSize(10);
        doc.text(`Date: ${new Date().toLocaleString()}`);
        doc.text(`Order #: ${order.id.substring(0, 8)}`);
        doc.text(`Table: ${order.table.name}`);
        doc.text(`Payment: ${payment.method}`);
        doc.moveDown();
        doc.text('--------------------------------', { align: 'center' });
        doc.moveDown();

        // Items
        doc.font('Helvetica-Bold').text('Items:');
        doc.font('Helvetica');
        doc.moveDown(0.5);

        for (const item of order.items) {
          doc.text(item.menuItem.name);
          doc.text(
            `  ${item.quantity} x ${currency} ${item.price.toFixed(2)} = ${currency} ${(
              item.quantity * item.price
            ).toFixed(2)}`
          );
          if (item.notes) {
            doc.text(`  Note: ${item.notes}`);
          }
          doc.moveDown(0.5);
        }

        // Totals
        doc.text('--------------------------------', { align: 'center' });
        doc.moveDown(0.5);
        doc.text(`Subtotal: ${currency} ${order.subtotal.toFixed(2)}`);
        doc.text(`Tax: ${currency} ${order.tax.toFixed(2)}`);

        if (order.discount > 0) {
          doc.text(`Discount: -${currency} ${order.discount.toFixed(2)}`);
        }
        if (order.serviceCharge > 0) {
          doc.text(`Service Charge: ${currency} ${order.serviceCharge.toFixed(2)}`);
        }
        if (order.tip > 0) {
          doc.text(`Tip: ${currency} ${order.tip.toFixed(2)}`);
        }

        doc.moveDown();
        doc.text('--------------------------------', { align: 'center' });
        doc.fontSize(14).font('Helvetica-Bold');
        doc.text(`TOTAL: ${currency} ${order.total.toFixed(2)}`, { align: 'center' });
        doc.fontSize(10).font('Helvetica');
        doc.text('--------------------------------', { align: 'center' });
        doc.moveDown();
        doc.text('Thank you for your visit!', { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          console.log(`✅ Customer receipt PDF generated: ${filepath}`);
          resolve(filepath);
        });

        stream.on('error', (error) => {
          reject(new PrinterError(`Failed to generate PDF: ${error.message}`));
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate kitchen ticket as PDF (fallback when printer unavailable)
   */
  private async generateKitchenTicketPDF(order: any): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const receiptsDir = path.join(process.cwd(), 'receipts');
        if (!fs.existsSync(receiptsDir)) {
          fs.mkdirSync(receiptsDir, { recursive: true });
        }

        const filename = `kitchen-${order.id}-${Date.now()}.pdf`;
        const filepath = path.join(receiptsDir, filename);

        const doc = new PDFDocument({ size: [226.77, 841.89], margin: 20 }); // 80mm width
        const stream = fs.createWriteStream(filepath);

        doc.pipe(stream);

        // Header
        doc.fontSize(18).font('Helvetica-Bold').text('KITCHEN ORDER', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).font('Helvetica');
        doc.text('================================', { align: 'center' });
        doc.moveDown();

        // Order info
        doc.text(`Time: ${new Date().toLocaleTimeString()}`);
        doc.text(`Order #: ${order.id.substring(0, 8)}`);
        doc.fontSize(16).font('Helvetica-Bold');
        doc.text(`Table: ${order.table.name}`);
        doc.fontSize(10).font('Helvetica');
        doc.moveDown();
        doc.text('================================', { align: 'center' });
        doc.moveDown();

        // Items
        for (const item of order.items) {
          doc.fontSize(14).font('Helvetica-Bold');
          doc.text(`${item.quantity}x ${item.menuItem.name}`);
          doc.fontSize(10).font('Helvetica');

          if (item.notes) {
            doc.text(`   ** ${item.notes} **`);
          }
          doc.moveDown();
        }

        doc.text('================================', { align: 'center' });

        doc.end();

        stream.on('finish', () => {
          console.log(`✅ Kitchen ticket PDF generated: ${filepath}`);
          resolve(filepath);
        });

        stream.on('error', (error) => {
          reject(new PrinterError(`Failed to generate PDF: ${error.message}`));
        });
      } catch (error) {
        reject(error);
      }
    });
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
}

export default new PrinterService();
