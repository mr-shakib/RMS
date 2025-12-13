import prisma from '../db/client';
import { Order, OrderItem } from '@prisma/client';
import { emitOrderCreated, emitOrderUpdated, emitOrderCancelled, emitTableUpdated } from '../websocket';
import printerService from './printerService';
import { multiPrinterService } from './multiPrinterService';

export type OrderStatus = 'PENDING' | 'PREPARING' | 'READY' | 'SERVED' | 'PAID' | 'CANCELLED';

interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  notes?: string;
}

interface CreateOrderInput {
  tableId: number;
  items: CreateOrderItemInput[];
  isBuffet?: boolean;
  buffetCategoryId?: string;
  buffetQuantity?: number;
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
    const { tableId, items, isBuffet = false, buffetCategoryId, buffetQuantity = 1, discount = 0, serviceCharge = 0, tip = 0 } = input;

    console.log('🍽️  ORDER DEBUG:', {
      tableId,
      isBuffet,
      buffetCategoryId,
      buffetQuantity,
      itemCount: items.length
    });

    // Validate table exists
    const table = await prisma.table.findUnique({ where: { id: tableId } });
    if (!table) {
      throw new Error(`Table with id ${tableId} not found`);
    }

    // Check for existing active buffet orders on this table
    const existingBuffetOrder = await prisma.order.findFirst({
      where: {
        tableId,
        isBuffet: true,
        status: {
          notIn: ['PAID', 'CANCELLED'],
        },
      },
      include: {
        items: true,
      },
    });

    // Fetch menu items and calculate subtotal
    let subtotal = 0;
    const orderItemsData: Array<{ menuItemId: string; quantity: number; price: number; notes?: string }> = [];

    if (isBuffet && buffetCategoryId) {
      // Check if buffet already exists for this table
      if (existingBuffetOrder) {
        // Buffet already charged - only charge for alwaysPriced items
        console.log(`ℹ️  Table ${tableId} already has an active buffet order. Only charging for additional priced items.`);
        
        for (const item of items) {
          const menuItem = await prisma.menuItem.findUnique({
            where: { id: item.menuItemId },
            include: { category: true },
          });

          if (!menuItem) {
            throw new Error(`Menu item with id ${item.menuItemId} not found`);
          }

          if (!menuItem.available) {
            throw new Error(`Menu item ${menuItem.name} is not available`);
          }

          // Only charge for items that are always priced (beverages, desserts)
          const itemPrice = menuItem.alwaysPriced ? menuItem.price : 0;
          const itemTotal = itemPrice * item.quantity;
          
          if (menuItem.alwaysPriced) {
            subtotal += itemTotal;
          }

          orderItemsData.push({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: itemPrice,
            notes: item.notes,
          });
        }
      } else {
        // First buffet order - charge buffet price
        const category = await prisma.category.findUnique({
          where: { id: buffetCategoryId },
        });

        if (!category) {
          throw new Error(`Category with id ${buffetCategoryId} not found`);
        }

        if (!category.isBuffet) {
          throw new Error(`Category ${category.name} is not a buffet category`);
        }

        // Charge buffet price multiplied by quantity (number of people)
        subtotal = (category.buffetPrice || 0) * buffetQuantity;
        
        console.log(`🎫 First buffet order - Buffet: ${category.name}, Price: $${category.buffetPrice}, Quantity: ${buffetQuantity}, Subtotal: $${subtotal}`);

        for (const item of items) {
          const menuItem = await prisma.menuItem.findUnique({
            where: { id: item.menuItemId },
            include: { category: true },
          });

          if (!menuItem) {
            throw new Error(`Menu item with id ${item.menuItemId} not found`);
          }

          if (!menuItem.available) {
            throw new Error(`Menu item ${menuItem.name} is not available`);
          }

          // Check if item should always be priced
          const itemPrice = menuItem.alwaysPriced ? menuItem.price : 0;
          const itemTotal = itemPrice * item.quantity;
          
          if (menuItem.alwaysPriced) {
            subtotal += itemTotal;
          }

          orderItemsData.push({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: itemPrice,
            notes: item.notes,
          });
        }
      }
    } else {
      // Regular order (non-buffet)
      // If there's an active buffet, check if regular items should be free
      if (existingBuffetOrder) {
        console.log(`ℹ️  Table ${tableId} has active buffet. Regular items may be included in buffet.`);
        
        for (const item of items) {
          const menuItem = await prisma.menuItem.findUnique({
            where: { id: item.menuItemId },
            include: { category: true },
          });

          if (!menuItem) {
            throw new Error(`Menu item with id ${item.menuItemId} not found`);
          }

          if (!menuItem.available) {
            throw new Error(`Menu item ${menuItem.name} is not available`);
          }

          // Only charge for items that are always priced (beverages, desserts, etc.)
          const itemPrice = menuItem.alwaysPriced ? menuItem.price : 0;
          const itemTotal = itemPrice * item.quantity;
          
          if (menuItem.alwaysPriced) {
            subtotal += itemTotal;
          }

          orderItemsData.push({
            menuItemId: item.menuItemId,
            quantity: item.quantity,
            price: itemPrice, // 0 for buffet items, actual price for always-priced items
            notes: item.notes,
          });
        }
      } else {
        // No active buffet - regular pricing
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
      }
    }

    // Tax removed - set to 0
    const tax = 0;

    // Calculate total
    const total = subtotal + tax - discount + serviceCharge + tip;

    // Create order with items in a transaction
    const order = await prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          tableId,
          status: 'PENDING',
          isBuffet,
          buffetCategoryId: isBuffet ? buffetCategoryId : null,
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

    // Print kitchen ticket automatically using multi-printer service
    try {
      if (items.length > 0) {
        await multiPrinterService.printOrderByCategory(order.id);
      }
    } catch (error) {
      console.error('Failed to print kitchen ticket:', error);
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

    let updatedTable = null;

    // Update order status in a transaction
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
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

      // If order is marked as PAID, check if table should be freed
      if (status === 'PAID') {
        // Check if table has any other active orders
        const activeOrders = await tx.order.findMany({
          where: {
            tableId: currentOrder.tableId,
            status: {
              notIn: ['PAID', 'CANCELLED'],
            },
          },
        });

        // If no active orders, set table to FREE
        if (activeOrders.length === 0) {
          updatedTable = await tx.table.update({
            where: { id: currentOrder.tableId },
            data: { status: 'FREE' },
          });
        }
      }

      return updated;
    });

    // Emit WebSocket events AFTER transaction commits
    try {
      emitOrderUpdated(updatedOrder);
      
      // Emit table update if table was freed
      if (updatedTable) {
        emitTableUpdated(updatedTable);
      }
    } catch (error) {
      console.error('Failed to emit WebSocket events:', error);
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
      PREPARING: ['PAID', 'CANCELLED'], // Updated: PREPARING can go directly to PAID
      READY: ['PAID', 'CANCELLED'], // Legacy support
      SERVED: ['PAID'], // Legacy support
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
