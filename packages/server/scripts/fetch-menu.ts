
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    try {
        console.log('Fetching menu data...');
        const categories = await prisma.category.findMany({
            include: {
                menuItems: {
                    where: {
                        available: true
                    }
                },
            },
            orderBy: {
                sortOrder: 'asc',
            },
        });

        const outputPath = path.join(process.cwd(), 'menu-data.json');
        fs.writeFileSync(outputPath, JSON.stringify(categories, null, 2));

        console.log(`Successfully saved ${categories.length} categories to ${outputPath}`);

    } catch (error) {
        console.error('Error fetching menu:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
