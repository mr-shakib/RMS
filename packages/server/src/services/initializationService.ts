import prisma from '../db/client';
import bcrypt from 'bcrypt';
import { generateTableQRCode } from '../utils/qrCodeGenerator';

/**
 * Service to check and initialize database on server startup
 */
class InitializationService {
  /**
   * Check if database has been initialized with seed data
   */
  async isDatabaseInitialized(): Promise<boolean> {
    try {
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
    } catch (error) {
      console.error('Error checking database initialization:', error);
      return false;
    }
  }

  /**
   * Initialize database with default data if not already initialized
   */
  async initializeDatabase(): Promise<void> {
    const isInitialized = await this.isDatabaseInitialized();

    if (isInitialized) {
      console.log('✅ Database already initialized');
      return;
    }

    console.log('🔧 Database not initialized, running initialization...');

    try {
      // Create default admin user
      await this.createDefaultUsers();

      // Create default settings
      await this.createDefaultSettings();

      // Create default tables with QR codes
      await this.createDefaultTables();

      // Create default categories
      await this.createDefaultCategories();

      // Create default menu items
      await this.createDefaultMenuItems();

      console.log('✅ Database initialization completed successfully');
    } catch (error) {
      console.error('❌ Error initializing database:', error);
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
      { key: 'server_port', value: '5000' },
      { key: 'server_url', value: 'http://localhost:5000' },
      { key: 'theme', value: 'light' },
      { key: 'printer_type', value: '' },
      { key: 'printer_address', value: '' },
    ];

    for (const setting of defaultSettings) {
      await prisma.setting.upsert({
        where: { key: setting.key },
        update: { value: setting.value },
        create: setting,
      });
    }

    console.log('  ✓ Created default settings');
  }

  /**
   * Create default tables with QR codes
   */
  private async createDefaultTables(): Promise<void> {
    // Get server URL for QR code generation
    const serverUrlSetting = await prisma.setting.findUnique({ where: { key: 'server_url' } });
    const serverUrl = serverUrlSetting?.value || 'http://localhost:5000';

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
