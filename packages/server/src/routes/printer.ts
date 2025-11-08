import { Router, Request, Response } from 'express';
import { printerService } from '../services';
import { authenticate, requireRole } from '../middleware/auth';
import { PrinterError } from '../errors/AppError';

const router = Router();

/**
 * GET /api/printer/status
 * Get printer connection status
 */
router.get('/status', authenticate, async (req: Request, res: Response) => {
  try {
    const status = printerService.getStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to get printer status',
    });
  }
});

/**
 * POST /api/printer/connect
 * Connect to printer with configuration
 */
router.post(
  '/connect',
  authenticate,
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      const { type, address, vendorId, productId, serialPath } = req.body;

      if (!type) {
        return res.status(400).json({ error: 'Printer type is required' });
      }

      const config: any = { type };

      if (type === 'network') {
        if (!address) {
          return res.status(400).json({ error: 'Address is required for network printer' });
        }
        config.address = address;
      } else if (type === 'usb') {
        if (!vendorId || !productId) {
          return res
            .status(400)
            .json({ error: 'vendorId and productId are required for USB printer' });
        }
        config.vendorId = parseInt(vendorId);
        config.productId = parseInt(productId);
      } else if (type === 'serial') {
        if (!serialPath) {
          return res.status(400).json({ error: 'serialPath is required for serial printer' });
        }
        config.serialPath = serialPath;
      }

      await printerService.connect(config);

      res.json({
        message: 'Printer connected successfully',
        status: printerService.getStatus(),
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to connect to printer',
      });
    }
  }
);

/**
 * POST /api/printer/disconnect
 * Disconnect from printer
 */
router.post(
  '/disconnect',
  authenticate,
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      await printerService.disconnect();
      res.json({ message: 'Printer disconnected successfully' });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to disconnect printer',
      });
    }
  }
);

/**
 * POST /api/printer/test
 * Test print
 */
router.post(
  '/test',
  authenticate,
  requireRole(['ADMIN']),
  async (req: Request, res: Response) => {
    try {
      await printerService.testPrint();
      res.json({ message: 'Test print sent successfully' });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Test print failed',
      });
    }
  }
);

/**
 * POST /api/printer/reprint/receipt/:orderId
 * Reprint customer receipt for an order
 */
router.post(
  '/reprint/receipt/:orderId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;

      // Get payment for this order
      const payment = await printerService['getSetting']('', ''); // Access via service
      // Actually, let's query directly
      const { paymentService } = await import('../services');
      const paymentRecord = await paymentService.getPaymentByOrderId(orderId);

      if (!paymentRecord) {
        return res.status(404).json({ error: 'Payment not found for this order' });
      }

      await printerService.printCustomerReceipt(orderId, paymentRecord.id);

      res.json({ message: 'Receipt reprinted successfully' });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to reprint receipt',
      });
    }
  }
);

/**
 * POST /api/printer/reprint/kitchen/:orderId
 * Reprint kitchen ticket for an order
 */
router.post(
  '/reprint/kitchen/:orderId',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const { orderId } = req.params;

      await printerService.printKitchenTicket(orderId);

      res.json({ message: 'Kitchen ticket reprinted successfully' });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : 'Failed to reprint kitchen ticket',
      });
    }
  }
);

export default router;
