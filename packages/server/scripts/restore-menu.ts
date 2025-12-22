
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
    try {
        let dataPath = path.join(process.cwd(), 'menu-data.json');
        if (!fs.existsSync(dataPath)) {
            // Try looking up two directories (from packages/server to root)
            dataPath = path.join(process.cwd(), '../../menu-data.json');
        }

        if (!fs.existsSync(dataPath)) {
            throw new Error(`Data file not found at ${dataPath}`);
        }

        const rawData = fs.readFileSync(dataPath, 'utf-8');
        const categories = JSON.parse(rawData);

        console.log(`Read ${categories.length} categories from JSON.`);
        console.log('Starting restore...');

        for (const category of categories) {
            console.log(`Processing category: ${category.name}`);

            // Extract items and remove them from category object to avoid issues during creation
            const { menuItems, ...categoryData } = category;

            // 1. Create or Update Category
            // We rely on ID to keep consistency.
            await prisma.category.upsert({
                where: { id: categoryData.id },
                update: {
                    ...categoryData,
                    buffetMenuItems: undefined, // Avoid issues with this relation for now
                    orders: undefined,
                    printerMappings: undefined,
                },
                create: {
                    ...categoryData,
                    buffetMenuItems: undefined,
                    orders: undefined,
                    printerMappings: undefined,
                },
            });

            // 2. Process Menu Items
            if (menuItems && menuItems.length > 0) {
                for (const item of menuItems) {
                    // Remove relation fields if they exist in JSON but not needed for creation
                    const { buffetCategories, orderItems, category, ...itemData } = item;

                    await prisma.menuItem.upsert({
                        where: { id: itemData.id },
                        update: {
                            ...itemData,
                            categoryId: categoryData.id, // Ensure correct linking
                        },
                        create: {
                            ...itemData,
                            categoryId: categoryData.id,
                        }
                    });
                }
                console.log(`  - Restored ${menuItems.length} items.`);
            }
        }

        console.log('=====================');
        console.log('Restore completed successfully.');

    } catch (error) {
        console.error('Error restoring menu:', error);
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
}

main();
