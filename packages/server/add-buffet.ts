import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🍽️ Adding buffet category...');

  const buffetCategory = await prisma.category.upsert({
    where: { name: 'Lunch Buffet' },
    update: {},
    create: {
      name: 'Lunch Buffet',
      isBuffet: true,
      buffetPrice: 15.99,
      sortOrder: 5,
    },
  });
  console.log('✅ Buffet category created:', buffetCategory);

  console.log('🎉 Done!');
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
