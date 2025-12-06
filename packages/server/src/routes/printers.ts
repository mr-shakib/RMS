import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../db/client';
import { authenticate, requireRole } from '../middleware/auth';
import { multiPrinterService } from '../services/multiPrinterService';

const router = Router();

// Apply auth middleware to all routes
router.use(authenticate);

/**
 * Get all printers with their category mappings and connection status
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const printers = await (prisma as any).printer?.findMany({
      include: {
        categoryMappings: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    }) || [];

    // Add live connection status to each printer
    const printerStatus = multiPrinterService.getStatus();
    const printersWithStatus = printers.map((printer: any) => ({
      ...printer,
      isConnected: printerStatus.get(printer.id) || false,
    }));

    res.json({
      success: true,
      data: { printers: printersWithStatus },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get printer connection status for all printers
 */
router.get('/status/all', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const statusMap = multiPrinterService.getStatus();
    const status: { [key: string]: boolean } = {};
    
    for (const [id, isConnected] of statusMap.entries()) {
      status[id] = isConnected;
    }

    res.json({
      success: true,
      data: { status },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a single printer by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const printer = await (prisma as any).printer.findUnique({
      where: { id },
      include: {
        categoryMappings: {
          include: {
            category: true,
          },
        },
      },
    });

    if (!printer) {
      return res.status(404).json({
        success: false,
        error: 'Printer not found',
      });
    }

    // Add connection status
    const printerStatus = multiPrinterService.getStatus();
    const printerWithStatus = {
      ...printer,
      isConnected: printerStatus.get(id) || false,
    };

    res.json({
      success: true,
      data: { printer: printerWithStatus },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Create a new printer
 */
router.post('/', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, type, address, port, vendorId, productId, serialPath, isActive, categoryIds } = req.body;

    // Validate required fields
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        error: 'Name and type are required',
      });
    }

    // Type-specific validation
    if (type === 'network' && !address) {
      return res.status(400).json({
        success: false,
        error: 'IP address is required for network printers',
      });
    }

    if (type === 'usb' && (!vendorId || !productId)) {
      return res.status(400).json({
        success: false,
        error: 'Vendor ID and Product ID are required for USB printers',
      });
    }

    if (type === 'serial' && !serialPath) {
      return res.status(400).json({
        success: false,
        error: 'Serial path is required for serial printers',
      });
    }

    // Get the highest sort order
    const lastPrinter = await (prisma as any).printer?.findFirst({
      orderBy: { sortOrder: 'desc' },
    });

    const sortOrder = (lastPrinter?.sortOrder || 0) + 1;

    // Create printer with category mappings
    const printer = await (prisma as any).printer.create({
      data: {
        name,
        type,
        address,
        port: port || '9100',
        vendorId,
        productId,
        serialPath,
        isActive: isActive !== undefined ? isActive : true,
        sortOrder,
        categoryMappings: categoryIds?.length
          ? {
              create: categoryIds.map((categoryId: string) => ({
                categoryId,
              })),
            }
          : undefined,
      },
      include: {
        categoryMappings: {
          include: {
            category: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: { printer },
      message: 'Printer created successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update a printer
 */
router.patch('/:id', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, type, address, port, vendorId, productId, serialPath, isActive, categoryIds } = req.body;

    // Check if printer exists
    const existingPrinter = await (prisma as any).printer?.findUnique({
      where: { id },
    });

    if (!existingPrinter) {
      return res.status(404).json({
        success: false,
        error: 'Printer not found',
      });
    }

    // Update printer
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (address !== undefined) updateData.address = address;
    if (port !== undefined) updateData.port = port;
    if (vendorId !== undefined) updateData.vendorId = vendorId;
    if (productId !== undefined) updateData.productId = productId;
    if (serialPath !== undefined) updateData.serialPath = serialPath;
    if (isActive !== undefined) updateData.isActive = isActive;

    // If categoryIds provided, update mappings
    if (categoryIds !== undefined) {
      // Delete existing mappings
      await (prisma as any).printerCategory?.deleteMany({
        where: { printerId: id },
      });

      // Create new mappings
      if (categoryIds.length > 0) {
        await (prisma as any).printerCategory?.createMany({
          data: categoryIds.map((categoryId: string) => ({
            printerId: id,
            categoryId,
          })),
        });
      }
    }

    const printer = await (prisma as any).printer.update({
      where: { id },
      data: updateData,
      include: {
        categoryMappings: {
          include: {
            category: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: { printer },
      message: 'Printer updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Delete a printer
 */
router.delete('/:id', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const printer = await (prisma as any).printer?.findUnique({
      where: { id },
    });

    if (!printer) {
      return res.status(404).json({
        success: false,
        error: 'Printer not found',
      });
    }

    await (prisma as any).printer.delete({
      where: { id },
    });

    res.json({
      success: true,
      message: 'Printer deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Test print on a specific printer
 */
router.post('/:id/test', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const printer = await (prisma as any).printer?.findUnique({
      where: { id },
    });

    if (!printer) {
      return res.status(404).json({
        success: false,
        error: 'Printer not found',
      });
    }

    if (!printer.isActive) {
      return res.status(400).json({
        success: false,
        error: 'Printer is not active',
      });
    }

    // Test print using multi-printer service
    await multiPrinterService.testPrint(id);

    res.json({
      success: true,
      message: `Test print sent to ${printer.name}`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Reorder printers
 */
router.patch('/reorder', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { printerIds } = req.body;

    if (!Array.isArray(printerIds)) {
      return res.status(400).json({
        success: false,
        error: 'printerIds must be an array',
      });
    }

    // Update sort order for each printer
    await Promise.all(
      printerIds.map((printerId: string, index: number) =>
        (prisma as any).printer.update({
          where: { id: printerId },
          data: { sortOrder: index },
        })
      )
    );

    res.json({
      success: true,
      message: 'Printer order updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
