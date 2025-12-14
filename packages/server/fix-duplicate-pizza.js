const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDuplicatePizza() {
  try {
    console.log('\n=== Finding duplicate Pizza items ===\n');
    
    const pizzas = await prisma.menuItem.findMany({
      where: { name: 'Pizza' },
      include: { 
        category: true,
        buffetCategories: {
          include: {
            buffetCategory: true
          }
        }
      },
      orderBy: { price: 'asc' }
    });
    
    if (pizzas.length === 0) {
      console.log('No Pizza items found.');
      return;
    }
    
    if (pizzas.length === 1) {
      console.log('Only one Pizza item found - no duplicates.');
      return;
    }
    
    console.log(`Found ${pizzas.length} Pizza items:\n`);
    
    pizzas.forEach((pizza, index) => {
      console.log(`${index + 1}. Pizza (ID: ${pizza.id.substring(0, 8)}...)`);
      console.log(`   Price: €${pizza.price.toFixed(2)}`);
      console.log(`   alwaysPriced: ${pizza.alwaysPriced}`);
      const buffetNames = pizza.buffetCategories.map(bc => bc.buffetCategory.name).join(', ');
      console.log(`   Buffet Categories: ${buffetNames || 'None'}`);
      console.log('');
    });
    
    // Suggest renaming to differentiate
    console.log('\n=== Suggested Fix ===\n');
    console.log('To avoid confusion, rename the items to be more specific:');
    pizzas.forEach((pizza, index) => {
      if (pizza.alwaysPriced) {
        console.log(`\n${index + 1}. Rename to "Pizza (Extra)" or "Premium Pizza"`);
        console.log(`   prisma.menuItem.update({`);
        console.log(`     where: { id: "${pizza.id}" },`);
        console.log(`     data: { name: "Pizza (Extra)" }`);
        console.log(`   })`);
      } else {
        console.log(`\n${index + 1}. Keep as "Pizza" (included in buffet)`);
      }
    });
    
    console.log('\n\nWould you like to apply the rename? (This script only shows suggestions)');
    console.log('To apply, create a migration or run the update command manually.\n');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixDuplicatePizza();
