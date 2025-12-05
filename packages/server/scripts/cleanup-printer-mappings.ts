import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Find all printer category mappings
  const mappings = await (prisma as any).printerCategory?.findMany({
    include: {
      category: true,
    },
  }) || [];

  let deletedCount = 0;

  for (const mapping of mappings) {
    if (!mapping.category) {
      console.log(`Deleting orphaned mapping: ${mapping.id} (categoryId: ${mapping.categoryId})`);
      await (prisma as any).printerCategory?.delete({
        where: { id: mapping.id },
      });
      deletedCount++;
    }
  }

  console.log(`✅ Cleaned up ${deletedCount} orphaned printer category mappings`);
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
