const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testPrismaReturnType() {
  try {
    const items = await prisma.menuItem.findMany({
      where: { name: { in: ['Burgiiiiir', 'Drink'] } },
      include: {
        category: true,
        secondaryCategory: true,
      }
    });
    
    console.log('\n=== Prisma Query Result ===\n');
    
    items.forEach(item => {
      console.log(`${item.name}:`);
      console.log('  All fields:', Object.keys(item));
      console.log(`  alwaysPriced field exists: ${'alwaysPriced' in item}`);
      console.log(`  alwaysPriced value: ${item.alwaysPriced}`);
      console.log(`  alwaysPriced type: ${typeof item.alwaysPriced}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testPrismaReturnType();
