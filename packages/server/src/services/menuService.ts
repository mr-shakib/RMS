import prisma from '../db/client';
import { MenuItem } from '@prisma/client';
import { emitMenuUpdated } from '../websocket';

interface CreateMenuItemInput {
  name: string;
  categoryId: string;
  price: number;
  description?: string;
  imageUrl?: string;
  available?: boolean;
}

interface UpdateMenuItemInput {
  name?: string;
  categoryId?: string;
  price?: number;
  description?: string;
  imageUrl?: string;
  available?: boolean;
}

interface MenuItemFilters {
  category?: string;
  available?: boolean;
  search?: string;
}

class MenuService {
  /**
   * Get all menu items with optional filtering
   */
  async getAllMenuItems(filters?: MenuItemFilters): Promise<MenuItem[]> {
    const where: any = {};

    if (filters?.category) {
      where.categoryId = filters.category;
    }

    if (filters?.available !== undefined) {
      where.available = filters.available;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const menuItems = await prisma.menuItem.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });

    return menuItems;
  }

  /**
   * Get only available menu items
   */
  async getAvailableMenuItems(categoryId?: string): Promise<MenuItem[]> {
    const where: any = { available: true };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const menuItems = await prisma.menuItem.findMany({
      where,
      include: {
        category: true,
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });

    return menuItems;
  }

  /**
   * Get menu item by ID
   */
  async getMenuItemById(id: string): Promise<MenuItem | null> {
    const menuItem = await prisma.menuItem.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    return menuItem;
  }

  /**
   * Create a new menu item
   */
  async createMenuItem(input: CreateMenuItemInput): Promise<MenuItem> {
    const { name, categoryId, price, description, imageUrl, available = true } = input;

    // Validate price
    if (price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    // Validate category exists
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new Error(`Category with id ${categoryId} not found`);
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        name,
        categoryId,
        price,
        description,
        imageUrl,
        available,
      },
      include: {
        category: true,
      },
    });

    // Emit WebSocket event for menu update
    try {
      emitMenuUpdated(menuItem);
    } catch (error) {
      console.error('Failed to emit menu:updated event:', error);
    }

    return menuItem;
  }

  /**
   * Update an existing menu item
   */
  async updateMenuItem(id: string, input: UpdateMenuItemInput): Promise<MenuItem> {
    // Check if menu item exists
    const existingItem = await prisma.menuItem.findUnique({ where: { id } });
    if (!existingItem) {
      throw new Error(`Menu item with id ${id} not found`);
    }

    // Validate price if provided
    if (input.price !== undefined && input.price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    // Validate category if provided
    if (input.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
      if (!category) {
        throw new Error(`Category with id ${input.categoryId} not found`);
      }
    }

    const updatedMenuItem = await prisma.menuItem.update({
      where: { id },
      data: input,
      include: {
        category: true,
      },
    });

    // Emit WebSocket event for menu update
    try {
      emitMenuUpdated(updatedMenuItem);
    } catch (error) {
      console.error('Failed to emit menu:updated event:', error);
    }

    return updatedMenuItem;
  }

  /**
   * Delete a menu item
   */
  async deleteMenuItem(id: string): Promise<void> {
    // Check if menu item exists
    const existingItem = await prisma.menuItem.findUnique({ where: { id } });
    if (!existingItem) {
      throw new Error(`Menu item with id ${id} not found`);
    }

    // Check if menu item is used in any active orders
    const activeOrderItems = await prisma.orderItem.findFirst({
      where: {
        menuItemId: id,
        order: {
          status: {
            notIn: ['PAID', 'CANCELLED'],
          },
        },
      },
    });

    if (activeOrderItems) {
      throw new Error('Cannot delete menu item that is in active orders');
    }

    await prisma.menuItem.delete({
      where: { id },
    });
  }

  /**
   * Toggle menu item availability
   */
  async toggleAvailability(id: string): Promise<MenuItem> {
    // Get current menu item
    const menuItem = await prisma.menuItem.findUnique({ where: { id } });
    if (!menuItem) {
      throw new Error(`Menu item with id ${id} not found`);
    }

    // Toggle availability
    const updatedMenuItem = await prisma.menuItem.update({
      where: { id },
      data: { available: !menuItem.available },
      include: {
        category: true,
      },
    });

    // Emit WebSocket event for menu update
    try {
      emitMenuUpdated(updatedMenuItem);
    } catch (error) {
      console.error('Failed to emit menu:updated event:', error);
    }

    return updatedMenuItem;
  }

  /**
   * Get all unique categories (deprecated - use /api/categories instead)
   */
  async getCategories(): Promise<string[]> {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return categories.map((cat) => cat.name);
  }
}

export default new MenuService();
