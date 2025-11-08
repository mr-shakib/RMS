const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔨 Building PWA...');

// Build PWA from root directory
const rootDir = path.join(__dirname, '../../..');
try {
  execSync('npm run build --workspace=packages/pwa', { 
    stdio: 'inherit',
    cwd: rootDir
  });
} catch (error) {
  console.error('❌ Failed to build PWA');
  process.exit(1);
}

console.log('📦 Copying PWA files to server public directory...');

// Create public directory if it doesn't exist
const publicDir = path.join(__dirname, '../public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Copy PWA dist files to server public directory
const pwaDistDir = path.join(__dirname, '../../pwa/dist');
const copyRecursive = (src, dest) => {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursive(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
};

try {
  // Clear public directory first
  if (fs.existsSync(publicDir)) {
    fs.rmSync(publicDir, { recursive: true, force: true });
  }
  fs.mkdirSync(publicDir, { recursive: true });

  // Copy all files from PWA dist to public
  copyRecursive(pwaDistDir, publicDir);

  console.log('✅ PWA files copied successfully!');
  console.log(`📁 PWA is now available at: ${publicDir}`);
} catch (error) {
  console.error('❌ Failed to copy PWA files:', error.message);
  process.exit(1);
}
