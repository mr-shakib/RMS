
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const menuItems = await prisma.menuItem.count();
    const categories = await prisma.category.count();
    const tables = await prisma.table.count();
    const orders = await prisma.order.count();

    console.log('\n📊 Database Status:');
    console.log('─────────────────────');
    console.log(`Tables:      ${tables}`);
    console.log(`Categories:  ${categories}`);
    console.log(`Menu Items:  ${menuItems}`);
    console.log(`Orders:      ${orders}`);
    console.log('─────────────────────\n');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => await prisma.$disconnect());
