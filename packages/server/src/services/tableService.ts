import prisma from '../db/client';
import { Table } from '@prisma/client';
import { emitTableUpdated } from '../websocket';
import { generateTableQRCode } from '../utils/qrCodeGenerator';
import { config } from '../config';
import os from 'os';

export type TableStatus = 'FREE' | 'OCCUPIED' | 'RESERVED';

interface CreateTableInput {
  name: string;
}

interface UpdateTableInput {
  name?: string;
  status?: TableStatus;
}

class TableService {
  /**
   * Get default server URL with LAN IP
   */
  private async getDefaultServerUrl(): Promise<string> {
    // First, check if server_url is saved in settings
    try {
      const serverUrlSetting = await prisma.setting.findUnique({
        where: { key: 'server_url' },
      });
      
      if (serverUrlSetting && serverUrlSetting.value && !serverUrlSetting.value.includes('localhost')) {
        return serverUrlSetting.value;
      }
    } catch (error) {
      console.warn('Could not fetch server_url from settings:', error);
    }

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
    
    // Fallback to localhost with correct port
    return `http://localhost:${port}`;
  }

  /**
   * Get all tables
   */
  async getAllTables(): Promise<Table[]> {
    const tables = await prisma.table.findMany({
      orderBy: { name: 'asc' },
    });

    return tables;
  }

  /**
   * Get table by ID
   */
  async getTableById(id: number): Promise<Table | null> {
    const table = await prisma.table.findUnique({
      where: { id },
      include: {
        orders: {
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
          },
        },
      },
    });

    return table;
  }

  /**
   * Create a new table with QR code generation
   */
  async createTable(input: CreateTableInput): Promise<Table> {
    const { name } = input;

    // Check if table name already exists
    const existingTable = await prisma.table.findUnique({ where: { name } });
    if (existingTable) {
      throw new Error(`Table with name ${name} already exists`);
    }

    // Create table first to get the ID
    const table = await prisma.table.create({
      data: {
        name,
        qrCodeUrl: '', // Temporary empty value
        status: 'FREE',
      },
    });

    // Generate QR code with table ID
    const qrCodeUrl = await this.generateQRCode(table.id);

    // Update table with QR code URL
    const updatedTable = await prisma.table.update({
      where: { id: table.id },
      data: { qrCodeUrl },
    });

    // Emit WebSocket event for table update
    try {
      emitTableUpdated(updatedTable);
    } catch (error) {
      console.error('Failed to emit table:updated event:', error);
    }

    return updatedTable;
  }

  /**
   * Update table information
   */
  async updateTable(id: number, input: UpdateTableInput): Promise<Table> {
    // Check if table exists
    const existingTable = await prisma.table.findUnique({ where: { id } });
    if (!existingTable) {
      throw new Error(`Table with id ${id} not found`);
    }

    // If name is being updated, check for duplicates
    if (input.name && input.name !== existingTable.name) {
      const duplicateTable = await prisma.table.findUnique({ where: { name: input.name } });
      if (duplicateTable) {
        throw new Error(`Table with name ${input.name} already exists`);
      }
    }

    const updatedTable = await prisma.table.update({
      where: { id },
      data: input,
    });

    // Emit WebSocket event for table update
    try {
      emitTableUpdated(updatedTable);
    } catch (error) {
      console.error('Failed to emit table:updated event:', error);
    }

    return updatedTable;
  }

  /**
   * Delete a table
   */
  async deleteTable(id: number): Promise<void> {
    // Check if table exists
    const existingTable = await prisma.table.findUnique({ where: { id } });
    if (!existingTable) {
      throw new Error(`Table with id ${id} not found`);
    }

    // Check if table has any orders
    const orders = await prisma.order.findFirst({
      where: { tableId: id },
    });

    if (orders) {
      throw new Error('Cannot delete table that has orders');
    }

    await prisma.table.delete({
      where: { id },
    });
  }

  /**
   * Update table status
   */
  async updateTableStatus(id: number, status: TableStatus): Promise<Table> {
    // Check if table exists
    const existingTable = await prisma.table.findUnique({ where: { id } });
    if (!existingTable) {
      throw new Error(`Table with id ${id} not found`);
    }

    const updatedTable = await prisma.table.update({
      where: { id },
      data: { status },
    });

    // Emit WebSocket event for table status update
    try {
      emitTableUpdated(updatedTable);
    } catch (error) {
      console.error('Failed to emit table:updated event:', error);
    }

    return updatedTable;
  }

  /**
   * Generate QR code for a table
   * Returns base64 data URL
   */
  async generateQRCode(tableId: number): Promise<string> {
    // Always use actual LAN IP for QR codes, never localhost
    const serverUrl = await this.getDefaultServerUrl();

    try {
      // Use the utility function to generate QR code
      const qrCodeDataUrl = await generateTableQRCode(tableId, serverUrl, {
        width: 300,
        margin: 2,
      });

      return qrCodeDataUrl;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error}`);
    }
  }

  /**
   * Regenerate QR code for a table
   */
  async regenerateQRCode(tableId: number): Promise<Table> {
    // Check if table exists
    const existingTable = await prisma.table.findUnique({ where: { id: tableId } });
    if (!existingTable) {
      throw new Error(`Table with id ${tableId} not found`);
    }

    // Generate new QR code
    const qrCodeUrl = await this.generateQRCode(tableId);

    // Update table with new QR code
    const updatedTable = await prisma.table.update({
      where: { id: tableId },
      data: { qrCodeUrl },
    });

    return updatedTable;
  }

  /**
   * Regenerate QR codes for all tables
   */
  async regenerateAllQRCodes(): Promise<void> {
    const tables = await prisma.table.findMany();

    for (const table of tables) {
      const qrCodeUrl = await this.generateQRCode(table.id);
      await prisma.table.update({
        where: { id: table.id },
        data: { qrCodeUrl },
      });
    }
  }
}

export default new TableService();
