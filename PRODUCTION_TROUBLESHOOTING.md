# Production Troubleshooting Guide

## Application Won't Start

### Check Error Logs

**Startup Log**: `C:\Users\[YourUsername]\AppData\Roaming\Restaurant Management System\startup.log`
**Error Log**: `C:\Users\[YourUsername]\AppData\Roaming\Restaurant Management System\error.log`

The `startup.log` captures all console output from the very beginning. Check this first!

Open these files to see detailed startup errors and diagnostic information.

### Common Issues

#### 1. Next.js Server Won't Start

**Symptoms**: 
- App shows "Startup Error" notification
- Error log mentions "Next.js Server failed"

**Fixed in latest build**:
- Changed from using `npx next start` to direct Node.js execution
- Error: `node_modules/next/dist/bin/next not found`

**Solution**:
- Use the latest installer (after the fix)
- Verify `.next` folder exists in installed directory

#### 2. API Server Won't Start

**Symptoms**:
- Error log mentions "API Server failed"
- Port 5000 already in use

**Solutions**:
- Close any other apps using port 5000
- App will automatically try ports 5001-5009
- Check if another instance is already running

#### 3. Database Errors

**Symptoms**:
- Error mentions "DATABASE_URL" or "Prisma"
- Database file can't be created

**Solutions**:
1. Check user data directory exists:
   ```
   C:\Users\[YourUsername]\AppData\Roaming\Restaurant Management System\database\
   ```

2. Ensure write permissions to AppData folder

3. If corrupted, delete database file:
   ```
   C:\Users\[YourUsername]\AppData\Roaming\Restaurant Management System\database\restaurant.db
   ```
   App will recreate it on next start

#### 4. Port Conflicts

**Symptoms**:
- "No available ports found" error

**Solutions**:
- Close other apps using ports 3000-3010 and 5000-5010
- Restart your computer to release stuck ports
- Check with: `netstat -ano | findstr "3000"` or `netstat -ano | findstr "5000"`

### Debug Mode

To see console output in production:

1. Install the app
2. Navigate to installation directory (usually `C:\Program Files\Restaurant Management System\`)
3. Open Command Prompt in that folder
4. Run: `"Restaurant Management System.exe" --enable-logging`
5. Check console output for errors

### Reinstall Cleanly

1. Uninstall via Windows Settings → Apps
2. Delete user data:
   ```
   C:\Users\[YourUsername]\AppData\Roaming\Restaurant Management System\
   ```
3. Reinstall with latest .exe

## Changes Made to Fix Startup Issues

### What Was Fixed

1. **Next.js Server Launch Method**
   - **Before**: Used `npx next start` (doesn't work in packaged app)
   - **After**: Uses `node node_modules/next/dist/bin/next start`
   - **Why**: npx/npm commands aren't available in packaged Electron apps

2. **Shell Execution**
   - **Before**: Used shell for all spawned processes
   - **After**: Only uses shell for dev mode npm commands
   - **Why**: Direct execution is more reliable in production

3. **Error Logging**
   - **Added**: Comprehensive error logging to error.log file
   - **Added**: Detailed console output for debugging
   - **Added**: Error notifications with specific messages

4. **Startup Diagnostics**
   - **Added**: Log app path, user data path, and package status
   - **Added**: Separate try-catch for API and Next.js servers
   - **Added**: Keep app open for 5 seconds on error to show message

## Verification Steps

### After Installing

1. Check if shortcut was created:
   - Desktop: `Restaurant Management System.lnk`
   - Start Menu: `Restaurant Management System`

2. Launch the app from shortcut

3. Wait 10-20 seconds for servers to start

4. If error occurs:
   - Check notification message
   - Open error.log (location above)
   - Look for specific error messages

### Expected Startup Sequence

```
🚀 Application starting...
📦 Is packaged: true
📁 App path: C:\Program Files\Restaurant Management System\resources\app.asar
📁 User data: C:\Users\[Username]\AppData\Roaming\Restaurant Management System
🔧 Development mode: false
🔧 Starting API server...
🚀 Starting server on port 5000...
📁 Created database directory: ...
📊 Database path: ...
✅ Server is ready!
🔧 Starting Next.js server...
🚀 Starting Next.js server on port 3000...
✅ Next.js server is ready!
```

## Testing the Fixed Build

### Quick Test

1. **Install** the new .exe
2. **Wait** for startup (10-20 seconds)
3. **Login** with admin/admin123
4. **Create** a test order
5. **Restart** app and verify data persists

### Full Test

Follow the checklist in `QUICK_BUILD_TEST.md`

## Getting More Help

### Collect Debug Information

1. **Error Log**:
   ```
   C:\Users\[Username]\AppData\Roaming\Restaurant Management System\error.log
   ```

2. **Check Ports**:
   ```cmd
   netstat -ano | findstr ":3000"
   netstat -ano | findstr ":5000"
   ```

3. **Check Processes**:
   ```cmd
   tasklist | findstr "Restaurant"
   ```

4. **Installation Directory**:
   ```
   C:\Program Files\Restaurant Management System\
   ```
   Check if these exist:
   - `.next/` folder
   - `resources/server/` folder
   - `node_modules/next/` folder

### Report an Issue

Include:
- Error log content
- Windows version
- Installation path
- Steps to reproduce
- Screenshot of error notification

## Build Verification

### Before Distribution

Test on a **clean Windows machine** (no dev tools):

1. ✅ Fresh Windows 10/11 installation
2. ✅ No Node.js or npm installed
3. ✅ No development tools
4. ✅ Normal user account (not admin if possible)

This ensures the packaged app works standalone.

## Files Included in Build

The installer includes:

```
Restaurant Management System/
├── Restaurant Management System.exe (Electron)
├── resources/
│   ├── app.asar (Main application code)
│   │   ├── dist/electron/ (Electron main process)
│   │   ├── .next/ (Next.js production build)
│   │   ├── node_modules/next/ (Next.js runtime)
│   │   └── package.json
│   └── server/ (API Server)
│       ├── dist/ (Compiled JavaScript)
│       ├── prisma/ (Database schema)
│       └── node_modules/ (Server dependencies)
├── node_modules/ (Electron dependencies)
└── other Electron files
```

## Performance Optimization

If app is slow to start:

1. **Antivirus**: Add app to exclusions
2. **Windows Defender**: Exclude installation directory
3. **SSD**: Install on SSD instead of HDD
4. **First Run**: Always slower (database creation)

---

**Last Updated**: 2025-11-14  
**Build Version**: 1.0.0 (with Next.js server fix)
