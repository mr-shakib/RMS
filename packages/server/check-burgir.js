const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDuplicates() {
  try {
    const items = await prisma.menuItem.findMany({
      where: { 
        name: 'Burgir'
      },
      include: { 
        category: true,
        secondaryCategory: true 
      }
    });
    
    console.log(`\n=== All "Burgir" items ===\n`);
    
    items.forEach((item, index) => {
      console.log(`Item ${index + 1}:`);
      console.log(`  ID: ${item.id}`);
      console.log(`  Name: ${item.name}`);
      console.log(`  Price: €${item.price.toFixed(2)}`);
      console.log(`  alwaysPriced: ${item.alwaysPriced}`);
      console.log(`  Category: ${item.category?.name}`);
      console.log(`  Secondary Category: ${item.secondaryCategory?.name}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();
