const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBuffetData() {
  console.log('\n=== Checking Buffet Category Assignments ===\n');
  
  // Check all buffet category assignments
  const assignments = await prisma.menuItemBuffetCategory.findMany({
    include: {
      menuItem: { select: { name: true } },
      buffetCategory: { select: { name: true } }
    }
  });
  
  console.log(`Total buffet assignments: ${assignments.length}`);
  if (assignments.length > 0) {
    console.log('\nAssignments:');
    assignments.forEach(a => {
      console.log(`  - ${a.menuItem.name} → ${a.buffetCategory.name}`);
    });
  }
  
  console.log('\n=== Checking Menu Items with Buffet Includes ===\n');
  
  // Check what the API returns for Caesar Salad
  const caesarSalad = await prisma.menuItem.findFirst({
    where: { name: 'Caesar Salad' },
    include: {
      category: true,
      buffetCategories: {
        include: {
          buffetCategory: true
        }
      }
    }
  });
  
  if (caesarSalad) {
    console.log('Caesar Salad data:');
    console.log(JSON.stringify(caesarSalad, null, 2));
  } else {
    console.log('Caesar Salad not found!');
  }
  
  await prisma.$disconnect();
}

checkBuffetData().catch(console.error);
