import { Router, Request, Response, NextFunction } from 'express';
import { menuService } from '../services';
import { authenticate, requireRole } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../errors/AppError';

const router = Router();

// All menu routes require authentication
router.use(authenticate);

// GET /api/menu - Get all menu items with filtering
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, available, search } = req.query;

    const filters: any = {};
    if (category) filters.category = category as string;
    if (available !== undefined) filters.available = available === 'true';
    if (search) filters.search = search as string;

    const menuItems = await menuService.getAllMenuItems(filters);

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

// GET /api/menu/categories - Get all unique categories
router.get('/categories', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const categories = await menuService.getCategories();

    res.status(200).json({
      status: 'success',
      data: {
        categories,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/menu/:id - Get menu item details
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const menuItem = await menuService.getMenuItemById(id);
    if (!menuItem) {
      throw new NotFoundError('Menu item');
    }

    res.status(200).json({
      status: 'success',
      data: {
        menuItem,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/menu - Create new menu item
router.post('/', requireRole(['ADMIN', 'WAITER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, categoryId, price, description, imageUrl, available } = req.body;

    // Validate required fields
    if (!name || !categoryId || price === undefined) {
      throw new ValidationError('Name, categoryId, and price are required');
    }

    if (typeof price !== 'number' || price <= 0) {
      throw new ValidationError('Price must be a positive number');
    }

    const menuItem = await menuService.createMenuItem({
      name: name.trim(),
      categoryId: categoryId.trim(),
      price,
      description: description?.trim(),
      imageUrl: imageUrl?.trim(),
      available: available !== undefined ? available : true,
    });

    res.status(201).json({
      status: 'success',
      data: {
        menuItem,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/menu/:id - Update menu item
router.patch('/:id', requireRole(['ADMIN', 'WAITER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, categoryId, price, description, imageUrl, available } = req.body;

    // Validate price if provided
    if (price !== undefined && (typeof price !== 'number' || price <= 0)) {
      throw new ValidationError('Price must be a positive number');
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (categoryId !== undefined) updateData.categoryId = categoryId.trim();
    if (price !== undefined) updateData.price = price;
    if (description !== undefined) updateData.description = description?.trim();
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl?.trim();
    if (available !== undefined) updateData.available = available;

    if (Object.keys(updateData).length === 0) {
      throw new ValidationError('At least one field must be provided for update');
    }

    const menuItem = await menuService.updateMenuItem(id, updateData);

    // TODO: Broadcast menu:updated event via WebSocket

    res.status(200).json({
      status: 'success',
      data: {
        menuItem,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/menu/:id - Delete menu item
router.delete('/:id', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    await menuService.deleteMenuItem(id);

    res.status(200).json({
      status: 'success',
      message: 'Menu item deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/menu/:id/availability - Toggle availability
router.patch('/:id/availability', requireRole(['ADMIN', 'WAITER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const menuItem = await menuService.toggleAvailability(id);

    // TODO: Broadcast menu:updated event via WebSocket

    res.status(200).json({
      status: 'success',
      data: {
        menuItem,
      },
      message: `Menu item availability set to ${menuItem.available ? 'available' : 'unavailable'}`,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
