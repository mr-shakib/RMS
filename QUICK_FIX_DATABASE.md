# Quick Fix Guide - Production Database Issues

## Problem Summary
1. ❌ Database gets recreated every time the app opens
2. ❌ Cannot add menu items (Prisma schema errors)

## Solution
The Prisma Client wasn't being regenerated during builds, and the database initialization logic was too strict.

## How to Rebuild

### Option 1: Quick Build Script (Recommended)
```powershell
cd packages\desktop
.\build-and-package.ps1
```

### Option 2: Manual Steps
```powershell
# 1. Clean everything
cd packages\desktop
npm run clean

# 2. Reinstall dependencies (this now runs prisma generate)
cd ..\..
npm install

# 3. Build
cd packages\desktop
npm run build

# 4. Package
npm run package
```

## What Was Fixed

### ✅ Server Build Script
- Added `prisma generate` to build command
- Added `postinstall` hook to auto-generate Prisma client

### ✅ Database Initialization
- Removed menu items check (they can be empty initially)
- Now only checks: admin user, tables, and settings
- More robust error handling

### ✅ Verification Script
- Added Prisma client checks

## Testing the Fix

1. **Build the app** using one of the methods above
2. **Install** the new executable from `packages\desktop\release-new\`
3. **First run**: Database will be created, but no menu items
4. **Second run**: Database should NOT be recreated
5. **Add menu items**: Should work without Prisma errors

## Expected Logs

### ✅ Good - First Run:
```
🔧 Database not initialized, creating schema and seeding data...
✅ Database schema created successfully
✅ Created default users (admin, waiter, chef)
✅ Created 10 tables with QR codes
✅ Database initialization completed successfully
```

### ✅ Good - Second Run:
```
✅ Database already initialized
✅ Database ready
```

### ❌ Bad (Old Build):
```
Unknown field `buffetCategories` for include statement on model `MenuItem`
```

## Where to Find Logs
- Windows: `%APPDATA%\@rms\desktop\startup.log`
- Full path: `C:\Users\<username>\AppData\Roaming\@rms\desktop\startup.log`

## If Issues Persist

1. **Completely uninstall** the old app
2. **Delete** the database folder: `%APPDATA%\@rms\desktop\database`
3. **Delete** log files: `%APPDATA%\@rms\desktop\*.log`
4. **Rebuild** with the new code
5. **Install** the new executable

## Time Estimate
- Build time: ~5-10 minutes
- Total time: ~15 minutes

## Need Help?
Check the detailed documentation: [PRODUCTION_DATABASE_FIX.md](./PRODUCTION_DATABASE_FIX.md)
