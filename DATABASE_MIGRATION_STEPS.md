# Database Migration Instructions

## Step-by-Step Guide to Enable Multi-Printer Support

Follow these steps carefully to migrate your database and enable the multi-printer system.

## Prerequisites

- Server is currently stopped
- You have access to PowerShell terminal
- You're in the project root directory

## Migration Steps

### 1. Navigate to Server Directory

```powershell
cd packages\server
```

### 2. Create Database Migration

```powershell
npx prisma migrate dev --name add-multi-printer-support
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma
Datasource "db": SQLite database "dev.db" at "file:./dev.db"

Applying migration `add-multi-printer-support`
Database synchronized with Prisma schema.

✔ Generated Prisma Client
```

### 3. Generate Prisma Client

```powershell
npx prisma generate
```

**Expected Output:**
```
Environment variables loaded from .env
Prisma schema loaded from prisma\schema.prisma

✔ Generated Prisma Client to .\node_modules\@prisma\client
```

### 4. Verify Migration

```powershell
npx prisma studio
```

This opens Prisma Studio in your browser. You should see:
- ✓ New `Printer` table
- ✓ New `PrinterCategory` table
- ✓ Updated `Category` table with printer relations

Press `Ctrl+C` in terminal to close Prisma Studio.

### 5. Start the Server

```powershell
npm run dev
```

**Expected Output:**
```
🚀 Server running on http://localhost:3001
📊 Health check: http://localhost:3001/api/health
🌍 Environment: development
🔄 Initializing database...
✅ Database ready
ℹ️  No printer configured
🖨️  Multi-printer service initialized
🖨️  Found 0 active printer(s)
```

### 6. Open Desktop App

The server is now ready! Open your desktop application and navigate to **Settings → Printer**.

## What Changed?

### New Database Tables

**Printer Table:**
```sql
CREATE TABLE "Printer" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "address" TEXT,
  "port" TEXT,
  "vendorId" TEXT,
  "productId" TEXT,
  "serialPath" TEXT,
  "isActive" INTEGER DEFAULT 1,
  "sortOrder" INTEGER DEFAULT 0,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**PrinterCategory Table:**
```sql
CREATE TABLE "PrinterCategory" (
  "id" TEXT PRIMARY KEY,
  "printerId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("printerId") REFERENCES "Printer"("id") ON DELETE CASCADE,
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE,
  UNIQUE("printerId", "categoryId")
);
```

## Rollback (If Needed)

If you need to rollback the migration:

```powershell
# View migration history
npx prisma migrate status

# Rollback last migration
npx prisma migrate resolve --rolled-back add-multi-printer-support

# Reset database (⚠️ DELETES ALL DATA)
npx prisma migrate reset
```

## Common Issues

### Issue: "Migration failed"

**Solution:** Check if server is running. Stop the server before running migrations.

```powershell
# Find Node processes
Get-Process node

# Kill all Node processes if needed
Stop-Process -Name node -Force
```

### Issue: "Prisma Client out of sync"

**Solution:** Regenerate Prisma Client

```powershell
npx prisma generate
```

### Issue: "Database locked"

**Solution:** Close any database tools (like DB Browser for SQLite) and try again.

### Issue: "Module not found: @prisma/client"

**Solution:** Install dependencies

```powershell
npm install
npx prisma generate
```

## Verification Checklist

After migration, verify:

- [ ] Server starts without errors
- [ ] "Multi-printer service initialized" message appears
- [ ] Desktop app opens Settings → Printer tab
- [ ] Can click "Add Printer" button
- [ ] Modal opens with printer form
- [ ] Can see categories list in modal

## Next Steps

After successful migration:

1. **Add First Printer**
   - Go to Settings → Printer
   - Click "Add Printer"
   - Configure your printer
   - Test print

2. **Assign Categories**
   - Edit your printer
   - Check relevant categories
   - Save changes

3. **Test Order**
   - Create an order with multiple items
   - Verify items print on correct printer

## Data Integrity

✅ **Safe Migration**: This migration only adds new tables and relations. It does NOT:
- Delete any existing data
- Modify existing orders
- Change existing categories
- Remove old printer settings

Your existing data remains intact!

## Performance Impact

- **Migration Time**: < 1 second (adds new tables only)
- **Database Size**: Minimal increase (< 1KB per printer)
- **Query Performance**: No impact on existing queries
- **Indexing**: Proper indexes added for optimal performance

## Support

If you encounter issues:

1. Check server logs in terminal
2. Review error messages carefully
3. Check database file permissions
4. Verify Node.js and npm versions
5. Try running `npm install` again

## Success Message

If you see this in your terminal, you're all set! ✅

```
🖨️  Multi-printer service initialized
🖨️  Found 0 active printer(s)
```

Now you can add printers in the Desktop App!

---

**Migration Complete!** 🎉

Proceed to add your printers in **Settings → Printer** tab.
