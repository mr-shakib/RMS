const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Building PWA...');

const pwaDir = path.join(__dirname, '../../pwa');
const destDir = path.join(__dirname, '../public/pwa');

try {
  // Build the PWA
  execSync('npm run build', {
    cwd: pwaDir,
    stdio: 'inherit',
  });

  // Clean destination directory
  if (fs.existsSync(destDir)) {
    fs.removeSync(destDir);
  }

  // Copy built files to server's public directory
  const distDir = path.join(pwaDir, 'dist');
  if (fs.existsSync(distDir)) {
    fs.copySync(distDir, destDir);
    console.log('✅ PWA built and copied to public/pwa');
  } else {
    throw new Error('Build output not found');
  }
} catch (error) {
  console.error('❌ Failed to build PWA');
  process.exit(1);
}
