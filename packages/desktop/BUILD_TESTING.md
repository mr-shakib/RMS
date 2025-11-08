# Build Testing Guide

This guide helps you test the build and packaging process to ensure everything works correctly before distribution.

## Pre-Build Testing

### 1. Verify Dependencies

```bash
# Check Node.js version (should be 20+)
node --version

# Check npm version (should be 10+)
npm --version

# Verify all dependencies are installed
npm install
```

### 2. Check Environment Files

Verify environment files exist:
- `packages/desktop/.env.development`
- `packages/desktop/.env.staging`
- `packages/desktop/.env.production`

### 3. Verify Icons

Check that icon files exist in `packages/desktop/build/`:
- `icon.ico` (Windows)
- `icon.icns` (macOS)
- `icons/` directory with PNG files (Linux)

If icons don't exist, create placeholders:
```bash
cd packages/desktop
npm run icons:placeholder
```

## Build Testing

### Test Development Build

```bash
# Build for development
npm run build:dev

# Verify output
ls packages/desktop/dist/electron/
ls packages/desktop/.next/

# Test the build
cd packages/desktop
npm start
```

**Verify:**
- [ ] Application launches
- [ ] Server starts on port 5000
- [ ] Frontend loads correctly
- [ ] Can log in
- [ ] All pages accessible

### Test Staging Build

```bash
# Build for staging
npm run build:staging

# Test the build
cd packages/desktop
npm start
```

**Verify:**
- [ ] Uses staging configuration
- [ ] Server starts on staging port
- [ ] All features work

### Test Production Build

```bash
# Build for production
npm run build

# Test the build
cd packages/desktop
npm start
```

**Verify:**
- [ ] Optimized build (smaller size)
- [ ] No console warnings
- [ ] All features work
- [ ] Performance is good

## Package Testing

### Test Windows Package

```bash
# Package for Windows
npm run package:win

# Check output
ls packages/desktop/release/
```

**Expected files:**
- `Restaurant Management System-1.0.0-x64.exe` (NSIS installer)
- `Restaurant Management System-1.0.0-ia32.exe` (32-bit installer)
- `Restaurant Management System-1.0.0-portable.exe` (Portable version)

**Test installer:**
1. Run the NSIS installer
2. Follow installation wizard
3. Choose installation directory
4. Complete installation
5. Launch from Start Menu
6. Test all features

**Test portable version:**
1. Run the portable .exe
2. Verify it runs without installation
3. Test all features
4. Check that data is stored in app directory

### Test macOS Package

```bash
# Package for macOS
npm run package:mac

# Check output
ls packages/desktop/release/
```

**Expected files:**
- `Restaurant Management System-1.0.0-x64.dmg` (Intel)
- `Restaurant Management System-1.0.0-arm64.dmg` (Apple Silicon)
- `Restaurant Management System-1.0.0-x64.zip`
- `Restaurant Management System-1.0.0-arm64.zip`

**Test DMG:**
1. Open the DMG file
2. Drag app to Applications
3. Launch from Applications
4. Test all features
5. Check for Gatekeeper issues

**Test on both architectures:**
- Intel Mac (x64)
- Apple Silicon Mac (arm64)

### Test Linux Package

```bash
# Package for Linux
npm run package:linux

# Check output
ls packages/desktop/release/
```

**Expected files:**
- `Restaurant Management System-1.0.0-x64.AppImage`
- `Restaurant Management System-1.0.0-x64.deb`

**Test AppImage:**
```bash
chmod +x Restaurant-Management-System-1.0.0-x64.AppImage
./Restaurant-Management-System-1.0.0-x64.AppImage
```

**Test DEB package:**
```bash
sudo dpkg -i Restaurant-Management-System-1.0.0-x64.deb
restaurant-management-system
```

## Functional Testing

### Core Features Test

After installing, test these features:

#### 1. First Launch
- [ ] Setup wizard appears
- [ ] Can configure business info
- [ ] Can create admin user
- [ ] Can set up tables
- [ ] Can configure printer
- [ ] Setup completes successfully

