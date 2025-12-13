import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkDatabase() {
  const itemCount = await prisma.menuItem.count();
  console.log('Total menu items:', itemCount);
  
  if (itemCount > 0) {
    const items = await prisma.menuItem.findMany({
      include: {
        category: true,
        buffetCategories: {
          include: {
            buffetCategory: true,
          },
        },
      },
      take: 5,
    });
    
    console.log('\nFirst 5 items:');
    items.forEach(item => {
      console.log(`- ${item.name} (Category: ${item.category.name}, Buffets: ${item.buffetCategories.length})`);
    });
  }
  
  await prisma.$disconnect();
}

checkDatabase();
