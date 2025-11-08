#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('\n📦 Preparing server for packaging...\n');

const serverDir = path.join(__dirname, '../../server');
const tempDir = path.join(serverDir, 'temp-prod');

// Create temp directory
if (fs.existsSync(tempDir)) {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
fs.mkdirSync(tempDir, { recursive: true });

// Copy package.json
const packageJson = JSON.parse(fs.readFileSync(path.join(serverDir, 'package.json'), 'utf8'));
// Remove devDependencies for production install
delete packageJson.devDependencies;
delete packageJson.scripts;

// Replace workspace dependencies with file paths
if (packageJson.dependencies) {
  for (const [dep, version] of Object.entries(packageJson.dependencies)) {
    if (version === '*' || version.startsWith('workspace:')) {
      // This is a workspace dependency - copy it
      const depPath = path.join(serverDir, '..', dep.replace('@rms/', ''));
      if (fs.existsSync(depPath)) {
        console.log(`  Copying workspace dependency: ${dep}`);
        const depTempDir = path.join(tempDir, 'node_modules', dep);
        fs.mkdirSync(depTempDir, { recursive: true });
        
        // Copy the workspace package
        const depPackageJson = JSON.parse(fs.readFileSync(path.join(depPath, 'package.json'), 'utf8'));
        fs.writeFileSync(
          path.join(depTempDir, 'package.json'),
          JSON.stringify(depPackageJson, null, 2)
        );
        
        // Copy source files
        if (fs.existsSync(path.join(depPath, 'src'))) {
          fs.cpSync(path.join(depPath, 'src'), path.join(depTempDir, 'src'), { recursive: true });
        }
        if (fs.existsSync(path.join(depPath, 'dist'))) {
          fs.cpSync(path.join(depPath, 'dist'), path.join(depTempDir, 'dist'), { recursive: true });
        }
        if (fs.existsSync(path.join(depPath, 'index.ts'))) {
          fs.copyFileSync(path.join(depPath, 'index.ts'), path.join(depTempDir, 'index.ts'));
        }
        if (fs.existsSync(path.join(depPath, 'index.js'))) {
          fs.copyFileSync(path.join(depPath, 'index.js'), path.join(depTempDir, 'index.js'));
        }
        
        // Remove from dependencies since we copied it manually
        delete packageJson.dependencies[dep];
      }
    }
  }
}

fs.writeFileSync(
  path.join(tempDir, 'package.json'),
  JSON.stringify(packageJson, null, 2)
);

console.log('✓ Created production package.json');

// Install production dependencies
console.log('\n📥 Installing production dependencies...');
try {
  execSync('npm install --production --no-optional', {
    cwd: tempDir,
    stdio: 'inherit'
  });
  console.log('✓ Production dependencies installed');
} catch (error) {
  console.error('✗ Failed to install dependencies');
  process.exit(1);
}

// Copy Prisma generated client from server
console.log('\n🔧 Copying Prisma client...');
try {
  // Copy prisma schema
  const prismaDir = path.join(tempDir, 'prisma');
  fs.mkdirSync(prismaDir, { recursive: true });
  
  // Copy schema
  fs.copyFileSync(
    path.join(serverDir, 'prisma/schema.prisma'),
    path.join(prismaDir, 'schema.prisma')
  );
  
  // Copy migrations if they exist
  const migrationsDir = path.join(serverDir, 'prisma/migrations');
  if (fs.existsSync(migrationsDir)) {
    fs.cpSync(migrationsDir, path.join(prismaDir, 'migrations'), { recursive: true });
  }
  
  // Copy generated Prisma client from server's node_modules
  const serverPrismaClient = path.join(serverDir, 'node_modules/.prisma');
  const serverPrismaTypes = path.join(serverDir, 'node_modules/@prisma');
  
  if (fs.existsSync(serverPrismaClient)) {
    const tempPrismaClient = path.join(tempDir, 'node_modules/.prisma');
    fs.mkdirSync(tempPrismaClient, { recursive: true });
    fs.cpSync(serverPrismaClient, tempPrismaClient, { recursive: true });
    console.log('✓ Copied .prisma client');
  }
  
  if (fs.existsSync(serverPrismaTypes)) {
    const tempPrismaTypes = path.join(tempDir, 'node_modules/@prisma');
    fs.mkdirSync(path.dirname(tempPrismaTypes), { recursive: true });
    fs.cpSync(serverPrismaTypes, tempPrismaTypes, { recursive: true });
    console.log('✓ Copied @prisma types');
  }
  
  console.log('✓ Prisma client ready');
} catch (error) {
  console.error('✗ Failed to copy Prisma client:', error.message);
  process.exit(1);
}

console.log('\n✅ Server prepared for packaging!');
console.log(`📁 Production dependencies: ${tempDir}/node_modules\n`);
