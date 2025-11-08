import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, requireRole } from '../middleware/auth';
import { Role } from '@rms/shared';
import type { CreateCategoryDTO } from '@rms/shared';

const router = Router();
const prisma = new PrismaClient();

// GET /api/categories - Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { menuItems: true },
        },
      },
    });

    res.json({
      status: 'success',
      data: { categories },
    });
  } catch (error: any) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to fetch categories',
    });
  }
});

// POST /api/categories - Create a new category (Admin only)
router.post('/', authenticate, requireRole([Role.ADMIN]), async (req, res) => {
  try {
    const { name, isBuffet, buffetPrice, sortOrder }: CreateCategoryDTO = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        status: 'error',
        message: 'Category name is required',
      });
    }

    // Validate buffet price if buffet category
    if (isBuffet && buffetPrice !== undefined && buffetPrice < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Buffet price must be a positive number',
      });
    }

    // Check if category already exists
    const existing = await prisma.category.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return res.status(409).json({
        status: 'error',
        message: 'Category with this name already exists',
      });
    }

    // Get the highest sort order if not provided
    let finalSortOrder = sortOrder ?? 0;
    if (sortOrder === undefined) {
      const maxCategory = await prisma.category.findFirst({
        orderBy: { sortOrder: 'desc' },
      });
      finalSortOrder = (maxCategory?.sortOrder ?? -1) + 1;
    }

    const category = await prisma.category.create({
      data: {
        name: name.trim(),
        isBuffet: isBuffet ?? false,
        buffetPrice: isBuffet ? buffetPrice : null,
        sortOrder: finalSortOrder,
      },
    });

    res.status(201).json({
      status: 'success',
      data: { category },
    });
  } catch (error: any) {
    console.error('Error creating category:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to create category',
    });
  }
});

// PATCH /api/categories/:id - Update a category (Admin only)
router.patch('/:id', authenticate, requireRole([Role.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, isBuffet, buffetPrice, sortOrder } = req.body;

    // Check if category exists
    const existing = await prisma.category.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found',
      });
    }

    // Validate buffet price if provided
    if (buffetPrice !== undefined && buffetPrice < 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Buffet price must be a positive number',
      });
    }

    // If name is being changed, check for duplicates
    if (name && name !== existing.name) {
      const duplicate = await prisma.category.findUnique({
        where: { name: name.trim() },
      });

      if (duplicate) {
        return res.status(409).json({
          status: 'error',
          message: 'Category with this name already exists',
        });
      }
    }

    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(isBuffet !== undefined && { isBuffet }),
        ...(buffetPrice !== undefined && { buffetPrice: isBuffet !== false ? buffetPrice : null }),
        ...(sortOrder !== undefined && { sortOrder }),
      },
    });

    res.json({
      status: 'success',
      data: { category },
    });
  } catch (error: any) {
    console.error('Error updating category:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to update category',
    });
  }
});

// DELETE /api/categories/:id - Delete a category (Admin only)
router.delete('/:id', authenticate, requireRole([Role.ADMIN]), async (req, res) => {
  try {
    const { id } = req.params;

    // Check if category exists
    const existing = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { menuItems: true },
        },
      },
    });

    if (!existing) {
      return res.status(404).json({
        status: 'error',
        message: 'Category not found',
      });
    }

    // Prevent deletion if category has menu items
    if (existing._count.menuItems > 0) {
      return res.status(400).json({
        status: 'error',
        message: `Cannot delete category with ${existing._count.menuItems} menu items. Please reassign or delete the items first.`,
      });
    }

    await prisma.category.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting category:', error);
    res.status(500).json({
      status: 'error',
      message: 'Failed to delete category',
    });
  }
});

export default router;
