import prisma from './client';

async function testIndexes() {
  console.log('📊 Testing Database Indexes\n');

  try {
    // Test 1: Query by indexed category
    console.log('1. Testing MenuItem.category index...');
    console.time('Category query');
    const beverages = await prisma.menuItem.findMany({
      where: { category: 'Beverages' },
    });
    console.timeEnd('Category query');
    console.log(`✓ Found ${beverages.length} beverages\n`);

    // Test 2: Query by indexed available status
    console.log('2. Testing MenuItem.available index...');
    console.time('Available query');
    const available = await prisma.menuItem.findMany({
      where: { available: true },
    });
    console.timeEnd('Available query');
    console.log(`✓ Found ${available.length} available items\n`);

    // Test 3: Query by indexed order status
    console.log('3. Testing Order.status index...');
    console.time('Status query');
    const pendingOrders = await prisma.order.findMany({
      where: { status: 'PENDING' },
    });
    console.timeEnd('Status query');
    console.log(`✓ Found ${pendingOrders.length} pending orders\n`);

    // Test 4: Query by indexed tableId
    console.log('4. Testing Order.tableId index...');
    console.time('TableId query');
    const tableOrders = await prisma.order.findMany({
      where: { tableId: 1 },
    });
    console.timeEnd('TableId query');
    console.log(`✓ Found ${tableOrders.length} orders for table 1\n`);

    // Test 5: Query by indexed createdAt
    console.log('5. Testing Order.createdAt index...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    console.time('Date range query');
    const recentOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: yesterday,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    console.timeEnd('Date range query');
    console.log(`✓ Found ${recentOrders.length} orders from last 24 hours\n`);

    // Test 6: Unique constraint test
    console.log('6. Testing unique constraints...');
    try {
      await prisma.user.create({
        data: {
          username: 'admin', // This should already exist
          password: 'test',
          role: 'ADMIN',
        },
      });
      console.log('❌ Unique constraint failed - duplicate was allowed!');
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log('✓ Unique constraint working - duplicate username rejected\n');
      } else {
        throw error;
      }
    }

    console.log('✅ All index tests completed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testIndexes();
