import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('🔄 Starting buffet category migration...\n');

  try {
    // Read and execute the migration SQL
    const migrationPath = path.join(__dirname, '../prisma/migrations/add_buffet_junction_table/migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
    
    // Split into individual statements and execute
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    console.log(`📝 Executing ${statements.length} SQL statements...\n`);

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      console.log(`[${i + 1}/${statements.length}] Executing statement...`);
      
      try {
        await prisma.$executeRawUnsafe(statement);
        console.log(`✅ Success\n`);
      } catch (error) {
        console.error(`❌ Failed:`, error);
        console.error(`Statement was: ${statement.substring(0, 100)}...\n`);
        throw error;
      }
    }

    // Verify migration
    console.log('🔍 Verifying migration...\n');
    
    const itemsWithBuffets = await prisma.$queryRaw`
      SELECT COUNT(*) as count 
      FROM MenuItemBuffetCategory
    ` as any[];
    
    console.log(`✅ Migration complete!`);
    console.log(`📊 Total buffet category assignments: ${itemsWithBuffets[0].count}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
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
