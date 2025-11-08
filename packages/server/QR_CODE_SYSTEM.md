# QR Code Generation System

## Overview

The QR code generation system provides comprehensive functionality for creating, managing, and downloading QR codes for restaurant tables. Each QR code links to a table-specific URL that customers can scan to access the ordering menu.

## Features

### 1. QR Code Generation
- **Automatic Generation**: QR codes are automatically generated when a new table is created
- **Data URL Format**: QR codes are stored as base64 data URLs in the database
- **Customizable**: QR codes can be regenerated with updated server URLs
- **High Quality**: Generated at 300x300 pixels with error correction level M

### 2. PDF Export
- **Individual Table PDFs**: Download a single table's QR code as a formatted PDF
- **Bulk PDF Export**: Download all tables' QR codes in a single PDF document
- **Professional Layout**: Each PDF includes:
  - Business name (from settings)
  - Table name
  - QR code (300x300 pixels)
  - Instructions for customers
  - Table URL for reference

### 3. API Endpoints

#### Get QR Code (JSON)
```
GET /api/tables/:id/qr
Authorization: Bearer <token>

Response:
{
  "status": "success",
  "data": {
    "qrCode": "data:image/png;base64,...",
    "tableId": 1,
    "tableName": "Table 1"
  }
}
```

#### Download Single QR Code PDF
```
GET /api/tables/:id/qr/download
Authorization: Bearer <token>

Response: PDF file (application/pdf)
Filename: table-{name}-qr.pdf
```

#### Download All QR Codes PDF
```
GET /api/tables/qr/download-all
Authorization: Bearer <token>

Response: PDF file (application/pdf)
Filename: {business-name}-all-tables-qr.pdf
```

#### Regenerate All QR Codes
```
POST /api/tables/qr/regenerate-all
Authorization: Bearer <token>

Response:
{
  "status": "success",
  "message": "QR codes regenerated for all tables"
}
```

## Usage

### From Desktop Application

#### Tables Page
1. **View QR Code**: Click the "QR Code" button on any table card
2. **Download PNG**: In the QR modal, click "Download PNG" to save as image
3. **Download PDF**: In the QR modal, click "Download PDF" to save as formatted PDF
4. **Download All**: Click "Download All QR Codes" button in the header to get all tables as PDF

#### Settings Page
1. **Regenerate All**: Click "Generate All QR Codes" to regenerate QR codes for all tables
2. **Download All**: Click "Download QR Codes" to download all QR codes as PDF

### Programmatic Usage

```typescript
import { 
  generateTableQRCode, 
  generateTableQRCodeBuffer,
  generateTableQRCodePDF,
  generateBulkQRCodesPDF 
} from './utils/qrCodeGenerator';

// Generate QR code as data URL
const qrDataUrl = await generateTableQRCode(
  tableId, 
  'http://192.168.1.100:5000',
  { width: 300, margin: 2 }
);

// Generate QR code as buffer (for image processing)
const qrBuffer = await generateTableQRCodeBuffer(
  tableId,
  'http://192.168.1.100:5000'
);

// Generate single table PDF
const pdfBuffer = await generateTableQRCodePDF(
  tableId,
  'Table 1',
  'http://192.168.1.100:5000'
);

// Generate bulk PDF for multiple tables
const tables = [
  { id: 1, name: 'Table 1' },
  { id: 2, name: 'Table 2' }
];
const bulkPdfBuffer = await generateBulkQRCodesPDF(
  tables,
  'http://192.168.1.100:5000'
);
```

## QR Code URL Format

Each QR code encodes a URL in the following format:
```
http://[SERVER_IP]:[PORT]/?table=[TABLE_ID]
```

Example:
```
http://192.168.1.100:5000/?table=5
```

When customers scan this QR code:
1. Their device opens the URL in a browser
2. The PWA loads with the table parameter
3. The menu is displayed for that specific table
4. Orders are automatically associated with the table

## Configuration

### Server URL
The server URL is stored in the settings table:
```sql
INSERT INTO Setting (key, value) VALUES ('server_url', 'http://192.168.1.100:5000');
```

To update the server URL:
1. Go to Settings > Server & QR
2. Update the server URL
3. Click "Generate All QR Codes" to regenerate with new URL

### Business Name
The business name appears on PDF exports:
```sql
INSERT INTO Setting (key, value) VALUES ('business_name', 'My Restaurant');
```

## Technical Details

### Dependencies
- `qrcode`: QR code generation library
- `pdfkit`: PDF document generation
- `@types/qrcode`: TypeScript types for qrcode
- `@types/pdfkit`: TypeScript types for pdfkit

### Storage
- QR codes are stored as base64 data URLs in the `qrCodeUrl` field of the `Table` model
- Format: `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...`
- Average size: ~2-3 KB per QR code

### PDF Generation
- Page size: A4
- Margins: 50 points
- QR code size in PDF: 300x300 points
- Font: Helvetica (built-in PDF font)
- Each table gets its own page in bulk PDFs

### Error Handling
- Invalid table IDs return 404 Not Found
- Missing server URL falls back to `http://localhost:5000`
- PDF generation errors are caught and returned as 500 Internal Server Error
- Empty table lists return validation error

## Best Practices

1. **Regenerate After Network Changes**: Always regenerate QR codes when the server IP address changes
2. **Print Quality**: Use the PDF export for printing (better quality than PNG screenshots)
3. **Laminate QR Codes**: Protect printed QR codes with lamination for durability
4. **Test Before Printing**: Scan QR codes on your device before mass printing
5. **Backup QR Codes**: Keep a digital copy of the PDF in case reprinting is needed

## Troubleshooting

### QR Code Not Scanning
- Ensure the server URL is correct and accessible from the customer's network
- Check that the QR code is not damaged or obscured
- Verify the server is running and accessible

### PDF Download Fails
- Check authentication token is valid
- Verify user has appropriate role (ADMIN or WAITER for individual, ADMIN for bulk)
- Check server logs for detailed error messages

### QR Code Shows Wrong URL
- Update server URL in Settings
- Click "Generate All QR Codes" to regenerate
- Verify the `server_url` setting in the database

## Future Enhancements

Potential improvements for the QR code system:
- Custom QR code colors and branding
- QR code analytics (scan tracking)
- Dynamic QR codes that redirect to current server IP
- QR code expiration and rotation
- Multiple QR code styles (with logo, different shapes)
