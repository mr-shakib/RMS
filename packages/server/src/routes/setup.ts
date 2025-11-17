import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../db/client';
import { userService } from '../services';
import { generateTableQRCode } from '../utils/qrCodeGenerator';
import { ValidationError } from '../errors/AppError';
import { config } from '../config';
import os from 'os';

const router = Router();

// Helper function to get default server URL with LAN IP
function getDefaultServerUrl(): string {
  // Use LAN_IP from environment if available (set by Electron)
  const lanIp = process.env.LAN_IP;
  const port = config.port;
  
  if (lanIp && lanIp !== 'localhost') {
    return `http://${lanIp}:${port}`;
  }

  // Try to detect LAN IP from network interfaces
  const networkInterfaces = os.networkInterfaces();
  
  for (const name of Object.keys(networkInterfaces)) {
    const iface = networkInterfaces[name];
    if (!iface) continue;
    
    for (const alias of iface) {
      if (alias.family === 'IPv4' && !alias.internal) {
        return `http://${alias.address}:${port}`;
      }
    }
  }
  
  return `http://localhost:${port}`;
}

/**
 * GET /api/setup/status - Check if setup has been completed
 */
router.get('/status', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const setupCompletedSetting = await prisma.setting.findUnique({
      where: { key: 'setup_completed' },
    });

    const isSetupCompleted = setupCompletedSetting?.value === 'true';

    res.status(200).json({
      status: 'success',
      data: {
        setupCompleted: isSetupCompleted,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/setup/network-info - Get network information for setup
 */
router.get('/network-info', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const networkInterfaces = os.networkInterfaces();
    const lanIPs: string[] = [];

    // Extract LAN IP addresses
    Object.values(networkInterfaces).forEach((interfaces) => {
      interfaces?.forEach((iface) => {
        // Skip internal and non-IPv4 addresses
        if (!iface.internal && iface.family === 'IPv4') {
          lanIPs.push(iface.address);
        }
      });
    });

    const serverPort = process.env.PORT || '5000';

    res.status(200).json({
      status: 'success',
      data: {
        lanIPs,
        port: serverPort,
        urls: lanIPs.map((ip) => `http://${ip}:${serverPort}`),
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/setup/complete - Complete the setup wizard
 */
router.post('/complete', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      businessName,
      businessAddress,
      taxPercentage,
      currency,
      adminUsername,
      adminPassword,
      numberOfTables,
      tableNamingConvention,
      printerType,
      printerAddress,
      skipSetup,
    } = req.body;

    // If skipping setup, use defaults
    if (skipSetup) {
      await prisma.setting.upsert({
        where: { key: 'setup_completed' },
        update: { value: 'true' },
        create: { key: 'setup_completed', value: 'true' },
      });

      return res.status(200).json({
        status: 'success',
        message: 'Setup skipped, using default values',
      });
    }

    // Validate required fields
    if (!businessName || !adminUsername || !adminPassword) {
      throw new ValidationError('Business name, admin username, and admin password are required');
    }

    if (adminPassword.length < 6) {
      throw new ValidationError('Admin password must be at least 6 characters long');
    }

    // 1. Update business settings
    const businessSettings = [
      { key: 'business_name', value: businessName },
      { key: 'business_address', value: businessAddress || '' },
      { key: 'tax_percentage', value: String(taxPercentage || 10) },
      { key: 'currency', value: currency || 'USD' },
      { key: 'printer_type', value: printerType || '' },
      { key: 'printer_address', value: printerAddress || '' },
    ];

    for (const setting of businessSettings) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting,
      });
    }

    // 2. Create or update admin user (outside transaction due to bcrypt)
    const existingUserWithTargetUsername = await prisma.user.findUnique({
      where: { username: adminUsername },
    });

    if (existingUserWithTargetUsername) {
      // Update the existing user with the target username
      await userService.updateUser(existingUserWithTargetUsername.id, {
        password: adminPassword,
        role: 'ADMIN',
      });
    } else {
      // Check if there's a default 'admin' user to update
      const existingAdmin = await prisma.user.findUnique({
        where: { username: 'admin' },
      });

      if (existingAdmin) {
        // Update existing admin user with new username
        await userService.updateUser(existingAdmin.id, {
          username: adminUsername,
          password: adminPassword,
          role: 'ADMIN',
        });
      } else {
        // Create new admin user
        await userService.createUser({
          username: adminUsername,
          password: adminPassword,
          role: 'ADMIN',
        });
      }
    }

    // 3. Create tables if specified (without QR codes)
    const tablesToCreate: Array<{ id: number; name: string }> = [];
    
    if (numberOfTables && numberOfTables > 0) {
      for (let i = 1; i <= numberOfTables; i++) {
        let tableName: string;

        // Apply naming convention
        if (tableNamingConvention === 'numbered') {
          tableName = `Table ${i}`;
        } else if (tableNamingConvention === 'lettered') {
          tableName = `Table ${String.fromCharCode(64 + i)}`; // A, B, C, etc.
        } else {
          tableName = `Table ${i}`;
        }

        // Check if table already exists
        const existingTable = await prisma.table.findUnique({ where: { name: tableName } });

        if (!existingTable) {
          // Create table without QR code
          const table = await prisma.table.create({
            data: {
              name: tableName,
              qrCodeUrl: '', // Will be generated after
              status: 'FREE',
            },
          });

          tablesToCreate.push({ id: table.id, name: table.name });
        }
      }
    }

    // 4. Mark setup as completed
    await prisma.setting.upsert({
      where: { key: 'setup_completed' },
      update: { value: 'true' },
      create: { key: 'setup_completed', value: 'true' },
    });

    // Generate QR codes for newly created tables (outside transaction)
    if (tablesToCreate.length > 0) {
      // Always use actual LAN IP for QR codes, never localhost
      const serverUrl = getDefaultServerUrl();
      
      // Update server_url setting to match the LAN IP
      await prisma.setting.upsert({
        where: { key: 'server_url' },
        update: { value: serverUrl },
        create: { key: 'server_url', value: serverUrl },
      });

      for (const table of tablesToCreate) {
        const qrCodeUrl = await generateTableQRCode(table.id, serverUrl, {
          width: 300,
          margin: 2,
        });

        await prisma.table.update({
          where: { id: table.id },
          data: { qrCodeUrl },
        });
      }
    }

    res.status(200).json({
      status: 'success',
      message: 'Setup completed successfully',
    });
  } catch (error) {
    next(error);
  }
});

export default router;
