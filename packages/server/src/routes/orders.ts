import { Router, Request, Response, NextFunction } from 'express';
import { orderService } from '../services';
import { authenticate, requireRole } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../errors/AppError';

const router = Router();

// All order routes require authentication
router.use(authenticate);

// GET /api/orders - List all orders with filtering
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, tableId, startDate, endDate } = req.query;

    let orders;

    // If filtering by table
    if (tableId) {
      const tableIdNum = parseInt(tableId as string, 10);
      if (isNaN(tableIdNum)) {
        throw new ValidationError('Invalid table ID');
      }
      orders = await orderService.getOrdersByTable(tableIdNum);
    } else {
      // Get all active orders or filter by status
      orders = await orderService.getActiveOrders();
      
      // Apply status filter if provided
      if (status) {
        orders = orders.filter((order) => order.status === status);
      }
      
      // Apply date range filter if provided
      if (startDate || endDate) {
        const start = startDate ? new Date(startDate as string) : new Date(0);
        const end = endDate ? new Date(endDate as string) : new Date();
        
        orders = orders.filter((order) => {
          const orderDate = new Date(order.createdAt);
          return orderDate >= start && orderDate <= end;
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        orders,
        count: orders.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/:id - Get order details
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await orderService.getOrderById(id);
    if (!order) {
      throw new NotFoundError('Order');
    }

    res.status(200).json({
      status: 'success',
      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/orders - Create new order
router.post('/', requireRole(['ADMIN', 'WAITER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableId, items, isBuffet, buffetCategoryId, buffetQuantity, discount, serviceCharge, tip } = req.body;

    // Validate input
    if (!tableId) {
      throw new ValidationError('Table ID is required');
    }

    // For buffet orders, items can be empty
    if (!isBuffet) {
      if (!items || !Array.isArray(items) || items.length === 0) {
        throw new ValidationError('Items are required for non-buffet orders');
      }

      // Validate items structure
      for (const item of items) {
        if (!item.menuItemId || !item.quantity || item.quantity <= 0) {
          throw new ValidationError('Each item must have menuItemId and positive quantity');
        }
      }
    } else {
      // Validate buffet order
      if (!buffetCategoryId) {
        throw new ValidationError('Buffet category ID is required for buffet orders');
      }
    }

    const order = await orderService.createOrder({
      tableId,
      items: items || [],
      isBuffet,
      buffetCategoryId,
      buffetQuantity,
      discount: discount || 0,
      serviceCharge: serviceCharge || 0,
      tip: tip || 0,
    });

    // TODO: Broadcast order:created event via WebSocket

    res.status(201).json({
      status: 'success',
      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/orders/:id - Update order status
router.patch('/:id', requireRole(['ADMIN', 'WAITER', 'CHEF']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      throw new ValidationError('Status is required');
    }

    const validStatuses = ['PENDING', 'PREPARING', 'READY', 'SERVED', 'PAID', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const order = await orderService.updateOrderStatus(id, status);

    // TODO: Broadcast order:updated event via WebSocket

    res.status(200).json({
      status: 'success',
      data: {
        order,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/orders/:id - Cancel order
router.delete('/:id', requireRole(['ADMIN', 'WAITER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const order = await orderService.cancelOrder(id);

    // TODO: Broadcast order:cancelled event via WebSocket

    res.status(200).json({
      status: 'success',
      data: {
        order,
      },
      message: 'Order cancelled successfully',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/orders/table/:tableId - Get orders for specific table
router.get('/table/:tableId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableId } = req.params;
    const tableIdNum = parseInt(tableId, 10);

    if (isNaN(tableIdNum)) {
      throw new ValidationError('Invalid table ID');
    }

    const orders = await orderService.getOrdersByTable(tableIdNum);

    res.status(200).json({
      status: 'success',
      data: {
        orders,
        count: orders.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
