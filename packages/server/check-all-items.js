const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllItems() {
  try {
    const items = await prisma.menuItem.findMany({
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
    
    console.log(`\n=== ALL MENU ITEMS (${items.length} total) ===\n`);
    
    items.forEach(item => {
      console.log(`📦 ${item.name}`);
      console.log(`   Category: ${item.category?.name || 'N/A'}`);
      console.log(`   Price: €${item.price.toFixed(2)}`);
      console.log(`   Available: ${item.available}`);
      console.log(`   alwaysPriced: ${item.alwaysPriced} (type: ${typeof item.alwaysPriced})`);
      
      if (item.buffetCategories && item.buffetCategories.length > 0) {
        const buffetNames = item.buffetCategories.map(bc => bc.buffetCategory.name).join(', ');
        console.log(`   Buffet Categories: ${buffetNames}`);
      } else {
        console.log(`   Buffet Categories: None`);
      }
      console.log('');
    });
    
    console.log('=== SUMMARY ===');
    console.log(`Items with alwaysPriced=true: ${items.filter(i => i.alwaysPriced === true).length}`);
    console.log(`Items with alwaysPriced=false: ${items.filter(i => i.alwaysPriced === false).length}`);
    console.log(`Items with alwaysPriced=null/undefined: ${items.filter(i => i.alwaysPriced == null).length}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllItems();
