
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Starting table cleanup...');

    // The 10 auto-created tables have names "Table 1" to "Table 10"
    // We need to find them and delete them if they exist and are creating conflicts
    // or just clean them up as requested.

    const tablesToDelete = [];
    for (let i = 1; i <= 10; i++) {
        tablesToDelete.push(`Table ${i}`);
    }

    console.log(`Checking for default tables: ${tablesToDelete.join(', ')}`);

    for (const tableName of tablesToDelete) {
        const table = await prisma.table.findUnique({
            where: { name: tableName },
            include: {
                orders: {
                    where: {
                        status: {
                            notIn: ['PAID', 'CANCELLED']
                        }
                    }
                }
            }
        });

        if (table) {
            if (table.orders.length > 0) {
                console.warn(`⚠️ Cannot delete "${tableName}" (ID: ${table.id}) because it has active orders.`);
            } else {
                // Delete orders first (PAID/CANCELLED ones)
                const orderCount = await prisma.order.count({ where: { tableId: table.id } });
                if (orderCount > 0) {
                    console.log(`  Deleting ${orderCount} inactive orders for ${tableName}...`);
                    await prisma.order.deleteMany({ where: { tableId: table.id } });
                }

                await prisma.table.delete({ where: { id: table.id } });
                console.log(`✅ Deleted "${tableName}" (ID: ${table.id})`);
            }
        } else {
            // console.log(`  "${tableName}" not found.`);
        }
    }

    // Also check for mismatch tables where ID != Name (if name is numeric)
    // This is a bit more aggressive but good for cleanup
    const allTables = await prisma.table.findMany();
    for (const table of allTables) {
        const nameAsId = parseInt(table.name, 10);
        if (!isNaN(nameAsId) && nameAsId !== table.id) {
            console.warn(`⚠️ Mismatch found: Table "${table.name}" has ID ${table.id}. This might need manual fix.`);
        }
    }

    console.log('✨ Cleanup finished.');
}

main()
    .catch((e) => {
        console.error('❌ Error during cleanup:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
