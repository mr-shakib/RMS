const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const lunchId = '53f7063b-dce4-4cf9-b71d-b08a829b1e01';
    
    console.log('\n=== Checking Lunch Buffet Items ===');
    const items = await prisma.menuItemBuffetCategory.findMany({
      where: { buffetCategoryId: lunchId },
      include: {
        menuItem: true,
        buffetCategory: true
      }
    });
    
    console.log('Items linked to Lunch buffet:', items.length);
    items.forEach(i => {
      console.log(' -', i.menuItem.name);
    });
    
    console.log('\n=== Checking ALL BuffetCategory Links ===');
    const allLinks = await prisma.menuItemBuffetCategory.findMany({
      include: {
        menuItem: { select: { name: true } },
        buffetCategory: { select: { name: true } }
      }
    });
    
    console.log('Total buffet links:', allLinks.length);
    allLinks.forEach(link => {
      console.log(` - ${link.menuItem.name} → ${link.buffetCategory.name}`);
    });
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
