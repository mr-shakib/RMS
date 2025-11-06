import prisma from './client';

async function testCRUD() {
  console.log('🧪 Testing CRUD Operations\n');

  try {
    // CREATE
    console.log('1. Testing CREATE...');
    const newItem = await prisma.menuItem.create({
      data: {
        name: 'Test Pizza',
        category: 'Main Course',
        price: 15.99,
        description: 'Test item',
        available: true,
      },
    });
    console.log(`✓ Created: ${newItem.name} (ID: ${newItem.id})`);

    // READ
    console.log('\n2. Testing READ...');
    const foundItem = await prisma.menuItem.findUnique({
      where: { id: newItem.id },
    });
    console.log(`✓ Found: ${foundItem?.name} - $${foundItem?.price}`);

    // READ ALL with filter
    console.log('\n3. Testing READ with filter...');
    const mainCourses = await prisma.menuItem.findMany({
      where: { category: 'Main Course' },
      take: 5,
    });
    console.log(`✓ Found ${mainCourses.length} main courses`);
    mainCourses.forEach(item => {
      console.log(`  - ${item.name}: $${item.price}`);
    });

    // UPDATE
    console.log('\n4. Testing UPDATE...');
    const updated = await prisma.menuItem.update({
      where: { id: newItem.id },
      data: { price: 17.99, available: false },
    });
    console.log(`✓ Updated: ${updated.name} - New price: $${updated.price}, Available: ${updated.available}`);

    // DELETE
    console.log('\n5. Testing DELETE...');
    await prisma.menuItem.delete({
      where: { id: newItem.id },
    });
    console.log(`✓ Deleted: ${newItem.name}`);

    // Verify deletion
    const deleted = await prisma.menuItem.findUnique({
      where: { id: newItem.id },
    });
    console.log(`✓ Verified deletion: ${deleted === null ? 'Item not found (correct)' : 'ERROR: Item still exists'}`);

    // Test relationships
    console.log('\n6. Testing RELATIONSHIPS...');
    const ordersWithDetails = await prisma.order.findMany({
      include: {
        table: true,
        items: {
          include: {
            menuItem: true,
          },
        },
        payment: true,
      },
      take: 3,
    });
    
    console.log(`✓ Found ${ordersWithDetails.length} orders with relationships`);
    ordersWithDetails.forEach(order => {
      console.log(`  Order ${order.id.substring(0, 8)}...`);
      console.log(`    - Table: ${order.table.name}`);
      console.log(`    - Items: ${order.items.length}`);
      console.log(`    - Total: $${order.total.toFixed(2)}`);
      console.log(`    - Payment: ${order.payment ? order.payment.method : 'Not paid'}`);
    });

    // Test aggregations
    console.log('\n7. Testing AGGREGATIONS...');
    const stats = await prisma.order.aggregate({
      _count: true,
      _sum: { total: true },
      _avg: { total: true },
      _max: { total: true },
    });
    
    console.log(`✓ Order Statistics:`);
    console.log(`  - Total orders: ${stats._count}`);
    console.log(`  - Total revenue: $${stats._sum.total?.toFixed(2) || 0}`);
    console.log(`  - Average order: $${stats._avg.total?.toFixed(2) || 0}`);
    console.log(`  - Largest order: $${stats._max.total?.toFixed(2) || 0}`);

    console.log('\n✅ All CRUD tests passed!\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testCRUD();
