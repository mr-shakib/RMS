# Production Build Guide

## Overview

This guide covers building the Restaurant Management System for production distribution.

## Prerequisites

Before building, ensure you have:
- Node.js >= 20.0.0
- npm >= 10.0.0
- All dependencies installed (`npm install` from project root)
- Windows: Windows 10+ for building Windows installers
- macOS: macOS 10.15+ with Xcode Command Line Tools for building macOS apps
- Linux: Standard build tools for building Linux packages

## Quick Build

### Build for Windows (Current Platform)

```bash
# From project root
npm run package:win
```

This will:
1. Build the server (Express API)
2. Build the desktop app (Next.js frontend + Electron)
3. Package everything into Windows installers

### Build for All Platforms

```bash
npm run package
```

**Note**: Building for macOS requires a Mac, and building DMGs requires code signing.

## Build Output

After successful build, find installers in:
```
packages/desktop/release/
```

Output files:
- **Windows NSIS Installer**: `Restaurant Management System-[version]-x64.exe`
- **Windows Portable**: `Restaurant Management System-[version]-portable.exe`
- **macOS DMG**: `Restaurant Management System-[version]-x64.dmg` (Intel)
- **macOS DMG**: `Restaurant Management System-[version]-arm64.dmg` (Apple Silicon)
- **Linux AppImage**: `Restaurant Management System-[version]-x64.AppImage`

## Step-by-Step Build Process

### 1. Clean Previous Builds (Optional)

```bash
npm run clean
```

### 2. Build Components

```bash
# Build everything
npm run build

# Or build individually:
npm run build:server    # API server
npm run build:desktop   # Desktop app (Next.js + Electron)
npm run build:pwa       # PWA (if needed)
```

### 3. Package for Distribution

```bash
# Package for Windows
npm run package:win

# Package for macOS
npm run package:mac

# Package for Linux
npm run package:linux
```

## Production Features

### What's Included

The packaged application includes:

1. **Embedded API Server**
   - Express.js backend
   - SQLite database
   - WebSocket support
   - All server dependencies

2. **Next.js Frontend Server**
   - React-based UI
   - All frontend dependencies
   - Optimized production build

3. **Electron Shell**
   - Desktop window management
   - System tray integration
   - Auto-start capabilities
   - Update mechanism (configurable)

### How It Works

When the user runs the installed app:

1. **Electron starts** and initializes
2. **API Server launches** on first available port (default: 5000)
   - Creates SQLite database in user data directory
   - Initializes with default admin user
   - Starts WebSocket server
3. **Next.js server launches** on port 3000
   - Serves the React frontend
4. **Electron window opens** and loads the Next.js app
5. **User can login** with default credentials (admin/admin123)

### Data Storage Locations

- **Windows**: `C:\Users\[Username]\AppData\Roaming\Restaurant Management System\`
- **macOS**: `~/Library/Application Support/Restaurant Management System/`
- **Linux**: `~/.config/Restaurant Management System/`

Database location:
- `[User Data Directory]/database/restaurant.db`

## Environment Configurations

### Production (.env.production)

```env
NODE_ENV=production
SERVER_PORT=5000
DATABASE_URL="file:./database/restaurant.db"
JWT_SECRET="[secure-random-string]"
```

### Staging (.env.staging)

For testing before production release.

```bash
npm run build:staging
npm run package:win:staging
```

### Development (.env.development)

Used only during development (`npm run dev`).

## Customization Before Building

### 1. Change App Name/Version

Edit `packages/desktop/package.json`:

```json
{
  "name": "@rms/desktop",
  "version": "1.0.0",
  "productName": "Your Restaurant Name POS"
}
```

### 2. Update Icons

Replace icons in `packages/desktop/build/`:
- `icon.ico` - Windows icon (256x256 or multi-size .ico)
- `icon.icns` - macOS icon
- `icons/` - Linux icons (various sizes)

See `packages/desktop/public/ICONS_README.md` for details.

### 3. Update License

Edit `packages/desktop/LICENSE.txt`

### 4. Configure Auto-Updates

Edit `packages/desktop/electron-builder.json`:

```json
{
  "publish": {
    "provider": "generic",
    "url": "https://your-server.com/updates"
  }
}
```

### 5. Change Default Credentials

Edit `packages/server/prisma/seed.ts` to change the default admin password.

**IMPORTANT**: Users should change the password after first login!

## Build Environments

### Building for Specific Environment

```bash
# Production (default)
node packages/desktop/scripts/build.js production
node packages/desktop/scripts/package.js win production

# Staging
node packages/desktop/scripts/build.js staging
node packages/desktop/scripts/package.js win staging

