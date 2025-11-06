import prisma from './client';
import bcrypt from 'bcrypt';

async function seedTestData() {
  try {
    console.log('🌱 Seeding test data...\n');

    // Create test users
    console.log('Creating users...');
    const adminPassword = await bcrypt.hash('admin123', 10);
    const waiterPassword = await bcrypt.hash('waiter123', 10);
    
    const admin = await prisma.user.create({
      data: {
        username: 'admin',
        password: adminPassword,
        role: 'ADMIN',
      },
    });
    
    const waiter = await prisma.user.create({
      data: {
        username: 'waiter1',
        password: waiterPassword,
        role: 'WAITER',
      },
    });
    
    console.log(`✓ Created ${admin.username} (${admin.role})`);
    console.log(`✓ Created ${waiter.username} (${waiter.role})`);

    // Create test tables
    console.log('\nCreating tables...');
    const table1 = await prisma.table.create({
      data: {
        name: 'Table 1',
        qrCodeUrl: 'https://example.com/qr/table-1',
        status: 'FREE',
      },
    });
    
    const table2 = await prisma.table.create({
      data: {
        name: 'Table 2',
        qrCodeUrl: 'https://example.com/qr/table-2',
        status: 'OCCUPIED',
      },
    });
    
    console.log(`✓ Created ${table1.name} (${table1.status})`);
    console.log(`✓ Created ${table2.name} (${table2.status})`);

    // Create test menu items
    console.log('\nCreating menu items...');
    const burger = await prisma.menuItem.create({
      data: {
        name: 'Classic Burger',
        category: 'Main Course',
        price: 12.99,
        description: 'Juicy beef burger with lettuce, tomato, and cheese',
        available: true,
      },
    });
    
    const pasta = await prisma.menuItem.create({
      data: {
        name: 'Spaghetti Carbonara',
        category: 'Main Course',
        price: 14.99,
        description: 'Creamy pasta with bacon and parmesan',
        available: true,
      },
    });
    
    const soda = await prisma.menuItem.create({
      data: {
        name: 'Coca Cola',
        category: 'Beverages',
        price: 2.99,
        description: 'Chilled soft drink',
        available: true,
      },
    });
    
    console.log(`✓ Created ${burger.name} - $${burger.price}`);
    console.log(`✓ Created ${pasta.name} - $${pasta.price}`);
    console.log(`✓ Created ${soda.name} - $${soda.price}`);

    // Create a test order
    console.log('\nCreating test order...');
    const subtotal = burger.price + soda.price;
    const tax = subtotal * 0.1; // 10% tax
    const total = subtotal + tax;
    
    const order = await prisma.order.create({
      data: {
        tableId: table2.id,
        status: 'PENDING',
        subtotal,
        tax,
        discount: 0,
        serviceCharge: 0,
        tip: 0,
        total,
        items: {
          create: [
            {
              menuItemId: burger.id,
              quantity: 1,
              price: burger.price,
              notes: 'No onions',
            },
            {
              menuItemId: soda.id,
              quantity: 1,
              price: soda.price,
            },
          ],
        },
      },
      include: {
        items: {
          include: {
            menuItem: true,
          },
        },
        table: true,
      },
    });
    
    console.log(`✓ Created order for ${order.table.name}`);
    console.log(`  - ${order.items.length} items`);
    console.log(`  - Subtotal: $${order.subtotal.toFixed(2)}`);
    console.log(`  - Tax: $${order.tax.toFixed(2)}`);
    console.log(`  - Total: $${order.total.toFixed(2)}`);

    // Create settings
    console.log('\nCreating settings...');
    await prisma.setting.createMany({
      data: [
        { key: 'BUSINESS_NAME', value: 'Test Restaurant' },
        { key: 'TAX_PERCENTAGE', value: '10' },
        { key: 'CURRENCY', value: 'USD' },
      ],
    });
    console.log('✓ Created application settings');

    console.log('\n✅ Test data seeded successfully!\n');
    
    // Display summary
    const counts = {
      users: await prisma.user.count(),
      tables: await prisma.table.count(),
      menuItems: await prisma.menuItem.count(),
      orders: await prisma.order.count(),
      orderItems: await prisma.orderItem.count(),
      settings: await prisma.setting.count(),
    };
    
    console.log('Database Summary:');
    console.log(`- Users: ${counts.users}`);
    console.log(`- Tables: ${counts.tables}`);
    console.log(`- Menu Items: ${counts.menuItems}`);
    console.log(`- Orders: ${counts.orders}`);
    console.log(`- Order Items: ${counts.orderItems}`);
    console.log(`- Settings: ${counts.settings}`);
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedTestData();
