
import { PrismaClient } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const API_URL = 'http://localhost:5000/api';

async function main() {
    console.log('🧪 Verifying Table Creation Logic...');

    // 0. Ensure Admin user exists and get token (mock authentication or direct service call if easier)
    // For simplicity, we can use direct service call if we don't want to deal with login flow in script,
    // BUT we modified the CONTROLLER/SERVICE validation, so testing via API is better.
    // However, we need a token.

    // Let's rely on Prisma/Service direct calls for unit-ish testing since we changed the SERVICE.
    // Testing via API would be integration testing.

    // Test 1: Try to create a table with non-numeric name
    console.log('\nTest 1: Creating invalid table names...');
    try {
        // Need to import service from the build or use ts-node to run this script which imports src
        // Given the setup, let's just use axios if the server is running, or Prisma direct if not.
        // Since `npm run dev` is running, let's try to verify via DB inspection or trying to run a script that imports the service.

        // Using correct relative path from scripts/verify-table-logic.ts to src/services/tableService
        const { default: tableService } = await import('../src/services/tableService');

        try {
            await tableService.createTable({ name: "VIP Table" });
            console.error('❌ Failed: Should have rejected "VIP Table"');
        } catch (e: any) {
            if (e.message.includes('must be a positive integer')) {
                console.log('✅ Correctly rejected "VIP Table"');
            } else {
                console.error('❌ Rejected but with unexpected error:', e.message);
            }
        }

        // Test 2: Create a valid table "99"
        console.log('\nTest 2: Creating valid table "99"...');

        // Cleanup first just in case
        await prisma.table.deleteMany({ where: { id: 99 } }).catch(() => { });

        const newTable = await tableService.createTable({ name: "99" });
        console.log(`✅ Created table: Name="${newTable.name}", ID=${newTable.id}`);

        if (newTable.name === "99" && newTable.id === 99) {
            console.log('✅ ID matches Name');
        } else {
            console.error(`❌ Mismatch! Name="${newTable.name}", ID=${newTable.id}`);
        }

    } catch (e) {
        console.error('Test script error:', e);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
