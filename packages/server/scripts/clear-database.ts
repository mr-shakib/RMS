#!/usr/bin/env tsx
/**
 * Clear all data from the database while keeping the schema intact
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🗑️  Clearing database...\n');

  try {
    // Delete in correct order to respect foreign key constraints
    console.log('Deleting order items...');
    await prisma.orderItem.deleteMany();
    
    console.log('Deleting orders...');
    await prisma.order.deleteMany();
    
    console.log('Deleting menu items...');
    await prisma.menuItem.deleteMany();
    
    console.log('Deleting categories...');
    await prisma.category.deleteMany();
    
    console.log('Deleting tables...');
    await prisma.table.deleteMany();
    
    console.log('Deleting users (except admin)...');
    await prisma.user.deleteMany({
      where: {
        username: {
          not: 'admin'
        }
      }
    });
    
    console.log('Deleting settings...');
    await prisma.setting.deleteMany();

    console.log('\n✅ Database cleared successfully!');
    console.log('ℹ️  Admin user preserved (if existed)');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

clearDatabase();
