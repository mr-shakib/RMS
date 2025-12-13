const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAlwaysPriced() {
  try {
    const items = await prisma.menuItem.findMany({
      where: { alwaysPriced: true },
      include: { 
        category: true,
        buffetCategories: {
          include: {
            buffetCategory: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    console.log(`\n=== Items with alwaysPriced=true (${items.length} items) ===\n`);
    
    if (items.length === 0) {
      console.log('No items are marked as always priced.');
    } else {
      items.forEach(item => {
        console.log(`- ${item.name}`);
        console.log(`  Category: ${item.category?.name || 'N/A'}`);
        console.log(`  Price: €${item.price.toFixed(2)}`);
        console.log(`  Available: ${item.available}`);
        if (item.buffetCategories && item.buffetCategories.length > 0) {
          const buffetNames = item.buffetCategories.map(bc => bc.buffetCategory.name).join(', ');
          console.log(`  Buffet Categories: ${buffetNames}`);
        }
        console.log('');
      });
    }
    
    // Also check total items
    const totalItems = await prisma.menuItem.count();
    console.log(`Total items in database: ${totalItems}`);
    
    const notAlwaysPriced = await prisma.menuItem.count({
      where: { alwaysPriced: false }
    });
    console.log(`Items with alwaysPriced=false: ${notAlwaysPriced}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAlwaysPriced();
