# Production Build Checklist

## Pre-Build Verification

Before building the Windows executable, verify these items:

### 1. Environment Configuration ✓
- [ ] `.env.production` exists and has correct values
- [ ] API URL set to `http://localhost:5000` (not 5001)
- [ ] WebSocket URL set to `ws://localhost:5000` (not 5001)
- [ ] SERVER_PORT set to `5000`

### 2. Dependencies ✓
- [ ] All npm packages installed: `npm install` (from project root)
- [ ] No security vulnerabilities: `npm audit`
- [ ] Electron version matches in package.json and electron-builder.json

### 3. Icons (Optional but Recommended)
- [ ] Icon files exist in `build/` directory
- [ ] Or run `npm run icons:create` to generate placeholders

## Build Process

### Step 1: Clean Previous Builds
```powershell
cd packages\desktop
npm run clean
```

### Step 2: Build the Application
```powershell
npm run build
```

This will:
1. Copy environment files (BEFORE Next.js build)
2. Build the server (Express API)
3. Build the PWA (and copy to server public directory)
4. Build Next.js frontend with standalone output
5. Build Electron main process
6. Verify build structure

**Expected Output:**
- ✓ Server build complete
- ✓ PWA build complete
- ✓ Next.js build complete
- ✓ Standalone build structure verified
- ✓ Electron build complete
- ✓ All verification checks passed

### Step 3: Package for Windows
```powershell
npm run package:win
```

This will:
1. Create Windows installer (.exe)
2. Package all resources (Next.js standalone, server, PWA)
3. Output to `packages/desktop/release/`

**Expected Files:**
- `Restaurant Management System-Setup-1.0.0-x64.exe`
- `Restaurant Management System-Setup-1.0.0-ia32.exe`

## Post-Build Testing

### Step 1: Test Locally (Before Installing)
```powershell
npm start
```

This runs the electron app in development mode to test if servers start correctly.

### Step 2: Install and Test the Exe

1. **Navigate to release folder:**
   ```powershell
   cd release
   ```

2. **Install the application:**
   - Double-click `Restaurant Management System-Setup-1.0.0-x64.exe`
   - Follow the installation wizard
   - Choose installation directory
   - Complete installation

3. **Launch and verify startup:**
   - Launch from desktop shortcut or Start menu
   - Wait 10-30 seconds for servers to initialize
   - Watch for any error notifications

4. **Check logs if errors occur:**
   ```
   C:\Users\[YourUsername]\AppData\Roaming\@rms\desktop\startup.log
   C:\Users\[YourUsername]\AppData\Roaming\@rms\desktop\error.log
   C:\Users\[YourUsername]\AppData\Roaming\@rms\desktop\nextjs-error.log
   ```

### Step 3: Functional Testing

#### Basic Tests
- [ ] Application window opens
- [ ] Login page loads
- [ ] Can login with admin/admin123
- [ ] Dashboard loads and displays correctly
- [ ] Can navigate between pages

#### Menu Management
- [ ] Can view menu items
- [ ] Can add new menu item
- [ ] Can edit menu item
- [ ] Can delete menu item
- [ ] Categories load correctly

#### Order Management
- [ ] Can create new order
- [ ] Can add items to order
- [ ] Can modify order quantities
- [ ] Can submit order
- [ ] Order appears in active orders

#### Table Management
- [ ] Tables display with QR codes
- [ ] Can view table details
- [ ] Can assign orders to tables
- [ ] Can clear tables

#### Settings
- [ ] Can access settings page
- [ ] Can change printer settings
- [ ] Settings persist after restart

#### Data Persistence
- [ ] Close and reopen application
- [ ] Verify data is retained
- [ ] Check database file exists in:
  ```
  C:\Users\[YourUsername]\AppData\Roaming\@rms\desktop\database\restaurant.db
  ```

#### Network Features
- [ ] LAN IP detected correctly
- [ ] PWA accessible from network (http://[LAN-IP]:5000)
- [ ] QR codes scannable from mobile devices

### Step 4: Performance Testing
- [ ] Application starts within 30 seconds
- [ ] No memory leaks (check Task Manager after 30 minutes)
- [ ] CPU usage normal (<10% idle, <50% during operations)
- [ ] Database operations are fast (<1 second response)

### Step 5: Error Handling
- [ ] Try starting when ports are occupied (should find next available)
- [ ] Kill server process manually (app should detect and recover)
- [ ] Corrupt database file (app should recreate on next start)
- [ ] Network disconnect (app should continue working offline)

## Common Issues and Solutions

### Issue: Next.js Health Check Timeout

**Symptoms:**
- Log shows "Next.js Ready in XXXms" but then times out
- Error: "Next.js server failed to respond within XX seconds"

**Solutions:**
1. Check if port 3000 is blocked by firewall
2. Verify Next.js standalone build exists in release
3. Check `nextjs-error.log` for detailed diagnostics
4. Try different port (edit main.ts, rebuild)

### Issue: API URL Mismatch

**Symptoms:**
- Frontend loads but can't connect to backend
- Network errors in browser console
- 404 errors on API calls

**Solutions:**
1. Verify `.env.production` has correct port (5000, not 5001)
2. Rebuild (don't just repackage)
3. Check if environment variables were baked into Next.js build

### Issue: Database Errors

**Symptoms:**
- App fails to start with database errors
- "Prisma" or "DATABASE_URL" mentioned in logs

**Solutions:**
1. Delete database file and restart app
2. Check user data directory permissions
3. Verify Prisma schema was included in package

### Issue: Missing Files in Package

**Symptoms:**
- "file not found" errors in logs
- Resources path errors

**Solutions:**
1. Run verification: `npm run verify`
2. Check electron-builder.json extraResources
3. Rebuild from clean state: `npm run clean && npm run build && npm run package:win`

## Final Verification

Before distributing to users:

- [ ] Tested on clean Windows 10 machine
- [ ] Tested on clean Windows 11 machine
- [ ] No antivirus false positives
- [ ] All features work end-to-end
- [ ] Performance is acceptable
- [ ] Error handling works correctly
- [ ] Documentation is up to date
- [ ] Release notes prepared
- [ ] Installer file size reasonable (<200MB)

## Distribution Checklist

- [ ] Version number updated
- [ ] Changelog/Release notes created
- [ ] Code signed (optional but recommended)
- [ ] Virus scanned
- [ ] Test installer on multiple machines
- [ ] Upload to distribution location
- [ ] Notify users of new version

## Rollback Plan

If issues are found after distribution:

1. **Immediate:** Notify users not to install/update
2. **Document:** Create issue report with:
   - Steps to reproduce
   - Affected systems
   - Log files
   - Screenshots
3. **Fix:** Apply fixes and re-test thoroughly
4. **Re-release:** Increment version, rebuild, re-test
5. **Communicate:** Notify users when fixed version is available

## Support Information

**Log Locations:**
- `%APPDATA%\@rms\desktop\startup.log` - Startup sequence
- `%APPDATA%\@rms\desktop\error.log` - General errors
- `%APPDATA%\@rms\desktop\nextjs-error.log` - Next.js specific errors

**Database Location:**
- `%APPDATA%\@rms\desktop\database\restaurant.db`

**Installation Location:**
- `C:\Users\[Username]\AppData\Local\Programs\Restaurant Management System\`

**Backup Important Files:**
Before uninstalling or upgrading, back up:
- Database: `%APPDATA%\@rms\desktop\database\restaurant.db`
- Settings: `%APPDATA%\@rms\desktop\settings.json` (if exists)

---

**Last Updated:** November 28, 2025
**Build Version:** 1.0.0
