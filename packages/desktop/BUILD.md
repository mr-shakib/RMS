# Build and Packaging Guide

This guide explains how to build and package the Restaurant Management System for distribution.

## Prerequisites

### Required Software

- **Node.js** 20.x or higher
- **npm** 10.x or higher
- **Git** (for version control)

### Platform-Specific Requirements

#### Windows
- Windows 10 or higher
- No additional requirements for building Windows installers

#### macOS
- macOS 10.13 or higher
- Xcode Command Line Tools: `xcode-select --install`
- For code signing: Apple Developer account and certificates

#### Linux
- Ubuntu 18.04 or higher (or equivalent)
- Required packages: `sudo apt-get install -y rpm`

## Environment Setup

### 1. Install Dependencies

```bash
# From project root
npm install
```

### 2. Configure Environment

The application supports three environments:

- **development** - For local development and testing
- **staging** - For pre-production testing
- **production** - For production releases

Environment files are located in `packages/desktop/`:
- `.env.development`
- `.env.staging`
- `.env.production`

Edit these files to configure API URLs, ports, and other settings.

## Building the Application

### Build for Production

```bash
# Build all components for production
npm run build

# Or from desktop package
cd packages/desktop
npm run build
```

### Build for Specific Environments

```bash
# Development build
npm run build:dev

# Staging build
npm run build:staging

# Production build (default)
npm run build
```

### What Gets Built

1. **Server** (`packages/server/dist/`)
   - Express API server
   - Prisma client
   - Database migrations

2. **Desktop Frontend** (`packages/desktop/.next/`)
   - Next.js production build
   - Optimized React components
   - Static assets

3. **Electron Main Process** (`packages/desktop/dist/electron/`)
   - Main process code
   - Server launcher
   - Preload scripts

## Packaging for Distribution

### Package for All Platforms

```bash
# Package for Windows, macOS, and Linux
npm run package

# Or from desktop package
cd packages/desktop
npm run package
```

### Package for Specific Platforms

```bash
# Windows only
npm run package:win

# macOS only
npm run package:mac

# Linux only
npm run package:linux
```

### Package for Staging

```bash
# Windows staging build
npm run package:win:staging

# macOS staging build
npm run package:mac:staging
```

### Output Location

Packaged installers are created in `packages/desktop/release/`:

```
release/
├── Restaurant Management System-1.0.0-x64.exe          # Windows installer
├── Restaurant Management System-1.0.0-portable.exe     # Windows portable
├── Restaurant Management System-1.0.0-x64.dmg          # macOS installer
├── Restaurant Management System-1.0.0-arm64.dmg        # macOS Apple Silicon
├── Restaurant Management System-1.0.0-x64.AppImage     # Linux AppImage
└── Restaurant Management System-1.0.0-x64.deb          # Linux Debian package
```

## Version Management

### Bump Version

```bash
# Patch version (1.0.0 -> 1.0.1)
npm run version:patch

# Minor version (1.0.0 -> 1.1.0)
npm run version:minor

# Major version (1.0.0 -> 2.0.0)
npm run version:major
```

This will:
1. Update version in `package.json`
2. Update root `package.json`
3. Add entry to `CHANGELOG.md`

### Update Changelog

After bumping version, edit `CHANGELOG.md` to document your changes:

```markdown
## [1.0.1] - 2024-01-20

### Added
- New feature description

### Changed
- Modified feature description

### Fixed
- Bug fix description
```

## Code Signing

### Windows Code Signing

1. Obtain a code signing certificate (.pfx file)
2. Set environment variables:

```bash
set CSC_LINK=path/to/certificate.pfx
set CSC_KEY_PASSWORD=your_certificate_password
```

3. Package the application:

```bash
npm run package:win
```

### macOS Code Signing and Notarization

1. Obtain Apple Developer certificates
2. Set environment variables:

```bash
export APPLE_ID=your@apple.id
export APPLE_ID_PASSWORD=app-specific-password
export APPLE_TEAM_ID=your_team_id
export CSC_LINK=path/to/certificate.p12
export CSC_KEY_PASSWORD=your_certificate_password
```

