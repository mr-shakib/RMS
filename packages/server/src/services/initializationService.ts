import prisma, { upsertSetting } from '../db/client';
import bcrypt from 'bcrypt';
import { generateTableQRCode } from '../utils/qrCodeGenerator';
import { config } from '../config';
import os from 'os';

/**
 * Service to check and initialize database on server startup
 */
class InitializationService {
  /**
   * Get default server URL with LAN IP
   */
  private getDefaultServerUrl(): string {
    // Use LAN_IP from environment if available (set by Electron)
    const lanIp = process.env.LAN_IP;
    const port = config.port;
    
    if (lanIp && lanIp !== 'localhost') {
      console.log(`🌐 Using LAN IP from environment: ${lanIp}:${port}`);
      return `http://${lanIp}:${port}`;
    }

    // Try to detect LAN IP from network interfaces
    const networkInterfaces = os.networkInterfaces();
    
    for (const name of Object.keys(networkInterfaces)) {
      const iface = networkInterfaces[name];
      if (!iface) continue;
      
      for (const alias of iface) {
        if (alias.family === 'IPv4' && !alias.internal) {
          console.log(`🌐 Detected LAN IP from network: ${alias.address}:${port}`);
          return `http://${alias.address}:${port}`;
        }
      }
    }
    
    console.warn(`⚠️  Could not detect LAN IP, falling back to localhost:${port}`);
    return `http://localhost:${port}`;
  }

