import { Router, Request, Response, NextFunction } from 'express';
import { menuService, orderService } from '../services';
import { rateLimiter } from '../middleware/rateLimiter';
import { ValidationError, NotFoundError } from '../errors/AppError';

const router = Router();

// Apply rate limiting to all PWA routes
router.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later',
  })
);

// GET /menu - Public menu endpoint (no authentication required)
router.get('/menu', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;

    // Get only available menu items
    const menuItems = await menuService.getAvailableMenuItems(
      category as string | undefined
    );

    res.status(200).json({
      status: 'success',
      data: {
        menuItems,
        count: menuItems.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /categories - Get all categories including buffet info
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await menuService.getAllCategories();

    res.status(200).json({
      status: 'success',
      data: {
        categories,
        count: categories.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /order - Place order from PWA (no authentication required)
router.post('/order', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableId, items, notes, isBuffet, buffetCategoryId } = req.body;

    // Validate input
    if (!tableId || !items || !Array.isArray(items) || items.length === 0) {
      throw new ValidationError('Table ID and items are required');
    }

    // Validate items structure
    for (const item of items) {
      if (!item.menuItemId || !item.quantity || item.quantity <= 0) {
        throw new ValidationError('Each item must have menuItemId and positive quantity');
      }
    }

    // Validate buffet order
    if (isBuffet && !buffetCategoryId) {
      throw new ValidationError('Buffet category ID is required for buffet orders');
    }

    // Add notes to items if provided
    const itemsWithNotes = items.map((item) => ({
      ...item,
      notes: item.notes || notes,
    }));

    // Create order
    const order = await orderService.createOrder({
      tableId,
      items: itemsWithNotes,
      isBuffet: isBuffet || false,
      buffetCategoryId,
      discount: 0,
      serviceCharge: 0,
      tip: 0,
    });

    // TODO: Broadcast order:created event to desktop via WebSocket

    res.status(201).json({
      status: 'success',
      data: {
        order: {
          id: order.id,
          tableId: order.tableId,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
        },
      },
      message: 'Order placed successfully',
    });
  } catch (error) {
    next(error);
  }
});

// GET /order/:tableId - Get current order status for customer tracking
router.get('/order/:tableId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tableId } = req.params;
    const tableIdNum = parseInt(tableId, 10);

    if (isNaN(tableIdNum)) {
      throw new ValidationError('Invalid table ID');
    }

    // Get active orders for the table
    const orders = await orderService.getOrdersByTable(tableIdNum);

    // Filter to only active orders (not paid or cancelled)
    const activeOrders = orders.filter(
      (order) => order.status !== 'PAID' && order.status !== 'CANCELLED'
    );

    // Get the most recent active order
    const currentOrder = activeOrders.length > 0 ? activeOrders[0] : null;

    if (!currentOrder) {
      return res.status(200).json({
        status: 'success',
        data: {
          order: null,
          message: 'No active order for this table',
        },
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        order: {
          id: currentOrder.id,
          tableId: currentOrder.tableId,
          status: currentOrder.status,
          items: (currentOrder as any).items || [],
          subtotal: currentOrder.subtotal,
          tax: currentOrder.tax,
          total: currentOrder.total,
          createdAt: currentOrder.createdAt,
          updatedAt: currentOrder.updatedAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
