import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setBuffetPrices() {
  try {
    console.log('🔧 Setting default buffet prices...\n');
    
    // Get all buffet categories
    const buffetCategories = await prisma.category.findMany({
      where: { isBuffet: true }
    });

    if (buffetCategories.length === 0) {
      console.log('No buffet categories found.');
      return;
    }

    console.log(`Found ${buffetCategories.length} buffet categories:\n`);

    // Set default prices based on category name
    for (const category of buffetCategories) {
      let defaultPrice = 25.00; // Default buffet price

      // Set specific prices based on name
      if (category.name.toLowerCase().includes('lunch')) {
        defaultPrice = 19.99;
      } else if (category.name.toLowerCase().includes('dinner')) {
        defaultPrice = 29.99;
      } else if (category.name.toLowerCase().includes('breakfast')) {
        defaultPrice = 15.99;
      }

      // Only update if price is null
      if (category.buffetPrice === null) {
        await prisma.category.update({
          where: { id: category.id },
          data: { buffetPrice: defaultPrice }
        });
        console.log(`✅ ${category.name}: Set price to $${defaultPrice.toFixed(2)}`);
      } else {
        console.log(`⏭️  ${category.name}: Already has price $${category.buffetPrice.toFixed(2)}`);
      }
    }

    console.log('\n✅ Buffet prices updated successfully!');
    console.log('\n📝 Note: You can edit these prices in the desktop app under Menu > Categories');
    
  } catch (error) {
    console.error('❌ Failed to set buffet prices:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setBuffetPrices();
