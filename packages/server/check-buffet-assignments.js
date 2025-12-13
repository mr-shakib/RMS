const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    const assignments = await prisma.menuItemBuffetCategory.findMany({
      take: 10,
      include: {
        menuItem: { select: { name: true } },
        buffetCategory: { select: { name: true } }
      }
    });
    
    console.log(`\n=== Buffet Category Assignments (${assignments.length} found) ===\n`);
    
    if (assignments.length === 0) {
      console.log('No buffet assignments found. Items need to be assigned to buffets.');
    } else {
      assignments.forEach(a => {
        console.log(`${a.menuItem.name} → ${a.buffetCategory.name}`);
      });
    }
    
    // Also check a sample menu item with includes
    const sampleItem = await prisma.menuItem.findFirst({
      include: {
        category: true,
        buffetCategories: {
          include: {
            buffetCategory: true
          }
        }
      }
    });
    
    console.log('\n=== Sample Menu Item Structure ===\n');
    console.log(JSON.stringify(sampleItem, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
