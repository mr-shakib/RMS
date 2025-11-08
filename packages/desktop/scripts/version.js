#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get version bump type from command line args
const bumpType = process.argv[2] || 'patch';
const validTypes = ['major', 'minor', 'patch'];

if (!validTypes.includes(bumpType)) {
  console.error(`Invalid bump type: ${bumpType}`);
  console.error(`Valid types: ${validTypes.join(', ')}`);
  process.exit(1);
}

console.log(`\n📝 Bumping ${bumpType} version...\n`);

// Read current version from package.json
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const currentVersion = packageJson.version;

// Parse version
const [major, minor, patch] = currentVersion.split('.').map(Number);

// Calculate new version
let newVersion;
switch (bumpType) {
  case 'major':
    newVersion = `${major + 1}.0.0`;
    break;
  case 'minor':
    newVersion = `${major}.${minor + 1}.0`;
    break;
  case 'patch':
    newVersion = `${major}.${minor}.${patch + 1}`;
    break;
}

console.log(`Current version: ${currentVersion}`);
console.log(`New version: ${newVersion}`);

// Update package.json
packageJson.version = newVersion;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
console.log('✓ Updated package.json');

// Update root package.json
const rootPackageJsonPath = path.join(__dirname, '../../../package.json');
const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
rootPackageJson.version = newVersion;
fs.writeFileSync(rootPackageJsonPath, JSON.stringify(rootPackageJson, null, 2) + '\n');
console.log('✓ Updated root package.json');

// Update CHANGELOG.md
const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md');
const date = new Date().toISOString().split('T')[0];
let changelog = '';

if (fs.existsSync(changelogPath)) {
  changelog = fs.readFileSync(changelogPath, 'utf8');
}

const newEntry = `## [${newVersion}] - ${date}

### Added
- 

### Changed
- 

### Fixed
- 

`;

if (changelog) {
  // Insert after the first heading
  const lines = changelog.split('\n');
  const insertIndex = lines.findIndex(line => line.startsWith('## '));
  if (insertIndex !== -1) {
    lines.splice(insertIndex, 0, newEntry);
    changelog = lines.join('\n');
  } else {
    changelog = newEntry + changelog;
  }
} else {
  changelog = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

${newEntry}`;
}

fs.writeFileSync(changelogPath, changelog);
console.log('✓ Updated CHANGELOG.md');

console.log('\n✅ Version bump complete!');
console.log(`\n📝 Don't forget to update the CHANGELOG.md with your changes!\n`);
