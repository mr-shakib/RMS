import prisma from './client';

async function testConnection() {
  try {
    console.log('Testing database connection...');
    
    // Test connection
    await prisma.$connect();
    console.log('✓ Database connection successful');
    
    // Test query
    const userCount = await prisma.user.count();
    console.log(`✓ Database query successful (${userCount} users found)`);
    
    // Test all models
    const tableCount = await prisma.table.count();
    const menuItemCount = await prisma.menuItem.count();
    const orderCount = await prisma.order.count();
    const paymentCount = await prisma.payment.count();
    const settingCount = await prisma.setting.count();
    
    console.log('\nDatabase Statistics:');
    console.log(`- Users: ${userCount}`);
    console.log(`- Tables: ${tableCount}`);
    console.log(`- Menu Items: ${menuItemCount}`);
    console.log(`- Orders: ${orderCount}`);
    console.log(`- Payments: ${paymentCount}`);
    console.log(`- Settings: ${settingCount}`);
    
    console.log('\n✓ All database models are accessible');
    
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