#### 2. Authentication
- [ ] Can log in with admin user
- [ ] Can log out
- [ ] Invalid credentials rejected
- [ ] Session persists on restart

#### 3. Dashboard
- [ ] Metrics display correctly
- [ ] Charts render
- [ ] Real-time updates work

#### 4. Orders
- [ ] Can create new order
- [ ] Can view order details
- [ ] Can update order status
- [ ] Can cancel order
- [ ] Real-time updates work

#### 5. Tables
- [ ] Can view all tables
- [ ] Can create new table
- [ ] Can edit table
- [ ] Can delete table
- [ ] QR codes generate correctly

#### 6. Menu
- [ ] Can view menu items
- [ ] Can create menu item
- [ ] Can edit menu item
- [ ] Can delete menu item
- [ ] Can toggle availability

#### 7. Billing/POS
- [ ] Can view unpaid orders
- [ ] Can apply discounts
- [ ] Can process payment
- [ ] Receipt prints (if printer configured)

#### 8. Kitchen Display
- [ ] Orders appear in real-time
- [ ] Can update order status
- [ ] Kitchen tickets print

#### 9. Settings
- [ ] Can update business info
- [ ] Can configure printer
- [ ] Can change theme
- [ ] Can backup database
- [ ] Can restore database

#### 10. PWA Access
- [ ] Can access PWA from LAN IP
- [ ] Can scan QR code
- [ ] Can browse menu
- [ ] Can place order
- [ ] Order appears in desktop app

### Server Testing

#### 1. Server Startup
- [ ] Server starts automatically
- [ ] Correct port is used
- [ ] Database initializes
- [ ] Seed data loads (first run)

#### 2. API Endpoints
- [ ] Authentication endpoints work
- [ ] Order endpoints work
- [ ] Menu endpoints work
- [ ] Table endpoints work
- [ ] Payment endpoints work
- [ ] Settings endpoints work

#### 3. WebSocket
- [ ] WebSocket connects
- [ ] Real-time updates work
- [ ] Reconnection works
- [ ] Multiple clients supported

### Performance Testing

#### 1. Startup Time
- [ ] Application launches in < 5 seconds
- [ ] Server ready in < 3 seconds
- [ ] Frontend loads in < 2 seconds

#### 2. Response Time
- [ ] API responses < 200ms
- [ ] WebSocket messages < 100ms
- [ ] Page navigation instant

#### 3. Resource Usage
- [ ] Memory usage < 500MB
- [ ] CPU usage < 10% idle
- [ ] Disk usage reasonable

### Error Handling Testing

#### 1. Network Errors
- [ ] Handles server connection failure
- [ ] Handles API errors gracefully
- [ ] Shows user-friendly messages

#### 2. Database Errors
- [ ] Handles database connection failure
- [ ] Handles query errors
- [ ] Data integrity maintained

#### 3. Printer Errors
- [ ] Handles printer connection failure
- [ ] Handles print job errors
- [ ] Offers retry option

## Platform-Specific Testing

### Windows Testing

**Test on:**
- [ ] Windows 10 (64-bit)
- [ ] Windows 11 (64-bit)
- [ ] Windows 10 (32-bit) - if supporting

**Check:**
- [ ] Installer works
- [ ] Desktop shortcut created
- [ ] Start menu entry created
- [ ] Uninstaller works
- [ ] Windows Defender doesn't flag
- [ ] Auto-update works

### macOS Testing

**Test on:**
- [ ] macOS 10.13 (High Sierra)
- [ ] macOS 12 (Monterey)
- [ ] macOS 13+ (Ventura/Sonoma)
- [ ] Intel Mac
- [ ] Apple Silicon Mac

**Check:**
- [ ] DMG opens correctly
- [ ] App installs to Applications
- [ ] Gatekeeper allows launch
- [ ] Notarization successful (if signed)
- [ ] Auto-update works

### Linux Testing

