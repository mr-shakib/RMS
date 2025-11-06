import prisma from '../db/client';
import { Payment } from '@prisma/client';
import { emitPaymentCompleted } from '../websocket';

export type PaymentMethod = 'CASH' | 'CARD' | 'WALLET';

interface ProcessPaymentInput {
  orderId: string;
  amount: number;
  method: PaymentMethod;
  reference?: string;
}

interface SalesReport {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  paymentMethodBreakdown: {
    method: string;
    count: number;
    total: number;
  }[];
  dailyBreakdown?: {
    date: string;
    revenue: number;
    orders: number;
  }[];
}

class PaymentService {
  /**
   * Process a payment for an order
   * Creates payment record and updates order status to PAID
   */
  async processPayment(input: ProcessPaymentInput): Promise<Payment> {
    const { orderId, amount, method, reference } = input;

    // Get order
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payment: true },
    });

    if (!order) {
      throw new Error(`Order with id ${orderId} not found`);
    }

    // Check if order is already paid
    if (order.payment) {
      throw new Error('Order has already been paid');
    }

    // Validate order status
    if (order.status !== 'SERVED') {
      throw new Error('Order must be in SERVED status before payment');
    }

    // Validate amount matches order total
    if (Math.abs(amount - order.total) > 0.01) {
      throw new Error(`Payment amount ${amount} does not match order total ${order.total}`);
    }

    // Create payment and update order status in a transaction
    const payment = await prisma.$transaction(async (tx) => {
      const newPayment = await tx.payment.create({
        data: {
          orderId,
          amount,
          method,
          reference,
        },
        include: {
          order: {
            include: {
              items: {
                include: {
                  menuItem: true,
                },
              },
              table: true,
            },
          },
        },
      });

      // Update order status to PAID
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
      });

      // Check if table has any other active orders
      const activeOrders = await tx.order.findMany({
        where: {
          tableId: order.tableId,
          status: {
            notIn: ['PAID', 'CANCELLED'],
          },
        },
      });

      // If no active orders, set table to FREE
      if (activeOrders.length === 0) {
        await tx.table.update({
          where: { id: order.tableId },
          data: { status: 'FREE' },
        });
      }

      return newPayment;
    });

    // Emit WebSocket event for payment completion
    try {
      emitPaymentCompleted(payment);
    } catch (error) {
      console.error('Failed to emit payment:completed event:', error);
    }

    return payment;
  }

  /**
   * Get payment by order ID
   */
  async getPaymentByOrderId(orderId: string): Promise<Payment | null> {
    const payment = await prisma.payment.findUnique({
      where: { orderId },
      include: {
        order: {
          include: {
            items: {
              include: {
                menuItem: true,
              },
            },
            table: true,
          },
        },
      },
    });

    return payment;
  }

  /**
   * Get daily sales total
   */
  async getDailySales(date: Date): Promise<number> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await prisma.payment.aggregate({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  /**
   * Get weekly sales total
   */
  async getWeeklySales(date: Date): Promise<number> {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const result = await prisma.payment.aggregate({
      where: {
        createdAt: {
          gte: startOfWeek,
          lte: endOfWeek,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  /**
   * Get monthly sales total
   */
  async getMonthlySales(date: Date): Promise<number> {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);

    const result = await prisma.payment.aggregate({
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    return result._sum.amount || 0;
  }

  /**
   * Get sales report with date range filtering and grouping
   */
  async getSalesReport(
    startDate: Date,
    endDate: Date,
    groupBy?: 'day' | 'week' | 'month'
  ): Promise<SalesReport> {
    // Get all payments in date range
    const payments = await prisma.payment.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        order: true,
      },
    });

    // Calculate totals
    const totalRevenue = payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalOrders = payments.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Payment method breakdown
    const methodMap = new Map<string, { count: number; total: number }>();
    payments.forEach((payment) => {
      const existing = methodMap.get(payment.method) || { count: 0, total: 0 };
      methodMap.set(payment.method, {
        count: existing.count + 1,
        total: existing.total + payment.amount,
      });
    });

    const paymentMethodBreakdown = Array.from(methodMap.entries()).map(([method, data]) => ({
      method,
      count: data.count,
      total: data.total,
    }));

    // Daily breakdown if requested
    let dailyBreakdown: { date: string; revenue: number; orders: number }[] | undefined;
    if (groupBy === 'day') {
      const dailyMap = new Map<string, { revenue: number; orders: number }>();
      payments.forEach((payment) => {
        const dateKey = payment.createdAt.toISOString().split('T')[0];
        const existing = dailyMap.get(dateKey) || { revenue: 0, orders: 0 };
        dailyMap.set(dateKey, {
          revenue: existing.revenue + payment.amount,
          orders: existing.orders + 1,
        });
      });

      dailyBreakdown = Array.from(dailyMap.entries())
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          orders: data.orders,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    return {
      totalRevenue,
      totalOrders,
      averageOrderValue,
      paymentMethodBreakdown,
      dailyBreakdown,
    };
  }

  /**
   * Get top selling items report
   */
  async getTopSellingItems(limit: number = 10, startDate?: Date, endDate?: Date) {
    const whereClause: any = {
      order: {
        status: 'PAID',
      },
    };

    if (startDate && endDate) {
      whereClause.order.createdAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const orderItems = await prisma.orderItem.findMany({
      where: whereClause,
      include: {
        menuItem: true,
      },
    });

    // Aggregate by menu item
    const itemMap = new Map<
      string,
      { name: string; category: string; quantity: number; revenue: number }
    >();

    orderItems.forEach((item) => {
      const existing = itemMap.get(item.menuItemId) || {
        name: item.menuItem.name,
        category: item.menuItem.category,
        quantity: 0,
        revenue: 0,
      };

      itemMap.set(item.menuItemId, {
        name: existing.name,
        category: existing.category,
        quantity: existing.quantity + item.quantity,
        revenue: existing.revenue + item.price * item.quantity,
      });
    });

    // Sort by quantity and limit
    const topItems = Array.from(itemMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, limit);

    return topItems;
  }
}

export default new PaymentService();
