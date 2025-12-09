const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCategories() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' }
    });
    
    console.log(`\n=== All Categories ===\n`);
    
    categories.forEach(cat => {
      console.log(`- ${cat.name}`);
      console.log(`  ID: ${cat.id}`);
      console.log(`  Is Buffet: ${cat.isBuffet}`);
      console.log(`  Buffet Price: €${cat.buffetPrice ? cat.buffetPrice.toFixed(2) : 'N/A'}`);
      console.log(`  Sort Order: ${cat.sortOrder}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCategories();
