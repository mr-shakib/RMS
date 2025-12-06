const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting comprehensive build and package process...\n');

// Helper function to run commands
function runCommand(command, description) {
  console.log(`\n📦 ${description}...`);
  console.log(`Running: ${command}\n`);
  try {
    execSync(command, { stdio: 'inherit', cwd: __dirname + '/..' });
    console.log(`✅ ${description} completed successfully\n`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed!`);
    return false;
  }
}

// Step 1: Clean previous builds
console.log('🧹 Cleaning previous builds...');
const dirsToClean = ['.next', 'dist', 'release', 'temp-prod'];
dirsToClean.forEach(dir => {
  const dirPath = path.join(__dirname, '..', dir);
  if (fs.existsSync(dirPath)) {
    console.log(`Removing ${dir}...`);
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
});
console.log('✅ Cleanup completed\n');

// Step 2: Build Next.js
if (!runCommand('npm run build:next', 'Building Next.js application')) {
  process.exit(1);
}

// Step 3: Build Electron
if (!runCommand('npm run build:electron', 'Building Electron main process')) {
  process.exit(1);
}

// Step 4: Verify builds
console.log('\n🔍 Verifying builds...');
const requiredPaths = [
  '.next/standalone',
  '.next/static',
  'dist/electron/main.js',
  'dist/electron/preload.js',
];

let allPathsExist = true;
requiredPaths.forEach(p => {
  const fullPath = path.join(__dirname, '..', p);
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${p} exists`);
  } else {
    console.error(`❌ ${p} missing!`);
    allPathsExist = false;
  }
});

if (!allPathsExist) {
  console.error('\n❌ Build verification failed!');
  process.exit(1);
}
console.log('✅ All required files present\n');

// Step 5: Package application
if (!runCommand('npm run package', 'Packaging application with electron-builder')) {
  process.exit(1);
}

// Step 6: Verify package output
console.log('\n🔍 Verifying package output...');
const releaseDir = path.join(__dirname, '..', 'release');
if (fs.existsSync(releaseDir)) {
  const files = fs.readdirSync(releaseDir);
  console.log('\n📦 Release artifacts:');
  files.forEach(file => {
    const stats = fs.statSync(path.join(releaseDir, file));
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`  - ${file} (${sizeMB} MB)`);
  });
  console.log('\n✅ Package verification completed\n');
} else {
  console.error('❌ Release directory not found!');
  process.exit(1);
}

console.log('🎉 Build and package process completed successfully!');
console.log(`📂 Output location: ${releaseDir}\n`);
