import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testAssignBuffet() {
  try {
    // Get first menu item
    const item = await prisma.menuItem.findFirst();
    
    // Get buffet categories
    const buffetCategories = await prisma.category.findMany({
      where: { isBuffet: true }
    });
    
    console.log('Menu Item:', item?.name);
    console.log('Buffet Categories:', buffetCategories.map(c => c.name));
    
    if (item && buffetCategories.length > 0) {
      // Assign first buffet category to the item
      await prisma.menuItemBuffetCategory.create({
        data: {
          menuItemId: item.id,
          buffetCategoryId: buffetCategories[0].id
        }
      });
      
      console.log(`✅ Assigned "${item.name}" to buffet "${buffetCategories[0].name}"`);
      
      // Verify the assignment
      const updated = await prisma.menuItem.findUnique({
        where: { id: item.id },
        include: {
          buffetCategories: {
            include: {
              buffetCategory: true
            }
          }
        }
      });
      
      console.log('Buffet assignments:', updated?.buffetCategories.map(bc => bc.buffetCategory.name));
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAssignBuffet();
