import { Router, Request, Response, NextFunction } from 'express';
import { tableService } from '../services';
import { authenticate, requireRole } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../errors/AppError';
import { emitTableUpdated } from '../websocket';

const router = Router();

// All table routes require authentication
router.use(authenticate);

// GET /api/tables - Get all tables with current status
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tables = await tableService.getAllTables();

    res.status(200).json({
      status: 'success',
      data: {
        tables,
        count: tables.length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tables/:id - Get table by ID
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tableId = parseInt(id, 10);

    if (isNaN(tableId)) {
      throw new ValidationError('Invalid table ID');
    }

    const table = await tableService.getTableById(tableId);
    if (!table) {
      throw new NotFoundError('Table');
    }

    res.status(200).json({
      status: 'success',
      data: {
        table,
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/tables - Create new table with QR generation
router.post('/', requireRole(['ADMIN', 'WAITER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      throw new ValidationError('Table name is required');
    }

    const table = await tableService.createTable({ name: name.trim() });

    // Broadcast table:updated event via WebSocket
    emitTableUpdated(table);

    res.status(201).json({
      status: 'success',
      data: {
        table,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/tables/:id - Update table name and status
router.patch('/:id', requireRole(['ADMIN', 'WAITER']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tableId = parseInt(id, 10);

    if (isNaN(tableId)) {
      throw new ValidationError('Invalid table ID');
    }

    const { name, status } = req.body;

    if (!name && !status) {
      throw new ValidationError('At least one field (name or status) is required');
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['FREE', 'OCCUPIED', 'RESERVED'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
      }
    }

    const updateData: { name?: string; status?: 'FREE' | 'OCCUPIED' | 'RESERVED' } = {};
    if (name) updateData.name = name.trim();
    if (status) updateData.status = status as 'FREE' | 'OCCUPIED' | 'RESERVED';

    const table = await tableService.updateTable(tableId, updateData);

    // Broadcast table:updated event via WebSocket
    emitTableUpdated(table);

    res.status(200).json({
      status: 'success',
      data: {
        table,
      },
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/tables/:id - Delete table with validation
router.delete('/:id', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tableId = parseInt(id, 10);

    if (isNaN(tableId)) {
      throw new ValidationError('Invalid table ID');
    }

    await tableService.deleteTable(tableId);

    res.status(200).json({
      status: 'success',
      message: 'Table deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/tables/:id/qr - Generate and return QR code image
router.get('/:id/qr', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const tableId = parseInt(id, 10);

    if (isNaN(tableId)) {
      throw new ValidationError('Invalid table ID');
    }

    const table = await tableService.getTableById(tableId);
    if (!table) {
      throw new NotFoundError('Table');
    }

    // If QR code doesn't exist, regenerate it
    let qrCodeUrl = table.qrCodeUrl;
    if (!qrCodeUrl) {
      const updatedTable = await tableService.regenerateQRCode(tableId);
      qrCodeUrl = updatedTable.qrCodeUrl;
    }

    res.status(200).json({
      status: 'success',
      data: {
        qrCode: qrCodeUrl,
        tableId: table.id,
        tableName: table.name,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