  /**
   * Check if database has been initialized with seed data
   */
  async isDatabaseInitialized(): Promise<boolean> {
    try {
      // First check if tables exist by trying to query them
      await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='User' LIMIT 1`;
      
      // Check if admin user exists
      const adminUser = await prisma.user.findUnique({
        where: { username: 'admin' },
      });

      // Check if any tables exist
      const tableCount = await prisma.table.count();

      // Check if any menu items exist
      const menuItemCount = await prisma.menuItem.count();

      // Check if settings exist
      const settingsCount = await prisma.setting.count();

      // Database is considered initialized if all these exist
      return !!(adminUser && tableCount > 0 && menuItemCount > 0 && settingsCount > 0);
    } catch (error: any) {
      // If we get a "table does not exist" error, the database needs to be created
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        return false;
      }
      console.error('Error checking database initialization:', error);
      return false;
    }
  }

  /**
   * Initialize database with default data if not already initialized
   */
  async initializeDatabase(): Promise<void> {
    try {
      console.log('🔍 Checking database initialization status...');
      const isInitialized = await this.isDatabaseInitialized();

      if (isInitialized) {
        console.log('✅ Database already initialized');
        
        // Check if Printer tables exist (for databases created before multi-printer feature)
        await this.ensurePrinterTablesExist();
        return;
      }

      console.log('🔧 Database not initialized, creating schema and seeding data...');

      // First, create the database schema if it doesn't exist
      await this.createDatabaseSchema();

      // Create default admin user
      await this.createDefaultUsers();

      // Create default settings
      await this.createDefaultSettings();

      // Create default tables with QR codes
      await this.createDefaultTables();

      console.log('✅ Database initialization completed successfully');
    } catch (error: any) {
      console.error('❌ Error initializing database:', {
        message: error.message,
        code: error.code,
        stack: error.stack?.split('\n').slice(0, 5).join('\n')
      });
      // Don't throw - allow server to start even if initialization fails
      // User can run migrations manually or reinitialize through UI
      console.warn('⚠️  Server will start without initialized database');
    }
  }

  /**
   * Ensure Printer tables exist (for databases created before multi-printer feature)
   */
  private async ensurePrinterTablesExist(): Promise<void> {
    try {
      // Try to query Printer table
      await prisma.$queryRaw`SELECT COUNT(*) FROM Printer LIMIT 1`;
    } catch (error: any) {
      // If table doesn't exist, create it
      if (error.code === 'P2021' || error.message?.includes('does not exist')) {
        console.log('  🔧 Printer tables not found, creating them...');
        
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Printer" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "name" TEXT NOT NULL,
            "type" TEXT NOT NULL,
            "address" TEXT,
            "port" TEXT,
            "vendorId" TEXT,
            "productId" TEXT,
            "serialPath" TEXT,
            "isActive" BOOLEAN NOT NULL DEFAULT 1,
            "sortOrder" INTEGER NOT NULL DEFAULT 0,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME NOT NULL
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "PrinterCategory" (
            "id" TEXT NOT NULL PRIMARY KEY,
            "printerId" TEXT NOT NULL,
            "categoryId" TEXT NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
            FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE UNIQUE INDEX IF NOT EXISTS "PrinterCategory_printerId_categoryId_key" 
          ON "PrinterCategory"("printerId", "categoryId");
        `);

        console.log('  ✅ Printer tables created successfully');
      }
    }
  }

  /**
   * Create database schema using raw SQL
   */
  private async createDatabaseSchema(): Promise<void> {
    console.log('  📋 Creating database schema...');
    
    try {
      // Log database configuration
      const databaseUrl = process.env.DATABASE_URL || 'file:./prisma/dev.db';
      console.log(`  🗄️  Database URL: ${databaseUrl}`);
      
      // Test connection first
      await prisma.$connect();
      console.log('  ✓ Database connection established');

      // Verify we can execute queries
      await prisma.$queryRaw`SELECT 1 as test`;
      console.log('  ✓ Database is responsive');

      // Create all tables using raw SQL based on Prisma schema
      console.log('  📝 Creating tables...');
      
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "username" TEXT NOT NULL UNIQUE,
          "password" TEXT NOT NULL,
          "role" TEXT NOT NULL DEFAULT 'WAITER',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);
      console.log('  ✓ Created User table');

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Table" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "name" TEXT NOT NULL UNIQUE,
          "qrCodeUrl" TEXT NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'FREE',
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);
      console.log('  ✓ Created Table table');

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Category" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL UNIQUE,
          "isBuffet" BOOLEAN NOT NULL DEFAULT 0,
          "buffetPrice" REAL,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);
      console.log('  ✓ Created Category table');

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Category_sortOrder_idx" ON "Category"("sortOrder");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "MenuItem" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "itemNumber" INTEGER UNIQUE,
          "name" TEXT NOT NULL,
          "categoryId" TEXT NOT NULL,
          "secondaryCategoryId" TEXT,
          "price" REAL NOT NULL,
          "description" TEXT,
          "imageUrl" TEXT,
          "available" BOOLEAN NOT NULL DEFAULT 1,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY ("secondaryCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE
        );
      `);
      console.log('  ✓ Created MenuItem table');

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "MenuItem_itemNumber_idx" ON "MenuItem"("itemNumber");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "MenuItem_categoryId_idx" ON "MenuItem"("categoryId");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "MenuItem_secondaryCategoryId_idx" ON "MenuItem"("secondaryCategoryId");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "MenuItem_available_idx" ON "MenuItem"("available");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Order" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "tableId" INTEGER NOT NULL,
          "status" TEXT NOT NULL DEFAULT 'PENDING',
          "isBuffet" BOOLEAN NOT NULL DEFAULT 0,
          "buffetCategoryId" TEXT,
          "subtotal" REAL NOT NULL,
          "tax" REAL NOT NULL,
          "discount" REAL NOT NULL DEFAULT 0,
          "serviceCharge" REAL NOT NULL DEFAULT 0,
          "tip" REAL NOT NULL DEFAULT 0,
          "total" REAL NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL,
          FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
          FOREIGN KEY ("buffetCategoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE
        );
      `);
      console.log('  ✓ Created Order table');

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Order_tableId_idx" ON "Order"("tableId");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Order_buffetCategoryId_idx" ON "Order"("buffetCategoryId");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "OrderItem" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "orderId" TEXT NOT NULL,
          "menuItemId" TEXT NOT NULL,
          "quantity" INTEGER NOT NULL,
          "price" REAL NOT NULL,
          "notes" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE,
          FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `);
      console.log('  ✓ Created OrderItem table');

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "OrderItem_orderId_idx" ON "OrderItem"("orderId");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Payment" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "orderId" TEXT NOT NULL UNIQUE,
          "amount" REAL NOT NULL,
          "method" TEXT NOT NULL,
          "reference" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `);
      console.log('  ✓ Created Payment table');

      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "Payment_createdAt_idx" ON "Payment"("createdAt");
      `);

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Setting" (
          "key" TEXT NOT NULL PRIMARY KEY,
          "value" TEXT NOT NULL,
          "updatedAt" DATETIME NOT NULL
        );
      `);
      console.log('  ✓ Created Setting table');

      // Create Printer tables for multi-printer support
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "Printer" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "name" TEXT NOT NULL,
          "type" TEXT NOT NULL,
          "address" TEXT,
          "port" TEXT,
          "vendorId" TEXT,
          "productId" TEXT,
          "serialPath" TEXT,
          "isActive" BOOLEAN NOT NULL DEFAULT 1,
          "sortOrder" INTEGER NOT NULL DEFAULT 0,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL
        );
      `);
      console.log('  ✓ Created Printer table');

      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PrinterCategory" (
          "id" TEXT NOT NULL PRIMARY KEY,
          "printerId" TEXT NOT NULL,
          "categoryId" TEXT NOT NULL,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE ON UPDATE CASCADE,
          FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE
        );
      `);
      console.log('  ✓ Created PrinterCategory table');

      await prisma.$executeRawUnsafe(`
        CREATE UNIQUE INDEX IF NOT EXISTS "PrinterCategory_printerId_categoryId_key" 
        ON "PrinterCategory"("printerId", "categoryId");
      `);

      console.log('  ✅ Database schema created successfully');
    } catch (error: any) {
      console.error('  ❌ Failed to create database schema:', {
        message: error.message,
        code: error.code,
        name: error.name
      });
      throw error;
    }
  }

  /**
   * Create default users
   */
  private async createDefaultUsers(): Promise<void> {
    // Create admin user
    const adminPassword = await bcrypt.hash('admin123', 12);
    await prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        password: adminPassword,
        role: 'ADMIN',
      },
    });

    // Create waiter user
    const waiterPassword = await bcrypt.hash('waiter123', 12);
    await prisma.user.upsert({
      where: { username: 'waiter' },
      update: {},
      create: {
        username: 'waiter',
        password: waiterPassword,
        role: 'WAITER',
      },
    });

    // Create chef user
    const chefPassword = await bcrypt.hash('chef123', 12);
    await prisma.user.upsert({
      where: { username: 'chef' },
      update: {},
      create: {
        username: 'chef',
        password: chefPassword,
        role: 'CHEF',
      },
    });

    console.log('  ✓ Created default users (admin, waiter, chef)');
  }

  /**
   * Create default settings
   */
  private async createDefaultSettings(): Promise<void> {
    const defaultSettings = [
      { key: 'business_name', value: 'My Restaurant' },
      { key: 'business_address', value: '123 Main Street, City, State 12345' },
      { key: 'tax_percentage', value: '10' },
      { key: 'currency', value: 'USD' },
      { key: 'server_port', value: config.port.toString() },
      { key: 'server_url', value: this.getDefaultServerUrl() },
      { key: 'theme', value: 'light' },
      { key: 'printer_type', value: '' },
      { key: 'printer_address', value: '' },
    ];

    for (const setting of defaultSettings) {
      await upsertSetting(setting.key, setting.value);
    }

    console.log('  ✓ Created default settings');
  }

  /**
   * Create default tables with QR codes
   */
  private async createDefaultTables(): Promise<void> {
    // Get server URL for QR code generation
    const serverUrlSetting = await prisma.setting.findUnique({ where: { key: 'server_url' } });
    const serverUrl = serverUrlSetting?.value || this.getDefaultServerUrl();

    // Create 10 tables
    for (let i = 1; i <= 10; i++) {
      const tableName = `Table ${i}`;

      // Check if table already exists
      const existingTable = await prisma.table.findUnique({ where: { name: tableName } });

      if (!existingTable) {
        // Create table first to get the ID
        const table = await prisma.table.create({
          data: {
            name: tableName,
            qrCodeUrl: '', // Temporary empty value
            status: 'FREE',
          },
        });

        // Generate QR code with the table ID
        const qrCodeUrl = await generateTableQRCode(table.id, serverUrl, {
          width: 300,
          margin: 2,
        });

        // Update table with QR code URL
        await prisma.table.update({
          where: { id: table.id },
          data: { qrCodeUrl },
        });
      }
    }

    console.log('  ✓ Created 10 tables with QR codes');
  }

  /**
   * Create default categories
   */
  private async createDefaultCategories(): Promise<{ [key: string]: string }> {
    const categories = [
      { name: 'Appetizers', sortOrder: 1 },
      { name: 'Main Course', sortOrder: 2 },
      { name: 'Desserts', sortOrder: 3 },
      { name: 'Beverages', sortOrder: 4 },
      { name: 'Sides', sortOrder: 5 },
    ];

    const createdCategories: { [key: string]: string } = {};
    for (const category of categories) {
      const cat = await prisma.category.upsert({
        where: { name: category.name },
        update: {},
        create: category,
      });
      createdCategories[category.name] = cat.id;
    }

    console.log('  ✓ Created default categories');
    return createdCategories;
  }

  /**
   * Create default menu items
   */
  private async createDefaultMenuItems(): Promise<void> {
    // Get categories first
    const categories = await prisma.category.findMany();
    const categoryMap: { [key: string]: string } = {};
    categories.forEach((cat) => {
      categoryMap[cat.name] = cat.id;
    });

    const menuItems = [
      // Appetizers
      {
        name: 'Caesar Salad',
        categoryId: categoryMap['Appetizers'],
        price: 8.99,
        description: 'Fresh romaine lettuce with Caesar dressing, croutons, and parmesan cheese',
        imageUrl: 'https://via.placeholder.com/300x200?text=Caesar+Salad',
        available: true,
      },
      {
        name: 'Bruschetta',
        categoryId: categoryMap['Appetizers'],
        price: 7.99,
        description: 'Toasted bread topped with fresh tomatoes, garlic, basil, and olive oil',
        imageUrl: 'https://via.placeholder.com/300x200?text=Bruschetta',
        available: true,
      },
      {
        name: 'Mozzarella Sticks',
        categoryId: categoryMap['Appetizers'],
        price: 6.99,
        description: 'Crispy fried mozzarella cheese sticks served with marinara sauce',
        imageUrl: 'https://via.placeholder.com/300x200?text=Mozzarella+Sticks',
        available: true,
      },
      {
        name: 'Chicken Wings',
        categoryId: categoryMap['Appetizers'],
        price: 9.99,
        description: 'Spicy buffalo wings served with blue cheese dressing',
        imageUrl: 'https://via.placeholder.com/300x200?text=Chicken+Wings',
        available: true,
      },
      {
        name: 'Spring Rolls',
        categoryId: categoryMap['Appetizers'],
        price: 7.49,
        description: 'Crispy vegetable spring rolls with sweet chili sauce',
        imageUrl: 'https://via.placeholder.com/300x200?text=Spring+Rolls',
        available: true,
      },
      // Main Course
      {
        name: 'Margherita Pizza',
        categoryId: categoryMap['Main Course'],
        price: 12.99,
        description: 'Classic pizza with tomato sauce, fresh mozzarella, and basil',
        imageUrl: 'https://via.placeholder.com/300x200?text=Margherita+Pizza',
        available: true,
      },
      {
        name: 'Grilled Salmon',
        categoryId: categoryMap['Main Course'],
        price: 18.99,
        description: 'Fresh Atlantic salmon with lemon butter sauce and seasonal vegetables',
        imageUrl: 'https://via.placeholder.com/300x200?text=Grilled+Salmon',
        available: true,
      },
      {
        name: 'Beef Burger',
        categoryId: categoryMap['Main Course'],
        price: 14.99,
        description: 'Juicy beef patty with lettuce, tomato, cheese, and fries',
        imageUrl: 'https://via.placeholder.com/300x200?text=Beef+Burger',
        available: true,
      },
      {
        name: 'Chicken Alfredo',
        categoryId: categoryMap['Main Course'],
        price: 15.99,
        description: 'Fettuccine pasta with grilled chicken in creamy Alfredo sauce',
        imageUrl: 'https://via.placeholder.com/300x200?text=Chicken+Alfredo',
        available: true,
      },
      {
        name: 'Ribeye Steak',
        categoryId: categoryMap['Main Course'],
        price: 24.99,
        description: '12oz ribeye steak cooked to perfection with mashed potatoes',
        imageUrl: 'https://via.placeholder.com/300x200?text=Ribeye+Steak',
        available: true,
      },
      {
        name: 'Vegetable Stir Fry',
        categoryId: categoryMap['Main Course'],
        price: 11.99,
        description: 'Mixed vegetables stir-fried with soy sauce and served with rice',
        imageUrl: 'https://via.placeholder.com/300x200?text=Vegetable+Stir+Fry',
        available: true,
      },
      {
        name: 'Fish and Chips',
        categoryId: categoryMap['Main Course'],
        price: 13.99,
        description: 'Beer-battered cod with crispy fries and tartar sauce',
        imageUrl: 'https://via.placeholder.com/300x200?text=Fish+and+Chips',
        available: true,
      },
      // Desserts
      {
        name: 'Chocolate Cake',
        categoryId: categoryMap['Desserts'],
        price: 6.99,
        description: 'Rich chocolate cake with chocolate ganache and vanilla ice cream',
        imageUrl: 'https://via.placeholder.com/300x200?text=Chocolate+Cake',
        available: true,
      },
      {
        name: 'Tiramisu',
        categoryId: categoryMap['Desserts'],
        price: 7.99,
        description: 'Classic Italian dessert with coffee-soaked ladyfingers and mascarpone',
        imageUrl: 'https://via.placeholder.com/300x200?text=Tiramisu',
        available: true,
      },
      {
        name: 'Cheesecake',
        categoryId: categoryMap['Desserts'],
        price: 6.49,
        description: 'New York style cheesecake with strawberry topping',
        imageUrl: 'https://via.placeholder.com/300x200?text=Cheesecake',
        available: true,
      },
      {
        name: 'Ice Cream Sundae',
        categoryId: categoryMap['Desserts'],
        price: 5.99,
        description: 'Three scoops of ice cream with chocolate sauce and whipped cream',
        imageUrl: 'https://via.placeholder.com/300x200?text=Ice+Cream+Sundae',
        available: true,
      },
      // Beverages
      {
        name: 'Coca Cola',
        categoryId: categoryMap['Beverages'],
        price: 2.99,
        description: 'Classic Coca Cola',
        imageUrl: 'https://via.placeholder.com/300x200?text=Coca+Cola',
        available: true,
      },
      {
        name: 'Orange Juice',
        categoryId: categoryMap['Beverages'],
        price: 3.99,
        description: 'Freshly squeezed orange juice',
        imageUrl: 'https://via.placeholder.com/300x200?text=Orange+Juice',
        available: true,
      },
      {
        name: 'Coffee',
        categoryId: categoryMap['Beverages'],
        price: 2.49,
        description: 'Freshly brewed coffee',
        imageUrl: 'https://via.placeholder.com/300x200?text=Coffee',
        available: true,
      },
      {
        name: 'Iced Tea',
        categoryId: categoryMap['Beverages'],
        price: 2.99,
        description: 'Refreshing iced tea with lemon',
        imageUrl: 'https://via.placeholder.com/300x200?text=Iced+Tea',
        available: true,
      },
      // Sides
      {
        name: 'French Fries',
        categoryId: categoryMap['Sides'],
        price: 3.99,
        description: 'Crispy golden french fries',
        imageUrl: 'https://via.placeholder.com/300x200?text=French+Fries',
        available: true,
      },
      {
        name: 'Onion Rings',
        categoryId: categoryMap['Sides'],
        price: 4.49,
        description: 'Crispy battered onion rings',
        imageUrl: 'https://via.placeholder.com/300x200?text=Onion+Rings',
        available: true,
      },
      {
        name: 'Garlic Bread',
        categoryId: categoryMap['Sides'],
        price: 3.49,
        description: 'Toasted bread with garlic butter',
        imageUrl: 'https://via.placeholder.com/300x200?text=Garlic+Bread',
        available: true,
      },
    ];

    for (const item of menuItems) {
      const itemId = item.name.toLowerCase().replace(/\s+/g, '-');
      await prisma.menuItem.upsert({
        where: { id: itemId },
        update: {},
        create: {
          id: itemId,
          ...item,
        },
      });
    }

    console.log(`  ✓ Created ${menuItems.length} menu items`);
  }
}

export default new InitializationService();
