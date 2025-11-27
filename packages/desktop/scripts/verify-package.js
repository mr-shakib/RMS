#!/usr/bin/env node

/**
 * Verify Package Script
 * Checks if the packaged application has all required files and structure
 */

const fs = require('fs');
const path = require('path');

console.log('\n🔍 Verifying package structure...\n');

let errors = 0;
let warnings = 0;

function checkPath(filePath, description, required = true) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    console.log(`✓ ${description}: ${filePath}`);
    return true;
  } else {
    if (required) {
      console.error(`✗ MISSING ${description}: ${filePath}`);
      errors++;
    } else {
      console.warn(`⚠ Optional ${description} not found: ${filePath}`);
      warnings++;
    }
    return false;
  }
}

function checkDirectory(dirPath, description, required = true) {
  const exists = fs.existsSync(dirPath);
  if (exists && fs.statSync(dirPath).isDirectory()) {
    const contents = fs.readdirSync(dirPath);
    console.log(`✓ ${description}: ${dirPath} (${contents.length} items)`);
    return true;
  } else {
    if (required) {
      console.error(`✗ MISSING ${description}: ${dirPath}`);
      errors++;
    } else {
      console.warn(`⚠ Optional ${description} not found: ${dirPath}`);
      warnings++;
    }
    return false;
  }
}

// Base paths
const desktopDir = path.join(__dirname, '..');
const buildDir = path.join(desktopDir, 'dist', 'electron');
const nextDir = path.join(desktopDir, '.next');

console.log('📁 Checking build directories...\n');

// Check Electron build
checkPath(path.join(buildDir, 'main.js'), 'Electron main.js');
checkPath(path.join(buildDir, 'preload.js'), 'Electron preload.js');
checkPath(path.join(buildDir, 'serverLauncher.js'), 'Server launcher');
checkPath(path.join(buildDir, 'nextServer.js'), 'Next.js server launcher');

// Check Next.js standalone build
console.log('\n📁 Checking Next.js standalone build...\n');

checkDirectory(path.join(nextDir, 'standalone'), 'Standalone directory');

const standalonePaths = [
  path.join(nextDir, 'standalone', 'packages', 'desktop', 'server.js'),
  path.join(nextDir, 'standalone', 'server.js')
];

let serverJsFound = false;
for (const serverPath of standalonePaths) {
  if (checkPath(serverPath, 'Next.js server.js', false)) {
    serverJsFound = true;
    
    // Check for package.json near server.js (optional - Next.js standalone may not have it)
    const serverDir = path.dirname(serverPath);
    checkPath(path.join(serverDir, 'package.json'), 'package.json for Next.js', false);
    
    // Check for node_modules (optional - Next.js bundles dependencies)
    checkDirectory(path.join(serverDir, 'node_modules'), 'node_modules for Next.js', false);
    
    break;
  }
}

if (!serverJsFound) {
  console.error('\n✗ CRITICAL: server.js not found in any expected location!');
  errors++;
}

// Check static files
console.log('\n📁 Checking Next.js static files...\n');

checkDirectory(path.join(nextDir, 'static'), 'Static directory');

// Check server build
console.log('\n📁 Checking server build...\n');

const serverDir = path.join(desktopDir, '..', 'server');
checkDirectory(path.join(serverDir, 'dist'), 'Server dist directory');
checkPath(path.join(serverDir, 'dist', 'server', 'src', 'index.js'), 'Server index.js');
checkDirectory(path.join(serverDir, 'dist', 'server', 'public'), 'Server public directory (PWA)');

// Check environment files
console.log('\n📁 Checking environment configuration...\n');

checkPath(path.join(desktopDir, '.env.production'), 'Production env file');
checkPath(path.join(desktopDir, '.env.local'), '.env.local (build-time)');

// Read and verify environment variables
try {
  const envContent = fs.readFileSync(path.join(desktopDir, '.env.production'), 'utf8');
  console.log('\n📋 Production environment variables:');
  console.log(envContent);
  
  // Check for correct API URL
  if (envContent.includes('localhost:5000')) {
    console.log('✓ API URL correctly set to localhost:5000');
  } else if (envContent.includes('localhost:5001')) {
    console.warn('⚠ WARNING: API URL still set to localhost:5001, should be 5000!');
    warnings++;
  }
} catch (e) {
  console.error('✗ Could not read .env.production:', e.message);
  errors++;
}

// Check icons
console.log('\n📁 Checking icons...\n');

checkPath(path.join(desktopDir, 'build', 'icon.ico'), 'Windows icon', false);
checkPath(path.join(desktopDir, 'build', 'icon.icns'), 'macOS icon', false);

// Summary
console.log('\n' + '='.repeat(60));
console.log('📊 Verification Summary:');
console.log('='.repeat(60));

if (errors === 0 && warnings === 0) {
  console.log('✅ All checks passed! Package is ready.');
  process.exit(0);
} else {
  if (errors > 0) {
    console.error(`❌ ${errors} critical error(s) found!`);
  }
  if (warnings > 0) {
    console.warn(`⚠ ${warnings} warning(s) found.`);
  }
  
  if (errors > 0) {
    console.error('\n🛑 Package has critical issues and may not work correctly.');
    process.exit(1);
  } else {
    console.warn('\n⚠ Package has warnings but should work.');
    process.exit(0);
  }
}
