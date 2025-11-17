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

// Ensure @prisma/client is in dependencies (needed for prisma generate)
if (!packageJson.dependencies) {
  packageJson.dependencies = {};
}
if (!packageJson.dependencies['@prisma/client']) {
  // Add @prisma/client if not present
  const fullPackageJson = JSON.parse(fs.readFileSync(path.join(serverDir, 'package.json'), 'utf8'));
  packageJson.dependencies['@prisma/client'] = fullPackageJson.dependencies['@prisma/client'] || fullPackageJson.devDependencies['@prisma/client'] || '^5.0.0';
}
// Also add prisma CLI for generating the client
if (!packageJson.dependencies['prisma']) {
  const fullPackageJson = JSON.parse(fs.readFileSync(path.join(serverDir, 'package.json'), 'utf8'));
  packageJson.dependencies['prisma'] = fullPackageJson.devDependencies['prisma'] || '^5.0.0';
}

// Track workspace dependencies to copy after npm install
const workspaceDeps = [];
if (packageJson.dependencies) {
  for (const [dep, version] of Object.entries(packageJson.dependencies)) {
    if (version === '*' || version.startsWith('workspace:')) {
      workspaceDeps.push(dep);
      // Remove from dependencies since we'll copy it manually
      delete packageJson.dependencies[dep];
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

// Copy workspace dependencies AFTER npm install
console.log('\n📦 Copying workspace dependencies...');
for (const dep of workspaceDeps) {
  const depPath = path.join(serverDir, '..', dep.replace('@rms/', ''));
  if (fs.existsSync(depPath)) {
    console.log(`  Copying ${dep}...`);
    const depTempDir = path.join(tempDir, 'node_modules', dep);
    fs.mkdirSync(depTempDir, { recursive: true });
    
    // Copy the workspace package
    const depPackageJson = JSON.parse(fs.readFileSync(path.join(depPath, 'package.json'), 'utf8'));
    fs.writeFileSync(
      path.join(depTempDir, 'package.json'),
      JSON.stringify(depPackageJson, null, 2)
    );
    
    // Copy dist folder (compiled output)
    if (fs.existsSync(path.join(depPath, 'dist'))) {
      fs.cpSync(path.join(depPath, 'dist'), path.join(depTempDir, 'dist'), { recursive: true });
    }
  }
}
console.log('✓ Workspace dependencies copied');

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
  
  // Generate Prisma client in the temp directory
  console.log('🔧 Generating Prisma client...');
  execSync('npx prisma generate', {
    cwd: tempDir,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: 'file:./dev.db' }
  });
  
  // Run database migrations
  console.log('🔧 Running database migrations (deploy mode)...');
  try {
    execSync('npx prisma migrate deploy', {
      cwd: tempDir,
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: 'file:./dev.db' }
    });
    console.log('✓ Database migrations ready');
  } catch (migError) {
    console.warn('⚠️ Warning: Migration deployment had issues. Database will be initialized on first run.');
    console.warn('   Migration error:', migError.message);
  }
  
  console.log('✓ Prisma client ready');
} catch (error) {
  console.error('✗ Failed to setup Prisma client:', error.message);
  process.exit(1);
}

console.log('\n✅ Server prepared for packaging!');
console.log(`📁 Production dependencies: ${tempDir}/node_modules\n`);
