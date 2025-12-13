const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cats = await prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  console.log('\n=== All Categories ===\n');
  cats.forEach(c => {
    console.log(`${c.isBuffet ? 'BUFFET' : 'REGULAR'}: ${c.name}`);
    console.log(`  ID: ${c.id}`);
    console.log('');
  });
  
  console.log('\n=== Buffet Categories ===\n');
  cats.filter(c => c.isBuffet).forEach(c => {
    console.log(`${c.name}: ${c.id}`);
  });
  
  await prisma.$disconnect();
}

main();
