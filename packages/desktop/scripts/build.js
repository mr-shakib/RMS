#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Get environment from command line args or default to production
const env = process.argv[2] || 'production';
const validEnvs = ['development', 'staging', 'production'];

if (!validEnvs.includes(env)) {
  console.error(`Invalid environment: ${env}`);
  console.error(`Valid environments: ${validEnvs.join(', ')}`);
  process.exit(1);
}

console.log(`\n🔨 Building for ${env} environment...\n`);

// Copy environment file for desktop
const envFile = `.env.${env}`;
const envPath = path.join(__dirname, '..', envFile);
const targetPath = path.join(__dirname, '..', '.env.local');

if (fs.existsSync(envPath)) {
  fs.copyFileSync(envPath, targetPath);
  console.log(`✓ Copied ${envFile} to .env.local`);
} else {
  console.warn(`⚠ Warning: ${envFile} not found, using existing .env.local`);
}

// Copy environment file for server
const serverEnvFile = `.env.${env}`;
const serverEnvPath = path.join(__dirname, '../../../server', serverEnvFile);
const serverTargetPath = path.join(__dirname, '../../../server', '.env');

if (fs.existsSync(serverEnvPath)) {
  fs.copyFileSync(serverEnvPath, serverTargetPath);
  console.log(`✓ Copied server ${serverEnvFile} to .env`);
} else {
  console.warn(`⚠ Warning: server ${serverEnvFile} not found`);
}

// Build server first
console.log('\n📦 Building server...');
try {
  execSync('npm run build --workspace=packages/server', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '../../..')
  });
  console.log('✓ Server build complete');
} catch (error) {
  console.error('✗ Server build failed');
  process.exit(1);
}

// Build Next.js frontend
console.log('\n📦 Building Next.js frontend...');
try {
  execSync('npm run build:next', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('✓ Next.js build complete');
} catch (error) {
  console.error('✗ Next.js build failed');
  process.exit(1);
}

// Build Electron main process
console.log('\n📦 Building Electron main process...');
try {
  execSync('npm run build:electron', { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  console.log('✓ Electron build complete');
} catch (error) {
  console.error('✗ Electron build failed');
  process.exit(1);
}

console.log('\n✅ Build complete!\n');
