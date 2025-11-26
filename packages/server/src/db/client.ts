import { PrismaClient } from '@prisma/client';

// Initialize Prisma Client
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Handle graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

/**
 * Upsert a setting using raw SQL to avoid Prisma Client schema mismatch issues
 * This is necessary because the Setting table uses 'key' as PRIMARY KEY,
 * but the generated Prisma Client may expect an 'id' field.
 */
export async function upsertSetting(key: string, value: string): Promise<void> {
  const now = new Date().toISOString();
  // Use SQLite-compatible upsert syntax (INSERT OR REPLACE)
  await prisma.$executeRawUnsafe(`
    INSERT OR REPLACE INTO "Setting" ("key", "value", "updatedAt")
    VALUES (?, ?, ?)
  `, key, value, now);
}

export default prisma;