# Development (testing packaged app)
node packages/desktop/scripts/build.js development
node packages/desktop/scripts/package.js win development
```

## Troubleshooting

### Build Fails

1. **Clean and rebuild**:
   ```bash
   npm run clean
   npm install
   npm run package:win
   ```

2. **Check Node version**: `node --version` (should be >= 20.0.0)

3. **Clear electron-builder cache**:
   ```bash
   npx electron-builder clean
   ```

### Server Won't Start in Packaged App

- Check if port 5000 is available
- The app will try ports 5000-5009 automatically
- Check logs in user data directory

### Database Issues

- Database is created automatically on first run
- If corrupted, delete `restaurant.db` from user data directory
- App will recreate with default data

### Next.js Won't Start

- Ensure all Next.js dependencies are included in `electron-builder.json`
- Check that `.next` directory is built before packaging
- Verify port 3000 is available

## Code Signing (Optional)

### Windows

Install a code signing certificate and configure:

```json
// electron-builder.json
{
  "win": {
    "certificateFile": "path/to/cert.pfx",
    "certificatePassword": "cert-password"
  }
}
```

### macOS

Configure Apple Developer credentials:

```bash
export APPLE_ID="your@email.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="your-team-id"
```

## Distribution

### Windows

1. **NSIS Installer** (.exe)
   - Includes installation wizard
   - Creates Start Menu shortcuts
   - Adds to Programs & Features
   - Supports auto-updates

2. **Portable** (.exe)
   - Single executable
   - No installation required
   - Runs from any location

### macOS

1. **DMG** (Disk Image)
   - Drag-and-drop installation
   - Code signed and notarized (optional)

2. **ZIP** (Archive)
   - Alternative distribution format

### Linux

1. **AppImage**
   - Single file, no installation
   - Works on most distributions

2. **DEB** (Debian Package)
   - For Ubuntu/Debian systems
   - Integrates with system package manager

## Testing the Build

### Before Distribution

1. Install the packaged app on a clean system
2. Verify the app starts without errors
3. Test all main features:
   - Login with default credentials
   - Create orders
   - Manage tables
   - Update menu items
   - Generate reports
   - Print receipts (if printer connected)
4. Check data persistence (restart app, verify data is retained)
5. Test on different user accounts
6. Verify uninstall works correctly

### Automated Testing

Run tests before building:

```bash
# Run server tests
npm test --workspace=packages/server

# Run desktop tests
npm test --workspace=packages/desktop
```

## Version Management

### Update Version Numbers

```bash
# Patch version (1.0.0 -> 1.0.1)
npm run version:patch

# Minor version (1.0.0 -> 1.1.0)
npm run version:minor

# Major version (1.0.0 -> 2.0.0)
npm run version:major
```

This updates version in:
- `package.json`
- Installer file names
- Auto-update checks

## Performance Optimization

### Reduce Package Size

1. **Remove development dependencies** from production builds
2. **Minimize assets**: Compress images, remove unused fonts
3. **Use asar compression**: Already enabled in `electron-builder.json`
4. **Exclude unnecessary files**: Update `files` in `electron-builder.json`

### Improve Startup Time

1. **Lazy load modules** in server
2. **Optimize Next.js build**: Already configured in `next.config.js`
3. **Use SQLite for faster database access**

## Security Considerations

### Before Distribution

1. **Change JWT_SECRET**: Generate a secure random string
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```

2. **Update default password**: Change in seed file

3. **Enable HTTPS** (optional): For network access

4. **Code signing**: Sign executables to avoid security warnings

5. **Review permissions**: Check what the app can access

## Support & Maintenance

### Logs Location

- **Windows**: `%APPDATA%\Restaurant Management System\logs\`
- **macOS**: `~/Library/Logs/Restaurant Management System/`
- **Linux**: `~/.config/Restaurant Management System/logs/`

### Database Backup

Users can backup by copying:
- `[User Data]/database/restaurant.db`

### Updates

Configure auto-updates in `electron-builder.json` or distribute manually.

## Checklist Before Release

- [ ] Version number updated
- [ ] Icons customized
- [ ] License file updated
- [ ] Default credentials changed (documented)
- [ ] JWT secret is secure random string
- [ ] Environment files configured
- [ ] Build tested on clean system
- [ ] All features tested
- [ ] Documentation updated
- [ ] Release notes prepared
- [ ] Code signed (optional but recommended)
- [ ] Backup/restore tested

## Getting Help

- Check `TROUBLESHOOTING.md` for common issues
- Review `BUILD_TESTING.md` for detailed testing procedures
- See `PACKAGING_TROUBLESHOOTING.md` for packaging-specific issues

---

**Last Updated**: 2025-11-14
**Version**: 1.0.0
