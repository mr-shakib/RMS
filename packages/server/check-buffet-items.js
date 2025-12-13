const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const items = await prisma.menuItem.findMany({
      include: {
        category: true,
        buffetCategories: {
          include: {
            buffetCategory: true
          }
        }
      }
    });

    console.log('\n=== Menu Items with Buffet Categories ===');
    items.forEach(item => {
      const buffetCats = item.buffetCategories.map(bc => bc.buffetCategory.name).join(', ');
      if (buffetCats) {
        console.log(`${item.name}:`);
        console.log(`  Primary Category: ${item.category.name} (ID: ${item.categoryId}, isBuffet: ${item.category.isBuffet})`);
        console.log(`  Buffet Categories: ${buffetCats}`);
      }
    });

    console.log('\n=== All Buffet Categories ===');
    const buffetCats = await prisma.category.findMany({
      where: { isBuffet: true }
    });
    buffetCats.forEach(cat => {
      console.log(`${cat.name} (ID: ${cat.id}, Price: €${cat.buffetPrice})`);
    });

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
