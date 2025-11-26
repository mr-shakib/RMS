# Multi-Printer System Migration Guide

This guide will help you migrate your database to support the new multi-printer system.

## Overview

The multi-printer system allows you to:
- Add multiple printers with different configurations
- Assign menu categories to specific printers
- Automatically route order items to the appropriate printer based on category
- Print desserts on one printer, drinks on another, main courses on a third, etc.

## Database Changes

### New Tables

1. **Printer** - Stores printer configurations
   - `id`: Unique printer ID
   - `name`: User-friendly name (e.g., "Kitchen Printer", "Bar Printer")
   - `type`: Printer type (network, usb, serial)
   - `address`: IP address for network printers
   - `port`: Port for network printers
   - `vendorId`: Vendor ID for USB printers
   - `productId`: Product ID for USB printers
   - `serialPath`: Path for serial printers
   - `isActive`: Whether printer is active
   - `sortOrder`: Display order

2. **PrinterCategory** - Maps printers to categories
   - `id`: Unique mapping ID
   - `printerId`: Reference to Printer
   - `categoryId`: Reference to Category

### Updated Tables

- **Category** - Added `printerMappings` relation

## Migration Steps

### Step 1: Run Prisma Migration

```powershell
cd packages/server
npx prisma migrate dev --name add-multi-printer-support
```

This will:
- Create the `Printer` and `PrinterCategory` tables
- Update the Prisma client

### Step 2: Generate Prisma Client

```powershell
npx prisma generate
```

### Step 3: Restart the Server

The server will automatically initialize the multi-printer service on startup.

## Usage

### 1. Configure Printers

1. Open the desktop app
2. Go to **Settings** → **Printer** tab
3. Click **Add Printer**
4. Fill in printer details:
   - **Name**: e.g., "Kitchen Printer", "Bar Printer", "Dessert Printer"
   - **Type**: Network, USB, or Serial
   - **Connection details**: IP address, vendor/product IDs, etc.
   - **Categories**: Select which menu categories should print on this printer

### 2. Assign Categories

When adding or editing a printer, you can assign categories:
- Check the categories that should print on this printer
- One category can be assigned to multiple printers
- If a category has no printer assigned, items won't print (warning will be logged)

### 3. Test Printing

After adding a printer:
1. Click the **Test Print** button
2. Verify the printer receives the test receipt

### 4. Automatic Order Printing

When an order is created:
- Items are automatically grouped by category
- Each group prints on its assigned printer(s)
- If a category has multiple printers, it prints on all of them

Example:
```
Order contains:
- Burger (Main Course) → Prints on Kitchen Printer
- Fries (Main Course) → Prints on Kitchen Printer
- Coke (Drinks) → Prints on Bar Printer
- Ice Cream (Desserts) → Prints on Dessert Printer
```

### 5. Customer Receipts

Customer receipts (when payment is processed) print on the first available active printer with all order items.

## API Endpoints

### Printer Management

- `GET /api/printers` - Get all printers
- `GET /api/printers/:id` - Get specific printer
- `POST /api/printers` - Create new printer
- `PATCH /api/printers/:id` - Update printer
- `DELETE /api/printers/:id` - Delete printer
- `POST /api/printers/:id/test` - Test print on specific printer

### Example: Create Printer

```bash
POST /api/printers
{
  "name": "Kitchen Printer",
  "type": "network",
  "address": "192.168.1.100",
  "port": "9100",
  "isActive": true,
  "categoryIds": ["category-id-1", "category-id-2"]
}
```

## Troubleshooting

### Printer Not Printing

1. Check printer is powered on
2. Verify network connection (for network printers)
3. Check printer status in Settings
4. Click **Test Print** to verify connection
5. Check server logs for errors

### Category Not Printing

1. Go to Settings → Printer
2. Click **Configure** on the printer
3. Verify the category is checked
4. Save changes

### Multiple Printers for Same Category

This is supported! The order will print on all assigned printers. Useful for:
- Backup printers
- Kitchen display + prep station
- Multiple bar stations

## Migration from Single Printer

If you were using the old single-printer system:

1. Your old printer settings are still stored in the `Setting` table
2. Add your printer using the new system in Settings → Printer
3. Assign all categories to this printer
4. The old settings won't interfere with the new system

## Benefits

✅ **Organized Kitchen**: Different stations get only their relevant orders
✅ **Faster Service**: Parallel printing to multiple printers
✅ **Flexible Setup**: Easy to add/remove printers
✅ **Category-Based**: Automatically routes based on item category
✅ **No Code Changes**: All configuration through UI

## Example Setup

### Restaurant with 3 Stations

**Kitchen Printer** (192.168.1.100)
- Main Course
- Appetizers
- Sides

**Bar Printer** (192.168.1.101)
- Drinks
- Cocktails
- Beverages

**Dessert Station** (192.168.1.102)
- Desserts
- Ice Cream
- Pastries

When customer orders:
- 1x Burger + 1x Fries → Kitchen Printer
- 2x Coke → Bar Printer  
- 1x Cheesecake → Dessert Printer

All print simultaneously! 🎉
