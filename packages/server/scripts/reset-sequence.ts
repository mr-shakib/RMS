
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔧 Resetting SQLite autoincrement sequence...');

    // Delete all tables first
    await prisma.table.deleteMany({});
    console.log('✅ Deleted all existing tables');

    // Reset the sqlite_sequence table which tracks autoincrement values
    // This is SQLite-specific
    await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence WHERE name='Table';`);
    console.log('✅ Reset autoincrement sequence for Table');

    console.log('✨ Database is now clean and ready for manual ID assignment');
}

main()
    .catch((e) => {
        console.error('❌ Error:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