**Test on:**
- [ ] Ubuntu 20.04
- [ ] Ubuntu 22.04
- [ ] Debian 11
- [ ] Fedora (latest)

**Check:**
- [ ] AppImage runs
- [ ] DEB package installs
- [ ] Desktop entry created
- [ ] Permissions correct
- [ ] Auto-update works

## Auto-Update Testing

### 1. Setup Update Server

Configure update server in `electron-builder.json`:
```json
"publish": {
  "provider": "generic",
  "url": "http://localhost:8080/releases"
}
```

### 2. Create Test Releases

```bash
# Build version 1.0.0
npm run version:patch
npm run package:win

# Build version 1.0.1
npm run version:patch
npm run package:win
```

### 3. Test Update Flow

1. Install version 1.0.0
2. Start local update server
3. Launch application
4. Check for updates
5. Download and install update
6. Verify version 1.0.1 installed

**Verify:**
- [ ] Update notification appears
- [ ] Download progress shown
- [ ] Update installs correctly
- [ ] Application restarts
- [ ] Data preserved

## Security Testing

### 1. Code Signing

**Windows:**
- [ ] Installer is signed
- [ ] SmartScreen doesn't warn
- [ ] Signature verifies

**macOS:**
- [ ] App is signed
- [ ] App is notarized
- [ ] Gatekeeper allows launch
- [ ] Signature verifies

### 2. Permissions

- [ ] App requests only needed permissions
- [ ] File access restricted
- [ ] Network access appropriate

### 3. Data Security

- [ ] Passwords are hashed
- [ ] JWT tokens secure
- [ ] Database encrypted (if configured)
- [ ] No sensitive data in logs

## Regression Testing

After each build, verify:

- [ ] No features broken
- [ ] No performance degradation
- [ ] No new errors in console
- [ ] All tests pass
- [ ] Documentation up to date

## Clean System Testing

**Critical:** Test on a clean system without development tools:

1. Use a VM or clean machine
2. No Node.js installed
3. No development tools
4. Fresh OS installation

**Verify:**
- [ ] Installer runs
- [ ] Application launches
- [ ] All features work
- [ ] No missing dependencies
- [ ] No errors

## Test Report Template

```markdown
# Build Test Report

**Version:** 1.0.0
**Date:** 2024-01-15
**Tester:** [Name]
**Platform:** Windows 11 / macOS 13 / Ubuntu 22.04

## Build Information
- Build time: [time]
- Package size: [size]
- Build environment: [dev/staging/production]

## Test Results

### Installation
- [ ] Pass / [ ] Fail - Installer runs
- [ ] Pass / [ ] Fail - Application installs
- [ ] Pass / [ ] Fail - Shortcuts created

### Functionality
- [ ] Pass / [ ] Fail - Authentication
- [ ] Pass / [ ] Fail - Orders
- [ ] Pass / [ ] Fail - Tables
- [ ] Pass / [ ] Fail - Menu
- [ ] Pass / [ ] Fail - Billing
- [ ] Pass / [ ] Fail - KDS
- [ ] Pass / [ ] Fail - Settings
- [ ] Pass / [ ] Fail - PWA

### Performance
- Startup time: [seconds]
- Memory usage: [MB]
- CPU usage: [%]

### Issues Found
1. [Issue description]
2. [Issue description]

### Recommendations
- [Recommendation 1]
- [Recommendation 2]

### Approval
- [ ] Approved for release
- [ ] Needs fixes

**Signature:** _______________
**Date:** _______________
```

## Automated Testing

Consider adding automated tests:

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run e2e tests
npm run test:e2e
```

## Continuous Integration

Use GitHub Actions to automate testing:
- Build on every commit
- Test on multiple platforms
- Generate test reports
- Block merge if tests fail

See `.github/workflows/build-release.yml` for CI configuration.

## Support

For testing issues:
- Check troubleshooting section in BUILD.md
- Review electron-builder logs
- Check application logs
- Contact: support@rms-system.com
