# Packaging Quick Start Guide

Quick reference for building and packaging the Restaurant Management System.

## Prerequisites

```bash
# Ensure you have Node.js 20+ and npm 10+
node --version
npm --version

# Install dependencies (from project root)
npm install
```

## Quick Commands

### First Time Setup

```bash
# Create placeholder icons (required before first package)
npm run icons:create
```

### Development

```bash
# Run in development mode
npm run dev
```

### Building

```bash
# Build for production (default)
npm run build

# Build for staging
npm run build:staging

# Build for development
npm run build:dev
```

### Packaging

```bash
# Package for current platform
npm run package:win      # Windows
npm run package:mac      # macOS
npm run package:linux    # Linux

# Package for all platforms
npm run package
```

### Version Management

```bash
# Bump version
npm run version:patch    # 1.0.0 -> 1.0.1
npm run version:minor    # 1.0.0 -> 1.1.0
npm run version:major    # 1.0.0 -> 2.0.0
```

## Output Location

Installers are created in: `packages/desktop/release/`

## First Time Setup

### 1. Add Application Icons

Place your icons in `packages/desktop/build/`:
- `icon.ico` (Windows)
- `icon.icns` (macOS)
- `icons/` directory (Linux)

See `build/ICONS_README.md` for details.

### 2. Configure Auto-Update (Optional)

Edit `packages/desktop/electron-builder.json`:

```json
"publish": {
  "provider": "github",
  "owner": "your-username",
  "repo": "restaurant-management-system"
}
```

### 3. Code Signing (Optional, for Production)

#### Windows
```bash
set CSC_LINK=path/to/certificate.pfx
set CSC_KEY_PASSWORD=your_password
```

#### macOS
```bash
export APPLE_ID=your@apple.id
export APPLE_ID_PASSWORD=app-specific-password
export APPLE_TEAM_ID=your_team_id
```

## Common Issues

### Build Fails
```bash
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Icons Not Showing
1. Check icons exist in `build/` directory
2. Verify paths in `electron-builder.json`
3. Rebuild: `npm run build && npm run package:win`

### Skip Code Signing (Testing)
```bash
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run package:win
```

## Testing the Package

1. Build and package:
   ```bash
   npm run package:win
   ```

2. Find installer in `packages/desktop/release/`

3. Install and test on a clean system

## Release Checklist

- [ ] Update version: `npm run version:patch`
- [ ] Update CHANGELOG.md
- [ ] Build: `npm run build`
- [ ] Package: `npm run package:win` (or your platform)
- [ ] Test installer on clean system
- [ ] Code sign (production only)
- [ ] Upload to distribution server
- [ ] Create GitHub release
- [ ] Notify users

## Need More Help?

See `BUILD.md` for comprehensive documentation.
