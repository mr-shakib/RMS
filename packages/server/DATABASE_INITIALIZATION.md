# Database Initialization and Seeding

This document explains how the database initialization and seeding works in the Restaurant Management System.

## Overview

The system has two mechanisms for populating the database with initial data:

1. **Manual Seeding** - Run explicitly via npm script
2. **Automatic Initialization** - Runs automatically on server startup if database is empty

## Manual Seeding

To manually seed the database with default data, run:

```bash
npm run prisma:seed
```

This will:
- Create default users (admin, waiter, chef)
- Create 10 tables (Table 1 through Table 10) with QR codes
- Create 5 categories (Appetizers, Main Course, Desserts, Beverages, Sides)
- Create 23+ menu items across all categories
- Insert default settings (business name, tax percentage, currency, server port, etc.)

### Default Credentials

After seeding, you can log in with these credentials:

- **Admin**: username: `admin`, password: `admin123`
- **Waiter**: username: `waiter`, password: `waiter123`
- **Chef**: username: `chef`, password: `chef123`

**Note**: The admin password should be changed on first login in production.

## Automatic Initialization

The server automatically checks if the database is initialized on startup. If the database is empty or missing critical data, it will automatically populate it with the same default data as the manual seed.

### How It Works

1. On server startup, the `initializationService` checks if the database has:
   - An admin user
   - At least one table
   - At least one menu item
   - At least one setting

2. If any of these are missing, the service automatically:
   - Creates default users
   - Creates default settings
   - Creates 10 tables with QR codes
   - Creates default categories
   - Creates 23+ menu items

3. If all checks pass, the server logs: `✅ Database already initialized`

### Implementation Details

The initialization logic is located in:
- `packages/server/src/services/initializationService.ts` - Main initialization service
- `packages/server/src/index.ts` - Server startup integration
- `packages/server/prisma/seed.ts` - Manual seed script

## Default Data

### Users (3)
- Admin user with full system access
- Waiter user with order and table management access
- Chef user with kitchen display access only

### Tables (10)
- Table 1 through Table 10
- Each table has a unique QR code that links to the PWA menu
- QR codes are generated as base64-encoded PNG images
- Default status: FREE

### Categories (5)
- Appetizers
- Main Course
- Desserts
- Beverages
- Sides

### Menu Items (23+)
Sample items include:
- **Appetizers**: Caesar Salad, Bruschetta, Mozzarella Sticks, Chicken Wings, Spring Rolls
- **Main Course**: Margherita Pizza, Grilled Salmon, Beef Burger, Chicken Alfredo, Ribeye Steak, Vegetable Stir Fry, Fish and Chips
- **Desserts**: Chocolate Cake, Tiramisu, Cheesecake, Ice Cream Sundae
- **Beverages**: Coca Cola, Orange Juice, Coffee, Iced Tea
- **Sides**: French Fries, Onion Rings, Garlic Bread

All menu items include:
- Name and description
- Category assignment
- Price
- Placeholder image URL
- Availability status (default: true)

### Settings (9)
- `business_name`: "My Restaurant"
- `business_address`: "123 Main Street, City, State 12345"
- `tax_percentage`: "10"
- `currency`: "USD"
- `server_port`: "5000"
- `server_url`: "http://localhost:5000"
- `theme`: "light"
- `printer_type`: "" (empty, to be configured)
- `printer_address`: "" (empty, to be configured)

## QR Code Generation

QR codes are automatically generated for each table during initialization. The QR codes:
- Link to the PWA menu with the table ID: `http://[server_url]/menu.html?table=[table_id]`
- Are stored as base64-encoded data URLs in the database
- Can be regenerated at any time via the Settings page
- Are 300x300 pixels with a 2-pixel margin

## Resetting the Database

To reset the database and start fresh:

1. Stop the server
2. Delete the database file: `rm prisma/restaurant.db`
3. Run migrations: `npm run prisma:migrate dev`
4. Run seed script: `npm run prisma:seed`
5. Start the server

Alternatively, just delete the database file and start the server - it will automatically initialize with default data.

## Production Considerations

1. **Change Default Passwords**: The default admin password (`admin123`) should be changed immediately after first login
2. **Customize Settings**: Update business name, address, tax percentage, and currency in the Settings page
3. **Add Real Menu Items**: Replace placeholder menu items with your actual menu
4. **Configure Printer**: Set up printer connection in Settings if using receipt printing
5. **Update Server URL**: If deploying on a network, update the server URL in Settings to use your LAN IP address
