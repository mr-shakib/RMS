const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const lunchId = '53f7063b-dce4-4cf9-b71d-b08a829b1e01';
    
    // Get a test item
    const testItem = await prisma.menuItem.findFirst({
      where: { name: { contains: 'Burger' } }
    });
    
    if (!testItem) {
      console.log('No burger found');
      return;
    }
    
    console.log('Found item:', testItem.name, 'ID:', testItem.id);
    
    // Update it to add to lunch buffet
    const updated = await prisma.menuItem.update({
      where: { id: testItem.id },
      data: {
        buffetCategories: {
          deleteMany: {},
          create: [
            { buffetCategoryId: lunchId }
          ]
        }
      },
      include: {
        buffetCategories: {
          include: {
            buffetCategory: true
          }
        }
      }
    });
    
    console.log('\nUpdated! Buffet categories:', updated.buffetCategories.map(bc => bc.buffetCategory.name));
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
})();
