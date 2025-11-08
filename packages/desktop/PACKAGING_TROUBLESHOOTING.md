# Packaging Troubleshooting Guide

This document covers common issues encountered during the packaging process and their solutions.

## Issues Encountered and Fixed

### 1. Missing Icon Files ❌ → ✅

**Error:**
```
electron-builder cannot find icon files
```

**Solution:**
```bash
npm run icons:create
```

This creates placeholder icon files that allow the build to work.

---

### 2. Electron Version Detection ❌ → ✅

**Error:**
```
Cannot compute electron version from installed node modules
```

**Solution:**
Added `"electronVersion": "28.1.0"` to `electron-builder.json`.

---

### 3. Missing TypeScript Types ❌ → ✅

**Error:**
```
Could not find a declaration file for module 'express'
```

**Solution:**
```bash
npm install
```

Reinstalled dependencies to ensure all @types packages are available.

---

### 4. 7zip-bin Missing ❌ → ✅

**Error:**
```
ENOENT: no such file or directory, chmod 'F:\_Personal\RMS\node_modules\7zip-bin\win\x64\7za.exe'
```

**Solution:**
```bash
npm install 7zip-bin --force
```

---

### 5. app-builder.exe Missing ❌ → ✅

**Error:**
```
spawn F:\_Personal\RMS\node_modules\app-builder-bin\win\x64\app-builder.exe ENOENT
```

**Solution:**
```bash
npm install app-builder-bin --force
```

---

## Quick Fix Script

If you encounter packaging issues, run these commands:

```bash
# From project root
npm install
npm install 7zip-bin --force
npm install app-builder-bin --force

# Create icons if needed
cd packages/desktop
npm run icons:create

# Try packaging again
npm run package:win
```

---

## Common Issues and Solutions

### Issue: "Cannot find module"

**Symptoms:** Build fails with module not found errors

**Solution:**
```bash
# Clean and reinstall
npm run clean
rm -rf node_modules package-lock.json
npm install
```

---

### Issue: "EPERM: operation not permitted"

**Symptoms:** Permission errors on Windows

**Solutions:**
1. Close any running instances of the app
2. Close any file explorers viewing the directories
3. Run terminal as Administrator
4. Disable antivirus temporarily
5. Add project folder to antivirus exclusions

---

### Issue: Build succeeds but packaging fails

**Symptoms:** Build completes but electron-builder fails

**Solution:**
```bash
# Reinstall electron-builder dependencies
npm install electron-builder 7zip-bin app-builder-bin --force
```

---

### Issue: "Out of memory" errors

**Symptoms:** Build fails with heap out of memory

**Solution:**
```bash
# Increase Node.js memory limit
set NODE_OPTIONS=--max-old-space-size=4096
npm run package:win
```

---

### Issue: Slow packaging on Windows Defender

**Symptoms:** Packaging takes extremely long

**Solution:**
Add these folders to Windows Defender exclusions:
- `F:\_Personal\RMS\node_modules`
- `F:\_Personal\RMS\packages\desktop\release`
- `F:\_Personal\RMS\packages\desktop\.next`

---

## Verification Steps

After fixing issues, verify:

1. **Dependencies installed:**
   ```bash
   npm list electron electron-builder
   ```

2. **Required files exist:**
   ```bash
   # Check icons
   ls packages/desktop/build/icon.ico
   ls packages/desktop/build/icon.icns
   
   # Check builder tools
   ls node_modules/7zip-bin/win/x64/7za.exe
   ls node_modules/app-builder-bin/win/x64/app-builder.exe
   ```

3. **Build works:**
   ```bash
   npm run build
   ```

4. **Package works:**
   ```bash
   npm run package:win
   ```

---

## Expected Output

When packaging succeeds, you should see:

```
📦 Packaging for win (production environment)...
🔨 Running build...
✓ Server build complete
✓ Next.js build complete
✓ Electron build complete
✅ Build complete!

📦 Creating installer packages...
• electron-builder  version=24.13.3
• loaded configuration  file=electron-builder.json
• packaging       platform=win32 arch=x64 electron=28.1.0
• building        target=nsis file=release\Restaurant Management System-1.0.0-x64.exe
• building        target=nsis file=release\Restaurant Management System-1.0.0-ia32.exe
• building        target=portable file=release\Restaurant Management System-1.0.0-portable.exe

✅ Packaging complete!
📁 Output directory: packages/desktop/release
```

---

## Still Having Issues?

### Check Logs

Look for detailed error messages in:
- Terminal output
- `packages/desktop/release/builder-debug.yml`
- `packages/desktop/release/builder-effective-config.yaml`

### Clean Build

Try a completely clean build:

```bash
# From project root
npm run clean
rm -rf node_modules package-lock.json
rm -rf packages/*/node_modules
rm -rf packages/desktop/release
rm -rf packages/desktop/.next
rm -rf packages/desktop/dist
rm -rf packages/server/dist

# Reinstall everything
npm install

# Create icons
cd packages/desktop
npm run icons:create

# Try again
npm run package:win
```

### System Requirements

Ensure you have:
- Windows 10 or higher
- Node.js 20.x or higher
- npm 10.x or higher
- At least 4GB free RAM
- At least 2GB free disk space
- Antivirus not blocking node_modules

### Get Help

If issues persist:
1. Check electron-builder docs: https://www.electron.build/
2. Search GitHub issues: https://github.com/electron-userland/electron-builder/issues
3. Review `BUILD.md` for detailed documentation
4. Check `ELECTRON_VERSION_FIX.md` for version-specific issues

---

## Success Indicators

You'll know packaging succeeded when:

✅ No error messages in terminal
✅ Files exist in `packages/desktop/release/`:
   - `Restaurant Management System-1.0.0-x64.exe`
   - `Restaurant Management System-1.0.0-ia32.exe`
   - `Restaurant Management System-1.0.0-portable.exe`
✅ Installer runs and installs the application
✅ Installed application launches successfully

---

## Next Steps After Successful Packaging

1. **Test the installer:**
   - Run the .exe file
   - Follow installation wizard
   - Launch the installed app
   - Test all features

2. **Test the portable version:**
   - Run the portable .exe
   - Verify it works without installation

3. **Prepare for distribution:**
   - Replace placeholder icons with branded icons
   - Configure code signing (optional)
   - Set up auto-update server (optional)
   - Create release notes
   - Test on clean Windows systems

See `BUILD_TESTING.md` for comprehensive testing procedures.
