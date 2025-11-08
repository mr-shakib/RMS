import QRCode from 'qrcode';
import PDFDocument from 'pdfkit';
import { Readable } from 'stream';
import prisma from '../db/client';

interface QRCodeOptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

interface TableQRData {
  tableId: number;
  tableName: string;
  qrCodeDataUrl: string;
}

/**
 * Generate QR code as data URL for a specific table
 */
export async function generateTableQRCode(
  tableId: number,
  serverUrl: string,
  options: QRCodeOptions = {}
): Promise<string> {
  const {
    width = 300,
    margin = 2,
    errorCorrectionLevel = 'M',
  } = options;

  // Generate table-specific URL with query parameter
  const tableUrl = `${serverUrl}/?table=${tableId}`;

  try {
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(tableUrl, {
      width,
      margin,
      errorCorrectionLevel,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrCodeDataUrl;
  } catch (error) {
    throw new Error(`Failed to generate QR code for table ${tableId}: ${error}`);
  }
}

/**
 * Generate QR code as buffer for a specific table
 */
export async function generateTableQRCodeBuffer(
  tableId: number,
  serverUrl: string,
  options: QRCodeOptions = {}
): Promise<Buffer> {
  const {
    width = 300,
    margin = 2,
    errorCorrectionLevel = 'M',
  } = options;

  // Generate table-specific URL with query parameter
  const tableUrl = `${serverUrl}/?table=${tableId}`;

  try {
    // Generate QR code as buffer
    const qrCodeBuffer = await QRCode.toBuffer(tableUrl, {
      width,
      margin,
      errorCorrectionLevel,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    return qrCodeBuffer;
  } catch (error) {
    throw new Error(`Failed to generate QR code buffer for table ${tableId}: ${error}`);
  }
}

/**
 * Generate PDF with QR code for a single table
 */
export async function generateTableQRCodePDF(
  tableId: number,
  tableName: string,
  serverUrl: string
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // Generate QR code buffer
      const qrCodeBuffer = await generateTableQRCodeBuffer(tableId, serverUrl, {
        width: 400,
        margin: 2,
      });

      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      // Collect PDF chunks
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Get business name from settings
      const businessNameSetting = await prisma.setting.findUnique({
        where: { key: 'business_name' },
      });
      const businessName = businessNameSetting?.value || 'Restaurant';

      // Add title
      doc.fontSize(24).font('Helvetica-Bold').text(businessName, { align: 'center' });
      doc.moveDown(0.5);

      // Add table name
      doc.fontSize(20).font('Helvetica').text(`Table: ${tableName}`, { align: 'center' });
      doc.moveDown(2);

      // Add QR code (centered)
      const pageWidth = doc.page.width;
      const qrSize = 300;
      const xPosition = (pageWidth - qrSize) / 2;
      doc.image(qrCodeBuffer, xPosition, doc.y, {
        width: qrSize,
        height: qrSize,
      });

      doc.moveDown(8);

      // Add instructions
      doc.fontSize(14).font('Helvetica').text('Scan to Order', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(10).text('Scan this QR code with your phone to view the menu and place your order.', {
        align: 'center',
      });

      // Add footer with URL
      doc.moveDown(2);
      doc.fontSize(8).fillColor('#666666').text(`${serverUrl}/?table=${tableId}`, {
        align: 'center',
      });

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Generate PDF with QR codes for multiple tables
 */
export async function generateBulkQRCodesPDF(
  tables: Array<{ id: number; name: string }>,
  serverUrl: string
): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    try {
      // Create PDF document
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
      });

      // Collect PDF chunks
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // Get business name from settings
      const businessNameSetting = await prisma.setting.findUnique({
        where: { key: 'business_name' },
      });
      const businessName = businessNameSetting?.value || 'Restaurant';

      // Process each table
      for (let i = 0; i < tables.length; i++) {
        const table = tables[i];

        // Add new page for each table (except first)
        if (i > 0) {
          doc.addPage();
        }

        // Generate QR code buffer for this table
        const qrCodeBuffer = await generateTableQRCodeBuffer(table.id, serverUrl, {
          width: 400,
          margin: 2,
        });

        // Add title
        doc.fontSize(24).font('Helvetica-Bold').text(businessName, { align: 'center' });
        doc.moveDown(0.5);

        // Add table name
        doc.fontSize(20).font('Helvetica').text(`Table: ${table.name}`, { align: 'center' });
        doc.moveDown(2);

        // Add QR code (centered)
        const pageWidth = doc.page.width;
        const qrSize = 300;
        const xPosition = (pageWidth - qrSize) / 2;
        doc.image(qrCodeBuffer, xPosition, doc.y, {
          width: qrSize,
          height: qrSize,
        });

        doc.moveDown(8);

        // Add instructions
        doc.fontSize(14).font('Helvetica').text('Scan to Order', { align: 'center' });
        doc.moveDown(0.5);
        doc.fontSize(10).text('Scan this QR code with your phone to view the menu and place your order.', {
          align: 'center',
        });

        // Add footer with URL
        doc.moveDown(2);
        doc.fontSize(8).fillColor('#666666').text(`${serverUrl}/?table=${table.id}`, {
          align: 'center',
        });
      }

      // Finalize PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get all tables with their QR codes
 */
export async function getAllTablesWithQRCodes(serverUrl: string): Promise<TableQRData[]> {
  const tables = await prisma.table.findMany({
    orderBy: { name: 'asc' },
  });

  const tableQRData: TableQRData[] = [];

  for (const table of tables) {
    let qrCodeDataUrl = table.qrCodeUrl;

    // If QR code doesn't exist, generate it
    if (!qrCodeDataUrl) {
      qrCodeDataUrl = await generateTableQRCode(table.id, serverUrl);
      
      // Update table with generated QR code
      await prisma.table.update({
        where: { id: table.id },
        data: { qrCodeUrl: qrCodeDataUrl },
      });
    }

    tableQRData.push({
      tableId: table.id,
      tableName: table.name,
      qrCodeDataUrl,
    });
  }

  return tableQRData;
}
