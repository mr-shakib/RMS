#!/usr/bin/env node

const builder = require('electron-builder');
const path = require('path');

const Platform = builder.Platform;

console.log('📦 Packaging application for Windows x64...\n');

// Package configuration
builder.build({
  targets: Platform.WINDOWS.createTarget(['nsis'], builder.Arch.x64),
  config: {
    extends: path.join(__dirname, '..', 'electron-builder.json'),
  },
  projectDir: path.join(__dirname, '..'),
})
  .then(() => {
    console.log('\n✅ Packaging completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Packaging failed:', error);
    process.exit(1);
  });
