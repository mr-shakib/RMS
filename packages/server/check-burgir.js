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
        buffetCategories: {
          include: {
            buffetCategory: true
          }
        }
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
      if (item.buffetCategories && item.buffetCategories.length > 0) {
        const buffetNames = item.buffetCategories.map(bc => bc.buffetCategory.name).join(', ');
        console.log(`  Buffet Categories: ${buffetNames}`);
      }
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDuplicates();
