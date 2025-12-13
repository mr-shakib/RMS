# Quick Test Instructions

## ✅ FIXED: Database Persistence & Menu Items

### The Problem (Before)
- ❌ Database recreated every startup
- ❌ Cannot add menu items (Prisma errors)

### The Fix
- ✅ Added `prepare-server.js` step to build process
- ✅ Fresh Prisma Client now generated for every build
- ✅ Database initialization check improved

---

## How to Test

### Step 1: Uninstall Old Version
```powershell
# Close the app if running
# Go to Windows Settings → Apps → Uninstall "Restaurant Management System"
```

### Step 2: Clean Old Data
```powershell
# Delete old database and logs
Remove-Item "$env:APPDATA\@rms\desktop" -Recurse -Force -ErrorAction SilentlyContinue
```

### Step 3: Install New Version
```powershell
cd C:\personal\project\RMS\packages\desktop\release-new
.\Restaurant` Management` System-Setup-1.0.0.exe
```

### Step 4: Test Database Persistence

#### First Launch:
1. Open the app
2. Login (admin/admin123)
3. Check logs: `$env:APPDATA\@rms\desktop\startup.log`
4. Should see: `🔧 Database not initialized, creating schema...`
5. **Close the app**

#### Second Launch:
1. Open the app again
2. Login
3. Check logs again
4. Should see: `✅ Database already initialized` ← **SUCCESS!**
5. Database file should be same size, not recreated

### Step 5: Test Menu Items

1. Navigate to Menu Management
2. Click "Add Menu Item"
3. Fill in details:
   - Name: Test Item
   - Category: Select any
   - Price: 10.00
4. Click Save
5. Should save without errors ← **SUCCESS!**
6. Try editing the item
7. Try assigning to buffet categories (if any)

---

## Success Indicators

### ✅ Database Persistence
```powershell
# Check database file - should NOT change size on restart
Get-Item "$env:APPDATA\@rms\desktop\database\restaurant.db" | Select-Object Length, LastWriteTime
```

### ✅ No Prisma Errors in Logs
```powershell
# Check for errors
Select-String -Path "$env:APPDATA\@rms\desktop\startup.log" -Pattern "Unknown field|does not exist" | Select-Object -Last 10
```
Should return nothing or very old entries.

### ✅ Menu Items Work
- Can add items
- Can edit items  
- Can delete items
- Can assign categories
- No console errors

---

## If Issues Persist

1. **Completely uninstall** app
2. **Delete** entire AppData folder:
   ```powershell
   Remove-Item "$env:APPDATA\@rms" -Recurse -Force
   ```
3. **Reinstall** fresh
4. Check logs for any errors

---

## Quick Log Check

```powershell
# View last 50 lines of log
Get-Content "$env:APPDATA\@rms\desktop\startup.log" -Tail 50

# Search for initialization messages
Select-String -Path "$env:APPDATA\@rms\desktop\startup.log" -Pattern "Database|initialized"
```

---

**Expected Result**: App works perfectly, database persists, menu items can be added/edited! ✅
