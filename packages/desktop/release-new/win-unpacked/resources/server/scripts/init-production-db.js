#!/usr/bin/env node

/**
 * Initialize production database
 * This script ensures the database is set up correctly when running in production
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n🔧 Initializing production database...\n');

// Determine if we're in packaged app or development
const isPackaged = process.env.NODE_ENV === 'production' && process.resourcesPath;
const baseDir = isPackaged 
  ? path.join(process.resourcesPath, 'server')
  : __dirname;

const prismaDir = isPackaged
  ? path.join(baseDir, 'prisma')
  : path.join(__dirname, '../prisma');

const dbPath = path.join(prismaDir, 'prod.db');

console.log(`Base directory: ${baseDir}`);
console.log(`Prisma directory: ${prismaDir}`);
console.log(`Database path: ${dbPath}`);

// Ensure prisma directory exists
if (!fs.existsSync(prismaDir)) {
  console.log('Creating prisma directory...');
  fs.mkdirSync(prismaDir, { recursive: true });
}

// Check if database already exists
if (fs.existsSync(dbPath)) {
  console.log('✓ Database already exists');
  console.log('ℹ️  To reset database, delete:', dbPath);
  process.exit(0);
}

// Set environment variable for database URL
process.env.DATABASE_URL = `file:${dbPath}`;

console.log('\n📦 Running Prisma migrations...');

try {
  // Run migrations
  execSync('npx prisma migrate deploy', {
    cwd: isPackaged ? baseDir : path.join(__dirname, '..'),
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: `file:${dbPath}`
    }
  });
  
  console.log('\n✅ Database initialized successfully!');
} catch (error) {
  console.error('\n✗ Failed to initialize database:', error.message);
  process.exit(1);
}
