const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔨 Building PWA...');

const pwaDir = path.join(__dirname, '../../pwa');
const destDir = path.join(__dirname, '../public');

try {
  // Build the PWA
  execSync('npm run build', {
    cwd: pwaDir,
    stdio: 'inherit',
  });

  // Ensure destination directory exists
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  // Clean destination directory (except uploads)
  const files = fs.readdirSync(destDir);
  for (const file of files) {
    if (file !== 'uploads') {
      fs.removeSync(path.join(destDir, file));
    }
  }

  // Copy built files to server's public directory
  const distDir = path.join(pwaDir, 'dist');
  if (fs.existsSync(distDir)) {
    fs.copySync(distDir, destDir);
    console.log('✅ PWA built and copied to public');
  } else {
    throw new Error('Build output not found');
  }
} catch (error) {
  console.error('❌ Failed to build PWA');
  process.exit(1);
}
