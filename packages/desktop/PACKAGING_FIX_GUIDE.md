# Desktop App Packaging Fix Guide

## Critical Issues Fixed

### 1. **Infinite Recursion Loop (CRITICAL)**
**Problem:** The app was using `process.execPath` to launch Node.js in production, which pointed to the `.exe` file itself, creating an infinite loop of spawning processes.

**Fix:** Modified `electron/serverLauncher.ts` to:
- Detect the correct Node.js executable path
- On Windows: Look for `node.exe` in the same directory as the app executable
- Fall back to system `node` if bundled version not found
- Never use `process.execPath` in packaged apps

### 2. **Missing Database Tables**
**Problem:** Prisma client was not initialized, causing "table does not exist" errors.

**Fixes:**
- Added database migration deployment in `prepare-server.js`
- Added `initializeDatabase()` function in `main.ts` to run migrations on first startup
- Database is now created and migrated before the server starts

### 3. **ES Module Import Errors**
**Problem:** Directory imports not supported (`import 'shared/dist/types'`).

**Fix:** Updated `packages/shared/package.json` with proper `exports` field and `"type": "module"`.

## How to Build and Test

### Step 1: Clean Previous Builds
```powershell
cd c:\personal\project\RMS\packages\desktop
npm run clean
```

### Step 2: Rebuild Shared Package
```powershell
cd c:\personal\project\RMS
npm run build --workspace=packages/shared
```

### Step 3: Rebuild Server
```powershell
npm run build --workspace=packages/server
```

### Step 4: Build Desktop App
```powershell
cd c:\personal\project\RMS\packages\desktop
npm run build
```

### Step 5: Package for Windows
```powershell
npm run package:win
```

This will:
1. Build all components (server, Next.js frontend, Electron)
2. Prepare server dependencies with Prisma client
3. Run Prisma migrations
4. Package everything into an installer

### Step 6: Test the Packaged App

The installer will be in `packages/desktop/release/`.

**Before testing:**
1. Uninstall any previous version
2. Delete the user data folder: `C:\Users\<your-username>\AppData\Roaming\@rms\desktop`

**Install and run:**
1. Run the installer
2. Launch the app
3. Check for any errors in the console
4. Verify the database was created at: `%APPDATA%\@rms\desktop\database\restaurant.db`

## Troubleshooting

### If the app still crashes:

1. **Check the startup log:**
   ```powershell
   type $env:APPDATA\@rms\desktop\startup.log
   ```

2. **Check error log:**
   ```powershell
   type $env:APPDATA\@rms\desktop\error.log
   ```

3. **Verify Node.js is available:**
   The app tries these locations in order:
   - `<app-directory>\node.exe` (bundled with Electron)
   - System `node` from PATH

   If both fail, install Node.js globally.

### Common Issues:

**"Cannot find module":**
- Make sure `prepare-server.js` ran successfully
- Check that `server/node_modules` exists in the packaged app

**"Prisma client not initialized":**
- Database migrations didn't run
- Try deleting the database folder and restarting: 
  ```powershell
  Remove-Item -Recurse -Force $env:APPDATA\@rms\desktop\database
  ```

**"Server failed to start":**
- Check if port 5000 is already in use
- The app will try ports 5000-5010

## System Requirements

- **Windows:** Windows 10 or later (64-bit)
- **Node.js:** Bundled with Electron (no separate installation needed)
- **Disk Space:** ~300MB for installation + database

## Production Checklist

Before distributing:

- [ ] Test on a clean Windows machine without Node.js installed
- [ ] Test on a clean Windows machine WITH Node.js installed  
- [ ] Verify database initialization works
- [ ] Verify database persists across app restarts
- [ ] Test with firewall enabled (Windows Defender)
- [ ] Test installer (NSIS)
- [ ] Test portable version
- [ ] Verify uninstaller works
- [ ] Check app data is NOT deleted on uninstall (as configured)

## Additional Notes

### Database Location
- **Development:** `packages/server/prisma/dev.db`
- **Production:** `%APPDATA%\@rms\desktop\database\restaurant.db`

### Server Logs
In production, server logs are captured and written to:
- `%APPDATA%\@rms\desktop\startup.log` - Startup logs
- `%APPDATA%\@rms\desktop\error.log` - Error logs

### Port Configuration
- **API Server:** 5000 (auto-increments if busy: 5001, 5002, etc.)
- **Next.js Server:** 3000

## Files Modified

1. `electron/serverLauncher.ts` - Fixed Node.js executable detection
2. `electron/main.ts` - Added database initialization
3. `scripts/prepare-server.js` - Added Prisma migration deployment
4. `electron-builder.json` - Added init script to resources
5. `packages/shared/package.json` - Fixed ES module exports

## Next Steps After Successful Build

1. **Code Signing:** For production, sign the executable to avoid Windows SmartScreen warnings
2. **Auto-Updates:** Configure update server (see electron-updater docs)
3. **Crash Reporting:** Add Sentry or similar for production error tracking
4. **Performance:** Add startup performance monitoring
