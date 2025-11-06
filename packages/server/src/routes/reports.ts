import { Router, Request, Response, NextFunction } from 'express';
import { paymentService, orderService } from '../services';
import { authenticate, requireRole } from '../middleware/auth';
import { ValidationError } from '../errors/AppError';

const router = Router();

// All report routes require authentication and admin/waiter role
router.use(authenticate);
router.use(requireRole(['ADMIN', 'WAITER']));

// GET /api/reports/sales - Sales report with date range and grouping
router.get('/sales', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { startDate, endDate, groupBy } = req.query;

    // Validate and parse dates
    let start: Date;
    let end: Date;

    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new ValidationError('Invalid start date format');
      }
    } else {
      // Default to start of current month
      start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
    }

    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new ValidationError('Invalid end date format');
      }
    } else {
      // Default to current date
      end = new Date();
      end.setHours(23, 59, 59, 999);
    }

    // Validate groupBy parameter
    const validGroupBy = ['day', 'week', 'month'];
    const groupByParam = groupBy as string | undefined;
    if (groupByParam && !validGroupBy.includes(groupByParam)) {
      throw new ValidationError(`Invalid groupBy parameter. Must be one of: ${validGroupBy.join(', ')}`);
    }

    const report = await paymentService.getSalesReport(
      start,
      end,
      groupByParam as 'day' | 'week' | 'month' | undefined
    );

    res.status(200).json({
      status: 'success',
      data: {
        report,
        dateRange: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/top-items - Top selling items report
router.get('/top-items', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { limit, startDate, endDate } = req.query;

    // Parse limit
    const limitNum = limit ? parseInt(limit as string, 10) : 10;
    if (isNaN(limitNum) || limitNum <= 0) {
      throw new ValidationError('Limit must be a positive number');
    }

    // Parse dates if provided
    let start: Date | undefined;
    let end: Date | undefined;

    if (startDate) {
      start = new Date(startDate as string);
      if (isNaN(start.getTime())) {
        throw new ValidationError('Invalid start date format');
      }
    }

    if (endDate) {
      end = new Date(endDate as string);
      if (isNaN(end.getTime())) {
        throw new ValidationError('Invalid end date format');
      }
    }

    const topItems = await paymentService.getTopSellingItems(limitNum, start, end);

    res.status(200).json({
      status: 'success',
      data: {
        topItems,
        count: topItems.length,
        dateRange: start && end ? {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        } : undefined,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/reports/orders - Order history report with filtering
router.get('/orders', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, tableId, startDate, endDate } = req.query;

    // Get all orders (will be filtered)
    let orders = await orderService.getActiveOrders();

    // Apply status filter
    if (status) {
      orders = orders.filter((order) => order.status === status);
    }

    // Apply table filter
    if (tableId) {
      const tableIdNum = parseInt(tableId as string, 10);
      if (isNaN(tableIdNum)) {
        throw new ValidationError('Invalid table ID');
      }
      orders = orders.filter((order) => order.tableId === tableIdNum);
    }

    // Apply date range filter
    if (startDate || endDate) {
      const start = startDate ? new Date(startDate as string) : new Date(0);
      const end = endDate ? new Date(endDate as string) : new Date();

      if (startDate && isNaN(start.getTime())) {
        throw new ValidationError('Invalid start date format');
      }
      if (endDate && isNaN(end.getTime())) {
        throw new ValidationError('Invalid end date format');
      }

      orders = orders.filter((order) => {
        const orderDate = new Date(order.createdAt);
        return orderDate >= start && orderDate <= end;
      });
    }

    // Calculate summary statistics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Status breakdown
    const statusBreakdown = orders.reduce((acc, order) => {
      acc[order.status] = (acc[order.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    res.status(200).json({
      status: 'success',
      data: {
        orders,
        summary: {
          totalOrders,
          totalRevenue,
          averageOrderValue,
          statusBreakdown,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
