#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n📝 Creating placeholder icon files...\n');

const buildDir = path.join(__dirname, '..', 'build');
const iconsDir = path.join(buildDir, 'icons');

// Create build directory if it doesn't exist
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
  console.log('✓ Created build directory');
}

// Create icons directory for Linux
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
  console.log('✓ Created icons directory');
}

// Create placeholder README files
const icoReadme = path.join(buildDir, 'icon.ico.README.txt');
const icnsReadme = path.join(buildDir, 'icon.icns.README.txt');
const linuxReadme = path.join(iconsDir, 'README.txt');

const icoContent = `PLACEHOLDER: Windows Icon Required

This is a placeholder. You need to create a proper icon.ico file.

Requirements:
- Format: ICO
- Sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256
- Location: packages/desktop/build/icon.ico

See build/ICONS_README.md for instructions on creating icons.

Online tool: https://icoconvert.com/
`;

const icnsContent = `PLACEHOLDER: macOS Icon Required

This is a placeholder. You need to create a proper icon.icns file.

Requirements:
- Format: ICNS
- Sizes: 16x16 to 1024x1024 (with @2x variants)
- Location: packages/desktop/build/icon.icns

See build/ICONS_README.md for instructions on creating icons.

On macOS, use: iconutil -c icns icon.iconset
`;

const linuxContent = `PLACEHOLDER: Linux Icons Required

This is a placeholder. You need to create PNG icon files.

Requirements:
- Format: PNG
- Sizes: 16x16, 32x32, 48x48, 64x64, 128x128, 256x256, 512x512
- Location: packages/desktop/build/icons/
- Naming: 16x16.png, 32x32.png, etc.

See build/ICONS_README.md for instructions on creating icons.
`;

fs.writeFileSync(icoReadme, icoContent);
console.log('✓ Created icon.ico.README.txt');

fs.writeFileSync(icnsReadme, icnsContent);
console.log('✓ Created icon.icns.README.txt');

fs.writeFileSync(linuxReadme, linuxContent);
console.log('✓ Created icons/README.txt');

// Create a simple SVG placeholder that can be converted to icons
const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="512" height="512" fill="#2563eb" rx="64"/>
  
  <!-- Fork and Knife Icon -->
  <g fill="white">
    <!-- Fork -->
    <path d="M180 120 L180 240 L180 360 L200 360 L200 240 L220 240 L220 120 M160 120 L160 200 L180 200 L180 120 M220 120 L220 200 L240 200 L240 120" stroke="white" stroke-width="4"/>
    
    <!-- Knife -->
    <path d="M300 120 L300 360 L320 360 L320 240 L340 240 L340 120 Z" stroke="white" stroke-width="4"/>
  </g>
  
  <!-- Text -->
  <text x="256" y="440" font-family="Arial, sans-serif" font-size="48" font-weight="bold" fill="white" text-anchor="middle">RMS</text>
</svg>`;

const svgPath = path.join(buildDir, 'icon-placeholder.svg');
fs.writeFileSync(svgPath, svgContent);
console.log('✓ Created icon-placeholder.svg');

console.log('\n⚠️  IMPORTANT: These are placeholder files!');
console.log('   You need to create actual icon files before packaging.');
console.log('   See build/ICONS_README.md for detailed instructions.\n');
console.log('   You can use icon-placeholder.svg as a starting point.\n');
