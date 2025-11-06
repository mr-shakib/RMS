import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin user:', admin.username);

  // Create default waiter user
  const waiterPassword = await bcrypt.hash('waiter123', 10);
  const waiter = await prisma.user.upsert({
    where: { username: 'waiter' },
    update: {},
    create: {
      username: 'waiter',
      password: waiterPassword,
      role: 'WAITER',
    },
  });
  console.log('✅ Created waiter user:', waiter.username);

  // Create default chef user
  const chefPassword = await bcrypt.hash('chef123', 10);
  const chef = await prisma.user.upsert({
    where: { username: 'chef' },
    update: {},
    create: {
      username: 'chef',
      password: chefPassword,
      role: 'CHEF',
    },
  });
  console.log('✅ Created chef user:', chef.username);

  // Create default tables
  const tables = [
    { name: 'Table 1', qrCodeUrl: '' },
    { name: 'Table 2', qrCodeUrl: '' },
    { name: 'Table 3', qrCodeUrl: '' },
    { name: 'Table 4', qrCodeUrl: '' },
    { name: 'Table 5', qrCodeUrl: '' },
  ];

  for (const table of tables) {
    await prisma.table.upsert({
      where: { name: table.name },
      update: {},
      create: table,
    });
  }
  console.log('✅ Created 5 default tables');

  // Create default menu items
  const menuItems = [
    {
      name: 'Margherita Pizza',
      category: 'Main Course',
      price: 12.99,
      description: 'Classic pizza with tomato sauce, mozzarella, and basil',
      available: true,
    },
    {
      name: 'Caesar Salad',
      category: 'Appetizers',
      price: 8.99,
      description: 'Fresh romaine lettuce with Caesar dressing and croutons',
      available: true,
    },
    {
      name: 'Grilled Salmon',
      category: 'Main Course',
      price: 18.99,
      description: 'Fresh Atlantic salmon with lemon butter sauce',
      available: true,
    },
    {
      name: 'Chocolate Cake',
      category: 'Desserts',
      price: 6.99,
      description: 'Rich chocolate cake with chocolate ganache',
      available: true,
    },
    {
      name: 'Coca Cola',
      category: 'Beverages',
      price: 2.99,
      description: 'Classic Coca Cola',
      available: true,
    },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.name.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        id: item.name.toLowerCase().replace(/\s+/g, '-'),
        ...item,
      },
    });
  }
  console.log('✅ Created 5 default menu items');

  // Create default settings
  const settings = [
    { key: 'tax_percentage', value: '10' },
    { key: 'server_url', value: 'http://localhost:5000' },
    { key: 'restaurant_name', value: 'My Restaurant' },
  ];

  for (const setting of settings) {
    await prisma.setting.upsert({
      where: { key: setting.key },
      update: { value: setting.value },
      create: setting,
    });
  }
  console.log('✅ Created default settings');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
