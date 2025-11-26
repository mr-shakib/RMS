#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n📦 Preparing Next.js for packaging...\n');

const desktopDir = path.join(__dirname, '..');
const nextDir = path.join(desktopDir, '.next');

// Verify Next.js build exists
if (!fs.existsSync(nextDir)) {
  console.error('✗ Next.js build not found. Run "npm run build:next" first.');
  process.exit(1);
}

console.log('✓ Next.js build verified');

// The .next directory is already in the correct location for packaging
// electron-builder will include it based on the files configuration in electron-builder.json

console.log('\n✅ Next.js prepared for packaging!\n');
