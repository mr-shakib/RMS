import { Router, Request, Response, NextFunction } from 'express';
import prisma, { upsertSetting } from '../db/client';
import { authenticate, requireRole } from '../middleware/auth';
import { ValidationError } from '../errors/AppError';
import * as fs from 'fs';
import * as path from 'path';
import multer from 'multer';

// Configure multer for logo uploads
const uploadDir = path.join(process.cwd(), 'public', 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `logo-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed'));
    }
  }
});

const router = Router();

// All settings routes require authentication and admin role
router.use(authenticate);
router.use(requireRole(['ADMIN']));

// GET /api/settings - Get all settings as key-value pairs
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const settings = await prisma.setting.findMany();

    // Convert to key-value object
    const settingsObject = settings.reduce((acc: Record<string, string>, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    res.status(200).json({
      status: 'success',
      data: {
        settings: settingsObject,
      },
    });
  } catch (error) {
    next(error);
  }
});

// PATCH /api/settings - Bulk settings update
router.patch('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { settings } = req.body;

    if (!settings || typeof settings !== 'object') {
      throw new ValidationError('Settings object is required');
    }

    // Update or create each setting
    for (const [key, value] of Object.entries(settings)) {
      await upsertSetting(key, String(value));
    }

    // Fetch updated settings
    const updatedSettings = await prisma.setting.findMany();
    const settingsObject = updatedSettings.reduce((acc: Record<string, string>, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {} as Record<string, string>);

    res.status(200).json({
      status: 'success',
      data: {
        settings: settingsObject,
      },
      message: 'Settings updated successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/settings/backup - Export database to file
router.post('/backup', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/restaurant.db';
    const backupDir = path.join(process.cwd(), 'backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFileName = `restaurant-backup-${timestamp}.db`;
    const backupPath = path.join(backupDir, backupFileName);

    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // Copy database file
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, backupPath);

      // Send file as download
      res.download(backupPath, backupFileName, (err) => {
        if (err) {
          console.error('Error downloading backup:', err);
          if (!res.headersSent) {
            res.status(500).json({
              status: 'error',
              message: 'Failed to download backup file',
            });
          }
        }
      });
    } else {
      throw new Error('Database file not found');
    }
  } catch (error) {
    next(error);
  }
});

// POST /api/settings/upload-logo - Upload business logo
router.post('/upload-logo', upload.single('logo'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      throw new ValidationError('No image file uploaded');
    }

    // Generate URL for the uploaded logo
    const logoUrl = `/uploads/${req.file.filename}`;

    // Update the BUSINESS_LOGO_URL setting
    await upsertSetting('BUSINESS_LOGO_URL', logoUrl);

    res.status(200).json({
      status: 'success',
      data: {
        logoUrl,
        filename: req.file.filename,
        size: req.file.size,
      },
      message: 'Logo uploaded successfully',
    });
  } catch (error) {
    // Clean up uploaded file if there was an error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting uploaded file:', unlinkError);
      }
    }
    next(error);
  }
});

// DELETE /api/settings/logo - Delete business logo
router.delete('/logo', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get current logo URL from settings
    const logoSetting = await prisma.setting.findUnique({
      where: { key: 'BUSINESS_LOGO_URL' },
    });

    if (logoSetting && logoSetting.value) {
      // Extract filename from URL
      const filename = logoSetting.value.replace('/uploads/', '');
      const filePath = path.join(uploadDir, filename);

      // Delete file if it exists
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Clear the setting
      await upsertSetting('BUSINESS_LOGO_URL', '');
    }

    res.status(200).json({
      status: 'success',
      message: 'Logo deleted successfully',
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/settings/restore - Restore database from file
router.post('/restore', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { backupFileName } = req.body;

    if (!backupFileName) {
      throw new ValidationError('Backup file name is required');
    }

    const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './prisma/restaurant.db';
    const backupDir = path.join(process.cwd(), 'backups');
    const backupPath = path.join(backupDir, backupFileName);

    // Validate backup file exists
    if (!fs.existsSync(backupPath)) {
      throw new ValidationError('Backup file not found');
    }

    // Create a backup of current database before restoring
    const currentBackupName = `pre-restore-${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
    const currentBackupPath = path.join(backupDir, currentBackupName);
    if (fs.existsSync(dbPath)) {
      fs.copyFileSync(dbPath, currentBackupPath);
    }

    // Restore from backup
    fs.copyFileSync(backupPath, dbPath);

    res.status(200).json({
      status: 'success',
      data: {
        restoredFrom: backupFileName,
        currentBackup: currentBackupName,
        timestamp: new Date().toISOString(),
      },
      message: 'Database restored successfully. Server restart may be required.',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
