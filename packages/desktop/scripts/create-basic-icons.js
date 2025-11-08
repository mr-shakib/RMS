#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('\n🎨 Creating basic placeholder icon files for building...\n');

const buildDir = path.join(__dirname, '..', 'build');
const iconsDir = path.join(buildDir, 'icons');

// Ensure directories exist
if (!fs.existsSync(buildDir)) {
  fs.mkdirSync(buildDir, { recursive: true });
}
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Create a 256x256 ICO file (Windows)
// ICO file format: Header + Directory Entry + BMP data
const icoPath = path.join(buildDir, 'icon.ico');

// ICO Header (6 bytes)
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);      // Reserved (must be 0)
icoHeader.writeUInt16LE(1, 2);      // Type (1 = ICO)
icoHeader.writeUInt16LE(1, 4);      // Number of images

// ICO Directory Entry (16 bytes)
const size = 256;
const bmpDataSize = 40 + (size * size * 4); // Header + pixel data
const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(0, 0);          // Width (0 = 256)
icoEntry.writeUInt8(0, 1);          // Height (0 = 256)
icoEntry.writeUInt8(0, 2);          // Color palette
icoEntry.writeUInt8(0, 3);          // Reserved
icoEntry.writeUInt16LE(1, 4);       // Color planes
icoEntry.writeUInt16LE(32, 6);      // Bits per pixel
icoEntry.writeUInt32LE(bmpDataSize, 8);  // Size of image data
icoEntry.writeUInt32LE(22, 12);     // Offset to image data

// BMP Info Header (40 bytes)
const bmpHeader = Buffer.alloc(40);
bmpHeader.writeUInt32LE(40, 0);     // Header size
bmpHeader.writeInt32LE(size, 4);    // Width
bmpHeader.writeInt32LE(size * 2, 8); // Height (doubled for ICO)
bmpHeader.writeUInt16LE(1, 12);     // Planes
bmpHeader.writeUInt16LE(32, 14);    // Bits per pixel
bmpHeader.writeUInt32LE(0, 16);     // Compression
bmpHeader.writeUInt32LE(size * size * 4, 20); // Image size
bmpHeader.writeInt32LE(0, 24);      // X pixels per meter
bmpHeader.writeInt32LE(0, 28);      // Y pixels per meter
bmpHeader.writeUInt32LE(0, 32);     // Colors used
bmpHeader.writeUInt32LE(0, 36);     // Important colors

// Create pixel data (256x256 blue square with white "RMS" text area)
const pixelData = Buffer.alloc(size * size * 4);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    const idx = ((size - 1 - y) * size + x) * 4; // BMP is bottom-up
    
    // Create a simple design: blue background with lighter center
    const centerDist = Math.sqrt(Math.pow(x - size/2, 2) + Math.pow(y - size/2, 2));
    const isCenter = centerDist < size / 3;
    
    if (isCenter) {
      // Lighter blue in center
      pixelData[idx] = 0xFF;     // Blue
      pixelData[idx + 1] = 0x9F; // Green
      pixelData[idx + 2] = 0x5F; // Red
      pixelData[idx + 3] = 0xFF; // Alpha
    } else {
      // Darker blue on edges
      pixelData[idx] = 0xEB;     // Blue
      pixelData[idx + 1] = 0x63; // Green
      pixelData[idx + 2] = 0x25; // Red
      pixelData[idx + 3] = 0xFF; // Alpha
    }
  }
}

// Combine all parts
const icoData = Buffer.concat([icoHeader, icoEntry, bmpHeader, pixelData]);
fs.writeFileSync(icoPath, icoData);
console.log('✓ Created build/icon.ico (256x256 placeholder)');

// Create a minimal PNG for macOS (we'll use it as base)
// This is a 512x512 PNG with a blue background
const createPNG = (size) => {
  // PNG header
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0); // Length
  ihdr.write('IHDR', 4);
  ihdr.writeUInt32BE(size, 8);  // Width
  ihdr.writeUInt32BE(size, 12); // Height
  ihdr.writeUInt8(8, 16);  // Bit depth
  ihdr.writeUInt8(6, 17);  // Color type (RGBA)
  ihdr.writeUInt8(0, 18);  // Compression
  ihdr.writeUInt8(0, 19);  // Filter
  ihdr.writeUInt8(0, 20);  // Interlace
  
  // Simple CRC calculation (simplified)
  const crc = 0x00000000;
  ihdr.writeUInt32BE(crc, 21);
  
  // IEND chunk
  const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
  
  return Buffer.concat([signature, ihdr, iend]);
};

// For Linux, create basic PNG files
const sizes = [16, 32, 48, 64, 128, 256, 512];
sizes.forEach(size => {
  const pngPath = path.join(iconsDir, `${size}x${size}.png`);
  fs.writeFileSync(pngPath, createPNG(size));
});
console.log('✓ Created build/icons/*.png (placeholders for Linux)');

// For macOS, we need an ICNS file
// Creating a proper ICNS is complex, so we'll create a minimal one
// that electron-builder can work with
const icnsPath = path.join(buildDir, 'icon.icns');

// Minimal ICNS file structure
const icnsHeader = Buffer.from('icns', 'ascii');
const icnsSize = Buffer.alloc(4);
icnsSize.writeUInt32BE(8, 0); // Minimal size

const icnsData = Buffer.concat([icnsHeader, icnsSize]);
fs.writeFileSync(icnsPath, icnsData);
console.log('✓ Created build/icon.icns (placeholder)');

console.log('\n⚠️  Note: These are minimal placeholder icons for building.');
console.log('   For production, create proper icons using the tools in ICONS_README.md\n');
console.log('✅ You can now run: npm run package:win\n');
