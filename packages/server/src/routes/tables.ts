import { Router, Request, Response, NextFunction } from 'express';
import { tableService } from '../services';
import { authenticate, requireRole } from '../middleware/auth';
import { ValidationError, NotFoundError } from '../errors/AppError';
import { emitTableUpdated } from '../websocket';
import { generateTableQRCodePDF, generateBulkQRCodesPDF } from '../utils/qrCodeGenerator';
import prisma from '../db/client';
import os from 'os';

const router = Router();

// Helper function to get default server URL with LAN IP
function getDefaultServerUrl(): string {
  const networkInterfaces = os.networkInterfaces();
  
  for (const name of Object.keys(networkInterfaces)) {
    const iface = networkInterfaces[name];
    if (!iface) continue;
    
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return `http://${alias.address}:5000`;
      }
    }
  }
  
  return 'http://localhost:5000';
}

// Public endpoint - Get table by ID (for PWA to display table name)
// Must be BEFORE authentication middleware
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

// All other table routes require authentication
router.use(authenticate);

// GET /api/tables/qr/download-all - Download all QR codes as a single PDF (must be before /:id routes)
router.get('/qr/download-all', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get all tables
    const tables = await tableService.getAllTables();

    if (tables.length === 0) {
      throw new ValidationError('No tables found to generate QR codes');
    }

    // Always use actual LAN IP for QR codes
    const serverUrl = getDefaultServerUrl();

    // Prepare table data for PDF generation
    const tableData = tables.map(table => ({
      id: table.id,
      name: table.name,
    }));

    // Generate bulk PDF with all QR codes
    const pdfBuffer = await generateBulkQRCodesPDF(tableData, serverUrl);

    // Get business name for filename
    const businessNameSetting = await prisma.setting.findUnique({ where: { key: 'business_name' } });
    const businessName = businessNameSetting?.value || 'restaurant';
    const sanitizedName = businessName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${sanitizedName}-all-tables-qr.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

// POST /api/tables/qr/regenerate-all - Regenerate QR codes for all tables (must be before /:id routes)
router.post('/qr/regenerate-all', requireRole(['ADMIN']), async (req: Request, res: Response, next: NextFunction) => {
  try {
    await tableService.regenerateAllQRCodes();

    res.status(200).json({
      status: 'success',
      message: 'QR codes regenerated for all tables',
    });
  } catch (error) {
    next(error);
  }
});

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

// GET /api/tables/:id/qr/download - Download QR code as PDF for a single table
router.get('/:id/qr/download', requireRole(['ADMIN', 'WAITER']), async (req: Request, res: Response, next: NextFunction) => {
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

    // Always use actual LAN IP for QR codes
    const serverUrl = getDefaultServerUrl();

    // Generate PDF with QR code
    const pdfBuffer = await generateTableQRCodePDF(tableId, table.name, serverUrl);

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="table-${table.name}-qr.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (error) {
    next(error);
  }
});

export default router;
