# Production Database and Menu Items Fix

## Issues Identified

### 1. Database Being Recreated on Every Startup
**Root Cause**: The database initialization check (`isDatabaseInitialized()`) was checking if menu items exist, but this check was failing due to Prisma schema mismatch errors, causing the system to think the database wasn't initialized.

**Fix**: Updated the initialization check to:
- Only check for admin user, tables, and settings (not menu items)
- Menu items can be added by users after initial setup
- More robust error handling for table existence checks

### 2. Cannot Add Menu Items - Prisma Schema Mismatch
**Root Cause**: The Prisma Client was not being regenerated during the build process, causing a mismatch between the schema and the generated client.

**Errors Seen**:
```
Unknown field `buffetCategories` for include statement on model `MenuItem`
Unknown field `menuItems` for select statement on model `CategoryCountOutputType`
```

**Fix**: 
- Added `prisma generate` to the server build script
- Added `postinstall` hook to ensure Prisma Client is generated when dependencies are installed
- Verified electron-builder config includes Prisma files in asar unpack

## Changes Made

### 1. Server Package.json
**File**: `packages/server/package.json`

```json
"scripts": {
  "build": "prisma generate && tsc",
  "postinstall": "prisma generate",
  ...
}
```

### 2. Database Initialization Service
**File**: `packages/server/src/services/initializationService.ts`

```typescript
async isDatabaseInitialized(): Promise<boolean> {
  try {
    // Check if User table exists
    const userTableExists = await prisma.$queryRaw`SELECT name FROM sqlite_master WHERE type='table' AND name='User' LIMIT 1`;
    if (!userTableExists || (Array.isArray(userTableExists) && userTableExists.length === 0)) {
      return false;
    }
    
    // Check if admin user exists
    const adminUser = await prisma.user.findUnique({
      where: { username: 'admin' },
    });

    // Check if any tables exist
    const tableCount = await prisma.table.count();

    // Check if settings exist
    const settingsCount = await prisma.setting.count();

    // Database is considered initialized if admin user, tables, and settings exist
    // We don't check for menu items as they can be added later by the user
    return !!(adminUser && tableCount > 0 && settingsCount > 0);
  } catch (error: any) {
    if (error.code === 'P2021' || error.message?.includes('does not exist')) {
      return false;
    }
    console.error('Error checking database initialization:', error);
    return false;
  }
}
```

### 3. Verification Script Enhancement
**File**: `packages/desktop/scripts/verify-package.js`

Added Prisma verification checks to ensure:
- Prisma schema is included
- Prisma client is generated
- Prisma packages are present

## Build Instructions

To rebuild the production executable with these fixes:

```powershell
# Navigate to desktop package
cd packages\desktop

# Run the build script
.\build-and-package.ps1
```

This will:
1. Clean previous builds
2. Install dependencies (triggers `postinstall` → `prisma generate`)
3. Build server (runs `prisma generate` again)
4. Build PWA
5. Build Next.js frontend
6. Build Electron main process
7. Package into Windows installer

## Verification

After building and installing:

1. **First Run**:
   - Database should be created at: `%APPDATA%\@rms\desktop\database\restaurant.db`
   - Tables, admin user, and settings should be created automatically
   - No menu items will be present initially

2. **Second Run**:
   - Database should NOT be recreated
   - Existing data should be preserved
   - You should be able to add menu items via the admin interface

3. **Check Logs**:
   - Location: `%APPDATA%\@rms\desktop\startup.log`
   - Should see: `✅ Database already initialized` on subsequent runs
   - Should NOT see Prisma validation errors when accessing menu or categories

## Testing Menu Items

1. Open the application
2. Login as admin (username: `admin`, password: `admin123`)
3. Navigate to Menu Management
4. Try adding a new menu item
5. Should work without errors

## Database Location

- **Production**: `C:\Users\<username>\AppData\Roaming\@rms\desktop\database\restaurant.db`
- **Development**: `packages/server/prisma/dev.db`

## Troubleshooting

### If database still gets recreated:
1. Check the startup.log for the exact error
2. Verify the database file exists and is writable
3. Check Windows permissions on the AppData folder

### If menu items still show errors:
1. Verify Prisma client is in the packaged app:
   - Look for `resources\server\node_modules\.prisma\client`
2. Check that schema.prisma is included:
   - Look for `resources\server\prisma\schema.prisma`
3. Rebuild the application completely

### Clean Install:
If issues persist, perform a clean install:
```powershell
# Uninstall the app
# Delete database: %APPDATA%\@rms\desktop\database
# Delete logs: %APPDATA%\@rms\desktop\*.log
# Reinstall the app
```

## Additional Notes

- The database will only be created once on first run
- Menu items are optional and can be added by users
- The fix ensures Prisma Client always matches the schema
- Database persists across app restarts
- All user data is preserved in the AppData folder
