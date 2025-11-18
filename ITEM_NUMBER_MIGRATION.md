# Item Number Feature Migration Guide

## Overview
This document explains the changes made to implement unique item numbers for menu items and remove default seed data.

## Changes Made

### 1. Database Schema Changes
- **Added `itemNumber` field** to `MenuItem` model in `schema.prisma`
  - Type: `Int` with `@unique` constraint
  - Auto-incrementing starting from 1
  - Indexed for fast search performance

### 2. Database Initialization Changes
- **Removed default seed data** for:
  - Menu items (25+ items)
  - Categories (5 categories)
- **Kept essential data**:
  - Default admin user
  - Default tables with QR codes
  - Default settings

### 3. Frontend Changes
- **Updated search functionality** in both:
  - Table-based order page (`packages/desktop/src/app/tables/[id]/order/page.tsx`)
  - Takeaway/billing page (`packages/desktop/src/app/billing/page.tsx`)
- **Added item number badge** display on all menu item cards
- **Updated search placeholders** to "Search by name or item number..."
- **Search now supports**:
  - Searching by item name (partial match)
  - Searching by exact item number

### 4. Type Definitions
- Updated `MenuItem` interface in `packages/shared/src/types.ts` to include `itemNumber` field

## Migration Steps

### For New Installations
The database will be created with the new schema automatically. No migration needed.

### For Existing Installations
You need to migrate the existing database to add the `itemNumber` column:

1. **Navigate to server directory:**
   ```powershell
   cd packages/server
   ```

2. **Generate migration:**
   ```powershell
   npx prisma migrate dev --name add_item_number
   ```

3. **Apply migration:**
   The migration will be applied automatically. Existing menu items will be assigned sequential item numbers starting from 1.

## Using Item Numbers

### Adding Menu Items
When adding new menu items through the admin interface:
- Item numbers are assigned automatically (auto-increment)
- You don't need to specify the item number manually
- Each item gets a unique sequential number

### Searching for Items
Users can now search for menu items in two ways:
1. **By name**: Type any part of the item name (e.g., "chicken")
2. **By number**: Type the exact item number (e.g., "42")

### Item Number Display
- Item numbers appear as a blue badge in the top-left corner of each menu item card
- Format: `#1`, `#2`, `#3`, etc.
- Always visible on menu item cards

## Database Schema Reference

### Before
```prisma
model MenuItem {
  id                  String      @id @default(uuid())
  name                String
  categoryId          String
  // ... other fields
}
```

### After
```prisma
model MenuItem {
  id                  String      @id @default(uuid())
  itemNumber          Int         @unique @default(autoincrement())
  name                String
  categoryId          String
  // ... other fields
  
  @@index([itemNumber])
}
```

## Notes

- **No breaking changes** for existing features
- **Backward compatible** - existing menu items will work after migration
- **Performance optimized** - item number field is indexed for fast searches
- **Clean installs** - New installations start with an empty menu, allowing restaurant owners to add their own items
- **Seed data removed** - No more demo/sample data on first install

## Troubleshooting

### Migration Fails
If the migration fails, you can manually add the column:
```sql
ALTER TABLE MenuItem ADD COLUMN itemNumber INTEGER;
CREATE UNIQUE INDEX MenuItem_itemNumber_key ON MenuItem(itemNumber);
```

Then update existing items with sequential numbers:
```sql
UPDATE MenuItem SET itemNumber = rowid WHERE itemNumber IS NULL;
```

### Search Not Working
- Ensure the frontend is rebuilt after changes
- Clear browser cache
- Check that `itemNumber` field exists in database
- Verify the MenuItem type includes `itemNumber` field

## Benefits

1. **Easier item identification** - Cashiers can quickly find items by number
2. **Faster order entry** - Type number instead of searching by name
3. **Better organization** - Sequential numbering helps with inventory management
4. **Clean installations** - No demo data cluttering new installations
5. **Restaurant-specific setup** - Each restaurant adds only their own menu items
