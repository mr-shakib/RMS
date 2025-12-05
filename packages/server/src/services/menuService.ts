import prisma from '../db/client';
import { MenuItem } from '@prisma/client';
import { emitMenuUpdated } from '../websocket';

interface CreateMenuItemInput {
  name: string;
  categoryId: string;
  secondaryCategoryId?: string;
  price: number;
  description?: string;
  imageUrl?: string;
  available?: boolean;
  itemNumber?: number;
  alwaysPriced?: boolean;
}

interface UpdateMenuItemInput {
  name?: string;
  categoryId?: string;
  secondaryCategoryId?: string;
  price?: number;
  description?: string;
  imageUrl?: string;
  available?: boolean;
  itemNumber?: number;
  alwaysPriced?: boolean;
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
        secondaryCategory: true,
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
        secondaryCategory: true,
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
        secondaryCategory: true,
      },
    });

    return menuItem;
  }

  /**
   * Create a new menu item
   */
  async createMenuItem(input: CreateMenuItemInput): Promise<MenuItem> {
    const { name, categoryId, secondaryCategoryId, price, description, imageUrl, available = true, alwaysPriced = false } = input;

    // Validate price
    if (price <= 0) {
      throw new Error('Price must be greater than 0');
    }

    // Validate category exists
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      throw new Error(`Category with id ${categoryId} not found`);
    }

    // Validate secondary category exists if provided
    if (secondaryCategoryId) {
      const secondaryCategory = await prisma.category.findUnique({ where: { id: secondaryCategoryId } });
      if (!secondaryCategory) {
        throw new Error(`Secondary category with id ${secondaryCategoryId} not found`);
      }
    }

    // Use provided item number or get the next available one
    let assignedItemNumber: number | undefined = input.itemNumber;
    
    if (!assignedItemNumber) {
      const maxItemNumber = await prisma.menuItem.findFirst({
        orderBy: { itemNumber: 'desc' },
        select: { itemNumber: true },
      });
      assignedItemNumber = (maxItemNumber?.itemNumber || 0) + 1;
    } else {
      // Check if the provided item number is already taken
      const existingItem = await prisma.menuItem.findUnique({
        where: { itemNumber: assignedItemNumber },
      });
      if (existingItem) {
        throw new Error(`Item number ${assignedItemNumber} is already assigned to "${existingItem.name}"`);
      }
    }

    const menuItem = await prisma.menuItem.create({
      data: {
        name,
        categoryId,
        secondaryCategoryId,
        price,
        description,
        imageUrl,
        available,
        itemNumber: assignedItemNumber,
        alwaysPriced,
      },
      include: {
        category: true,
        secondaryCategory: true,
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

    // Validate and check item number if provided
    if (input.itemNumber !== undefined && input.itemNumber !== existingItem.itemNumber) {
      if (input.itemNumber < 1) {
        throw new Error('Item number must be a positive number');
      }
      // Check if the new item number is already taken by another item
      const conflictingItem = await prisma.menuItem.findUnique({
        where: { itemNumber: input.itemNumber },
      });
      if (conflictingItem && conflictingItem.id !== id) {
        throw new Error(`Item number ${input.itemNumber} is already assigned to "${conflictingItem.name}"`);
      }
    }

    // Validate category if provided
    if (input.categoryId) {
      const category = await prisma.category.findUnique({ where: { id: input.categoryId } });
      if (!category) {
        throw new Error(`Category with id ${input.categoryId} not found`);
      }
    }

    // Validate secondary category if provided
    if (input.secondaryCategoryId) {
      const secondaryCategory = await prisma.category.findUnique({ where: { id: input.secondaryCategoryId } });
      if (!secondaryCategory) {
        throw new Error(`Secondary category with id ${input.secondaryCategoryId} not found`);
      }
    }

    const updatedMenuItem = await prisma.menuItem.update({
      where: { id },
      data: input,
      include: {
        category: true,
        secondaryCategory: true,
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

    await prisma.orderItem.deleteMany({ where: { menuItemId: id } });
    await prisma.menuItem.delete({ where: { id } });
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
        secondaryCategory: true,
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

  /**
   * Get all categories with full details including buffet info
   */
  async getAllCategories() {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
    });

    return categories;
  }
}

export default new MenuService();
