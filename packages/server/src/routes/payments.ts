import { Router, Request, Response, NextFunction } from 'express';
import { paymentService } from '../services';
import { authenticate, requireRole } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../errors/AppError';

const router = Router();

// All payment routes require authentication
router.use(authenticate);

// POST /api/payments - Process payment
router.post('/', requireRole(['ADMIN', 'WAITER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId, amount, method, reference } = req.body;

    // Validate required fields
    if (!orderId || amount === undefined || !method) {
      throw new ValidationError('Order ID, amount, and payment method are required');
    }

    if (typeof amount !== 'number' || amount <= 0) {
      throw new ValidationError('Amount must be a positive number');
    }

    const validMethods = ['CASH', 'CARD', 'WALLET'];
    if (!validMethods.includes(method)) {
      throw new ValidationError(`Invalid payment method. Must be one of: ${validMethods.join(', ')}`);
    }

    const payment = await paymentService.processPayment({
      orderId,
      amount,
      method,
      reference,
    });

    // TODO: Trigger receipt printing
    // TODO: Broadcast payment:completed event via WebSocket

    res.status(201).json({
      status: 'success',
      data: {
        payment,
      },
      message: 'Payment processed successfully',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/payments/:orderId - Get payment details
router.get('/:orderId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { orderId } = req.params;

    const payment = await paymentService.getPaymentByOrderId(orderId);
    if (!payment) {
      throw new NotFoundError('Payment');
    }

    res.status(200).json({
      status: 'success',
      data: {
        payment,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
