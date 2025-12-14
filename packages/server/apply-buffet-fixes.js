const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function applyFixes() {
  try {
    console.log('\n=== Applying Buffet Pricing Fixes ===\n');
    
    // Fix 1: Rename the expensive Pizza to avoid confusion
    console.log('1. Renaming expensive Pizza item...');
    const expensivePizza = await prisma.menuItem.findFirst({
      where: { 
        name: 'Pizza',
        price: 50,
        alwaysPriced: true
      }
    });
    
    if (expensivePizza) {
      await prisma.menuItem.update({
        where: { id: expensivePizza.id },
        data: { name: 'Pizza (Extra)' }
      });
      console.log('   ✅ Renamed to "Pizza (Extra)"');
    } else {
      console.log('   ℹ️  Expensive Pizza not found or already renamed');
    }
    
    // Fix 2: Ensure all items have proper boolean alwaysPriced values
    console.log('\n2. Verifying all items have proper boolean alwaysPriced...');
    const allItemsCheck = await prisma.menuItem.findMany({
      select: {
        id: true,
        name: true,
        alwaysPriced: true
      }
    });
    
    let fixedCount = 0;
    for (const item of allItemsCheck) {
      // Check if alwaysPriced is not a proper boolean
      if (typeof item.alwaysPriced !== 'boolean' || item.alwaysPriced == null) {
        await prisma.menuItem.update({
          where: { id: item.id },
          data: { alwaysPriced: false }
        });
        console.log(`   ✅ Set ${item.name} alwaysPriced to false (was ${item.alwaysPriced})`);
        fixedCount++;
      }
    }
    
    if (fixedCount === 0) {
      console.log('   ✅ All items have proper boolean alwaysPriced values');
    } else {
      console.log(`   ✅ Fixed ${fixedCount} items`);
    }
    
    // Verification: Show all items
    console.log('\n3. Verification - All menu items:\n');
    const allItems = await prisma.menuItem.findMany({
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
    
    allItems.forEach(item => {
      const buffetNames = item.buffetCategories.map(bc => bc.buffetCategory.name).join(', ');
      console.log(`📦 ${item.name}`);
      console.log(`   Price: €${item.price.toFixed(2)}`);
      console.log(`   alwaysPriced: ${item.alwaysPriced} (${typeof item.alwaysPriced})`);
      console.log(`   Buffet Categories: ${buffetNames || 'None'}`);
      console.log('');
    });
    
    console.log('✅ All fixes applied successfully!\n');
    console.log('📝 Next steps:');
    console.log('   1. Rebuild the PWA: cd packages/pwa && npm run build');
    console.log('   2. Clear browser cache and reload the PWA');
    console.log('   3. Test buffet ordering and check console logs\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

applyFixes();