3. Package the application:

```bash
npm run package:mac
```

The notarization process will run automatically via `scripts/notarize.js`.

### Skip Code Signing

To build without code signing (for testing):

```bash
# Set environment variable
export CSC_IDENTITY_AUTO_DISCOVERY=false

# Then package
npm run package:win
```

## Auto-Update Configuration

### Setup Update Server

1. Edit `electron-builder.json`:

```json
"publish": {
  "provider": "generic",
  "url": "https://your-update-server.com/releases"
}
```

2. Supported providers:
   - `generic` - Custom server
   - `github` - GitHub Releases
   - `s3` - Amazon S3
   - `spaces` - DigitalOcean Spaces

### GitHub Releases Example

```json
"publish": {
  "provider": "github",
  "owner": "your-username",
  "repo": "restaurant-management-system"
}
```

### Publish Release

```bash
# Build and publish
npm run package -- --publish always
```

## Application Icons

### Icon Requirements

Place your icons in `packages/desktop/build/`:

- **Windows**: `icon.ico` (256x256, 128x128, 64x64, 48x48, 32x32, 16x16)
- **macOS**: `icon.icns` (1024x1024, 512x512, 256x256, 128x128, 64x64, 32x32, 16x16)
- **Linux**: `icons/` directory with PNG files

See `build/ICONS_README.md` for detailed instructions.

## Testing the Build

### Test Locally

```bash
# Build the application
npm run build

# Run the built application
cd packages/desktop
npm start
```

### Test Installer

1. Package the application:
   ```bash
   npm run package:win  # or package:mac
   ```

2. Install from `packages/desktop/release/`

3. Test the installed application:
   - Launch the application
   - Verify all features work
   - Check auto-update functionality
   - Test on clean system (no dev dependencies)

## Troubleshooting

### Build Fails

**Problem**: Build fails with "Module not found"

**Solution**: 
```bash
# Clean and reinstall
npm run clean
rm -rf node_modules package-lock.json
npm install
```

### Packaging Fails

**Problem**: electron-builder fails with "Cannot find module"

**Solution**: Ensure all dependencies are in `dependencies`, not `devDependencies`

### Icons Not Showing

**Problem**: Application shows default Electron icon

**Solution**: 
1. Verify icon files exist in `build/` directory
2. Check icon paths in `electron-builder.json`
3. Rebuild the application

### macOS Notarization Fails

**Problem**: Notarization fails or times out

**Solution**:
1. Verify Apple ID credentials are correct
2. Check that app-specific password is used (not regular password)
3. Ensure certificates are valid and not expired
4. Try again - Apple's servers can be slow

### Windows Installer Issues

**Problem**: Windows Defender flags the installer

**Solution**: 
1. Code sign the application with a valid certificate
2. Submit to Microsoft for SmartScreen reputation building
3. Users may need to click "More info" → "Run anyway"

## CI/CD Integration

### GitHub Actions Example

Create `.github/workflows/build.yml`:

```yaml
name: Build and Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [windows-latest, macos-latest, ubuntu-latest]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm install
      
      - name: Build application
        run: npm run build
      
      - name: Package application
        run: npm run package
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Upload artifacts
        uses: actions/upload-artifact@v3
        with:
          name: ${{ matrix.os }}-installer
          path: packages/desktop/release/*
```

## Distribution Checklist

Before releasing:

- [ ] Update version number (`npm run version:patch/minor/major`)
- [ ] Update CHANGELOG.md with all changes
- [ ] Test on clean system (no dev environment)
- [ ] Verify all features work in packaged app
- [ ] Test auto-update functionality
- [ ] Code sign the application (production only)
- [ ] Test installer on target platforms
- [ ] Create release notes
- [ ] Tag the release in Git
- [ ] Upload to distribution server
- [ ] Update documentation if needed
- [ ] Notify users of new release

## Support

For build issues or questions:
- Check the troubleshooting section above
- Review electron-builder documentation: https://www.electron.build/
- Open an issue on GitHub
- Contact: support@rms-system.com
