const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApiData() {
  try {
    // Simulate what the API returns
    const menuItems = await prisma.menuItem.findMany({
      where: {},
      include: {
        category: true,
        secondaryCategory: true,
      },
      orderBy: [{ category: { sortOrder: 'asc' } }, { name: 'asc' }],
    });
    
    console.log('\n=== Items in Dinner (Buffet) Category ===\n');
    
    const dinnerItems = menuItems.filter(item => item.category?.name === 'Dinner');
    
    dinnerItems.forEach(item => {
      console.log(`- ${item.name}`);
      console.log(`  alwaysPriced: ${item.alwaysPriced} (type: ${typeof item.alwaysPriced})`);
      console.log(`  Price: €${item.price.toFixed(2)}`);
      console.log(`  Category: ${item.category.name} (isBuffet: ${item.category.isBuffet})`);
      if (item.secondaryCategory) {
        console.log(`  Secondary: ${item.secondaryCategory.name}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApiData();
