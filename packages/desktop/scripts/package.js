#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

// Get platform and environment from command line args
const platform = process.argv[2] || 'win';
const env = process.argv[3] || 'production';

const validPlatforms = ['win', 'mac', 'linux', 'all'];
const validEnvs = ['development', 'staging', 'production'];

if (!validPlatforms.includes(platform)) {
  console.error(`Invalid platform: ${platform}`);
  console.error(`Valid platforms: ${validPlatforms.join(', ')}`);
  process.exit(1);
}

if (!validEnvs.includes(env)) {
  console.error(`Invalid environment: ${env}`);
  console.error(`Valid environments: ${validEnvs.join(', ')}`);
  process.exit(1);
}

console.log(`\n📦 Packaging for ${platform} (${env} environment)...\n`);

// Run build script first
console.log('🔨 Running build...');
try {
  execSync(`node ${path.join(__dirname, 'build.js')} ${env}`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
} catch (error) {
  console.error('✗ Build failed');
  process.exit(1);
}

// Prepare server for packaging
console.log('\n📦 Preparing server for packaging...');
try {
  execSync(`node ${path.join(__dirname, 'prepare-server.js')}`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
} catch (error) {
  console.error('✗ Server preparation failed');
  process.exit(1);
}

// Prepare Next.js for packaging
console.log('\n📦 Preparing Next.js for packaging...');
try {
  execSync(`node ${path.join(__dirname, 'prepare-next.js')}`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
} catch (error) {
  console.error('✗ Next.js preparation failed');
  process.exit(1);
}

// Package with electron-builder
console.log('\n📦 Creating installer packages...');
try {
  let builderArgs = '';
  
  switch (platform) {
    case 'win':
      builderArgs = '--win';
      break;
    case 'mac':
      builderArgs = '--mac';
      break;
    case 'linux':
      builderArgs = '--linux';
      break;
    case 'all':
      builderArgs = '--win --mac --linux';
      break;
  }

  const outDir = `release/build-${Date.now()}`;
  execSync(`electron-builder ${builderArgs} --config electron-builder.json -c.directories.output=${outDir}`, { 
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ Packaging complete!');
  console.log(`\n📁 Output directory: packages/desktop/${outDir}\n`);
} catch (error) {
  console.error('✗ Packaging failed');
  process.exit(1);
}
