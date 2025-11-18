import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      password: hashedPassword,
      role: 'ADMIN',
    },
  });
  console.log('✅ Admin user created:', admin.username);

  // Create categories
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { name: 'Appetizers' },
      update: {},
      create: { name: 'Appetizers', isBuffet: false, sortOrder: 1 },
    }),
    prisma.category.upsert({
      where: { name: 'Main Course' },
      update: {},
      create: { name: 'Main Course', isBuffet: false, sortOrder: 2 },
    }),
    prisma.category.upsert({
      where: { name: 'Desserts' },
      update: {},
      create: { name: 'Desserts', isBuffet: false, sortOrder: 3 },
    }),
    prisma.category.upsert({
      where: { name: 'Beverages' },
      update: {},
      create: { name: 'Beverages', isBuffet: false, sortOrder: 4 },
    }),
  ]);
  console.log('✅ Categories created:', categories.length);

  // Create menu items
  const menuItems = await Promise.all([
    prisma.menuItem.create({
      data: {
        name: 'Spring Rolls',
        description: 'Crispy vegetable spring rolls',
        price: 5.99,
        categoryId: categories[0].id,
        available: true,
      },
    }),
    prisma.menuItem.create({
      data: {
        name: 'Chicken Wings',
        description: 'Spicy buffalo wings',
        price: 8.99,
        categoryId: categories[0].id,
        available: true,
      },
    }),
    prisma.menuItem.create({
      data: {
        name: 'Grilled Salmon',
        description: 'Fresh Atlantic salmon with herbs',
        price: 18.99,
        categoryId: categories[1].id,
        available: true,
      },
    }),
    prisma.menuItem.create({
      data: {
        name: 'Beef Steak',
        description: 'Prime ribeye steak',
        price: 24.99,
        categoryId: categories[1].id,
        available: true,
      },
    }),
    prisma.menuItem.create({
      data: {
        name: 'Chocolate Cake',
        description: 'Rich chocolate layer cake',
        price: 6.99,
        categoryId: categories[2].id,
        available: true,
      },
    }),
    prisma.menuItem.create({
      data: {
        name: 'Coca Cola',
        description: 'Chilled soft drink',
        price: 2.99,
        categoryId: categories[3].id,
        available: true,
      },
    }),
  ]);
  console.log('✅ Menu items created:', menuItems.length);

  // Create tables
  const tables = await Promise.all(
    Array.from({ length: 10 }, (_, i) =>
      prisma.table.create({
        data: {
          name: `Table ${i + 1}`,
          status: 'FREE',
          qrCodeUrl: `qr-table-${i + 1}`,
        },
      })
    )
  );
  console.log('✅ Tables created:', tables.length);

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
