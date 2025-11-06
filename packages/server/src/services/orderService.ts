import prisma from '../db/client';
import { Order, OrderItem } from '@prisma/client';
import { emitOrderCreated, emitOrderUpdated, emitOrderCancelled } from '../websocket';

export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'PAID' | 'CANCELLED';

interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

interface CreateOrderInput {
  tableId: number;
  items: CreateOrderItemInput[];
  discount?: number;
  serviceCharge?: number;
  tip?: number;
}

interface OrderWithItems extends Order {
  items: OrderItem[];
}

class OrderService {
  /**
   * Create a new order with automatic total calculation
   * Formula: total = subtotal + tax - discount + serviceCharge + tip
   */
  async createOrder(input: CreateOrderInput): Promise<OrderWithItems> {
    const { tableId, items, discount = 0, serviceCharge = 0, tip = 0 } = input;

    // Validate table exists
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) {
      throw new Error(`Table with id ${tableId} not found`);
    }

    // Fetch menu items and calculate subtotal
    let subtotal = 0;
    const orderItemsData: Array<{ menuItemId: string; quantity: number; price: number; notes?: string }> = [];

    for (const item of items) {
      const menuItem = await prisma.menuItem.findUnique({
        where: { id: item.menuItemId },
      });

      if (!menuItem) {
        throw new Error(`Menu item with id ${item.menuItemId} not found`);
      }

      if (!menuItem.available) {
        throw new Error(`Menu item ${menuItem.name} is not available`);
      }

      const itemTotal = menuItem.price * item.quantity;
      subtotal += itemTotal;

      orderItemsData.push({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        price: menuItem.price,
        notes: item.notes,
      });
    }

    // Get tax percentage from settings (default 10%)
    const taxSetting = await prisma.setting.findUnique({ where: { key: 'tax_percentage' } });
    const taxPercentage = taxSetting ? parseFloat(taxSetting.value) : 10;
    const tax = (subtotal * taxPercentage) / 100;

    // Calculate total
    const total = subtotal + tax - discount + serviceCharge + tip;

    // Create order with items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          tableId,
          status: 'PENDING',
          subtotal,
          tax,
          discount,
          serviceCharge,
          tip,
          total,
          items: {
            create: orderItemsData,
          },
        },
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
          table: true,
        },
      });

      // Update table status to OCCUPIED
      await tx.table.update({
        where: { id: tableId },
        data: { status: 'OCCUPIED' },
      });

      return newOrder;
    });

    // Emit WebSocket event for order creation
    try {
      emitOrderCreated(order);
    } catch (error) {
      console.error('Failed to emit order:created event:', error);
    }

    return order;
  }

  /**
   * Get order by ID with all related data
   */
  async getOrderById(id: string): Promise<OrderWithItems | null> {
    const order = await prisma.order.findUnique({
      where: { id },
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

    return order;
  }

  /**
   * Get all orders for a specific table
   */
  async getOrdersByTable(tableId: number): Promise<Order[]> {
    const orders = await prisma.order.findMany({
      where: { tableId },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders;
  }

  /**
   * Get all active orders (not PAID or CANCELLED)
   */
  async getActiveOrders(): Promise<Order[]> {
    const orders = await prisma.order.findMany({
      where: {
        status: {
          notIn: ['PAID', 'CANCELLED'],
        },
      },
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

    return orders;
  }

  /**
   * Update order status with validation for status transitions
   */
  async updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
    // Get current order
    const currentOrder = await prisma.order.findUnique({ where: { id } });
    if (!currentOrder) {
      throw new Error(`Order with id ${id} not found`);
    }

    // Validate status transition
    this.validateStatusTransition(currentOrder.status as OrderStatus, status);

    // Update order status
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
      },
    });

    // Emit WebSocket event for order update
    try {
      emitOrderUpdated(updatedOrder);
    } catch (error) {
      console.error('Failed to emit order:updated event:', error);
    }

    return updatedOrder;
  }

  /**
   * Cancel an order and update table status
   */
  async cancelOrder(id: string): Promise<Order> {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new Error(`Order with id ${id} not found`);
    }

    // Cannot cancel already paid orders
    if (order.status === 'PAID') {
      throw new Error('Cannot cancel a paid order');
    }

    // Update order status and table status in a transaction
    const cancelledOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED' },
        include: {
          items: {
            include: {
              menuItem: true,
            },
          },
          table: true,
        },
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

      return updated;
    });

    // Emit WebSocket event for order cancellation
    try {
      emitOrderCancelled(id, order.tableId);
    } catch (error) {
      console.error('Failed to emit order:cancelled event:', error);
    }

    return cancelledOrder;
  }

  /**
   * Validate status transitions
   */
  private validateStatusTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      PENDING: ['PREPARING', 'CANCELLED'],
      PREPARING: ['READY', 'CANCELLED'],
      READY: ['SERVED', 'CANCELLED'],
      SERVED: ['PAID'],
      PAID: [],
      CANCELLED: [],
    };

    const allowedTransitions = validTransitions[currentStatus];
    if (!allowedTransitions.includes(newStatus)) {
      throw new Error(
        `Invalid status transition from ${currentStatus} to ${newStatus}`
      );
    }
  }
}

export default new OrderService();
