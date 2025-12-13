# Item-Buffet Category Many-to-Many Relationship Implementation

## Overview

This document describes the implementation of a proper many-to-many relationship between Menu Items and Buffet Categories, replacing the previous workaround using `secondaryCategoryId` and `tertiaryCategoryId` fields.

## Core Requirements

### 1. Item Independence
- An item can exist independently without any buffet assignment
- Items always appear in the "All Items" view (via their `categoryId`)
- Items can be assigned to **zero, one, or multiple** buffet categories

### 2. Flexible Buffet Assignment
- Assign an item to one buffet (e.g., Lunch only)
- Assign an item to multiple buffets (e.g., both Lunch and Dinner)
- Remove an item from specific buffets while keeping others
- Remove an item from all buffets (item remains in "All Items")

### 3. Data Integrity
- Buffet categories only reference items, they don't "own" them
- Removing buffet assignments never deletes or hides items
- "All Items" is the source of truth for all items

## Database Schema Changes

### New Junction Table: `MenuItemBuffetCategory`

```prisma
model MenuItemBuffetCategory {
  id               String   @id @default(uuid())
  menuItemId       String
  buffetCategoryId String
  createdAt        DateTime @default(now())
  
  menuItem         MenuItem @relation(fields: [menuItemId], references: [id], onDelete: Cascade)
  buffetCategory   Category @relation(fields: [buffetCategoryId], references: [id], onDelete: Cascade)

  @@unique([menuItemId, buffetCategoryId])
  @@index([menuItemId])
  @@index([buffetCategoryId])
}
```

### Updated Models

**MenuItem:**
- Removed: `secondaryCategoryId`, `tertiaryCategoryId`
- Added: `buffetCategories` (relation to junction table)

**Category:**
- Removed: Relations for `secondaryMenuItems`, `tertiaryMenuItems`
- Simplified: Single `menuItems` relation for primary category
- Added: `buffetMenuItems` (relation to junction table)

## API Changes

### TypeScript Types/DTOs

**Before:**
```typescript
interface CreateMenuItemDTO {
  name: string;
  categoryId: string;
  secondaryCategoryId?: string | null;
  tertiaryCategoryId?: string | null;
  price: number;
  // ... other fields
}
```

**After:**
```typescript
interface CreateMenuItemDTO {
  name: string;
  categoryId: string;              // Primary category (for "All Items")
  buffetCategoryIds?: string[];    // Array of buffet category IDs
  price: number;
  // ... other fields
}

interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  category?: Category;
  buffetCategoryIds?: string[];    // Just the IDs
  buffetCategories?: Category[];   // Full objects when populated
  price: number;
  // ... other fields
}
```

### API Endpoints

#### POST /api/menu (Create Item)
```json
{
  "name": "Grilled Salmon",
  "categoryId": "main-course-id",
  "buffetCategoryIds": ["lunch-buffet-id", "dinner-buffet-id"],
  "price": 15.00
}
```

#### PATCH /api/menu/:id (Update Item)
```json
{
  "buffetCategoryIds": ["dinner-buffet-id"]  // Replaces all buffet assignments
}
```

**Note:** To remove all buffet assignments, send an empty array:
```json
{
  "buffetCategoryIds": []
}
```

## Migration Process

### Step 1: Run Database Migration

The migration SQL will:
1. Create the `MenuItemBuffetCategory` junction table
2. Migrate existing `secondaryCategoryId` and `tertiaryCategoryId` data
3. Remove the old fields from `MenuItem` table

```bash
cd packages/server
npx tsx migrate-buffet-categories.ts
```

This script:
- Reads existing buffet assignments from secondary/tertiary fields
- Creates junction table records for buffet categories only
- Validates data integrity
- Reports migration results

### Step 2: Regenerate Prisma Client

```bash
cd packages/server
npx prisma generate
```

### Step 3: Update UI Components

The desktop UI needs updates to work with the new structure. Key changes:

**Menu Item Edit Page:**
- Replace checkboxes that manipulate secondary/tertiary categories
- Use buffet category multi-select or checkbox list
- Send `buffetCategoryIds` array to API

**Menu Display:**
- Query items with `include: { buffetCategories: { include: { buffetCategory: true } } }`
- Filter items by checking if buffet category exists in `buffetCategories` array
- Display buffet badges based on buffet assignments

## Behavioral Examples

### Example 1: Create Item Without Buffet
```json
POST /api/menu
{
  "name": "French Fries",
  "categoryId": "sides-id",
  "price": 3.50
}
```
Result: Item appears only in "All Items → Sides"

### Example 2: Create Item in Multiple Buffets
```json
POST /api/menu
{
  "name": "Caesar Salad",
  "categoryId": "appetizers-id",
  "buffetCategoryIds": ["lunch-buffet-id", "dinner-buffet-id"],
  "price": 8.00
}
```
Result: Item appears in:
- All Items → Appetizers (€8.00)
- Lunch Buffet (covered by buffet price)
- Dinner Buffet (covered by buffet price)

### Example 3: Add Item to Buffet
```json
PATCH /api/menu/:id
{
  "buffetCategoryIds": ["lunch-buffet-id"]
}
```
Result: Item now appears in Lunch Buffet, still in All Items

### Example 4: Move Item Between Buffets
```json
PATCH /api/menu/:id
{
  "buffetCategoryIds": ["dinner-buffet-id"]
}
```
Result: Item removed from Lunch Buffet, added to Dinner Buffet

### Example 5: Remove from All Buffets
```json
PATCH /api/menu/:id
{
  "buffetCategoryIds": []
}
```
Result: Item removed from all buffets, still visible in All Items

## Query Examples

### Get All Items with Buffet Info
```typescript
const items = await prisma.menuItem.findMany({
  include: {
    category: true,
    buffetCategories: {
      include: {
        buffetCategory: true,
      },
    },
  },
});

// Access buffet categories
items.forEach(item => {
  const buffetNames = item.buffetCategories.map(bc => bc.buffetCategory.name);
  console.log(`${item.name} is in buffets: ${buffetNames.join(', ')}`);
});
```

### Filter Items by Buffet
```typescript
const lunchBuffetItems = await prisma.menuItem.findMany({
  where: {
    buffetCategories: {
      some: {
        buffetCategoryId: "lunch-buffet-id",
      },
    },
  },
  include: {
    category: true,
    buffetCategories: {
      include: {
        buffetCategory: true,
      },
    },
  },
});
```

### Get Items NOT in Any Buffet
```typescript
const nonBuffetItems = await prisma.menuItem.findMany({
  where: {
    buffetCategories: {
      none: {},
    },
  },
  include: {
    category: true,
  },
});
```

## UI Implementation Notes

### Desktop App Changes Needed

1. **Menu Item Form Components:**
   - Replace "Add to Lunch/Dinner Buffet" checkboxes
   - Implement multi-select for buffet categories
   - Send `buffetCategoryIds` array instead of secondary/tertiary IDs

2. **Menu Display Logic:**
   - Update filtering to check `buffetCategories` array
   - Update badge display to loop through buffet categories
   - Handle empty buffet array (item in All Items only)

3. **API Client Calls:**
   - Update `createMenuItem` to send `buffetCategoryIds`
   - Update `updateMenuItem` to send `buffetCategoryIds`
   - Remove references to `secondaryCategoryId`, `tertiaryCategoryId`

### PWA Changes Needed

Similar updates for the PWA menu display and cart logic.

## Benefits of This Approach

1. **Scalability:** Can add unlimited buffet categories without schema changes
2. **Clarity:** Clear separation between item category and buffet membership
3. **Flexibility:** Easy to add/remove buffet assignments independently
4. **Data Integrity:** Cascade deletes handle cleanup automatically
5. **Query Performance:** Indexed junction table for fast lookups
6. **Standards Compliance:** Follows database normalization best practices

## Rollback Plan

If needed to rollback:
1. Restore database backup
2. Revert Prisma schema changes
3. Regenerate Prisma client
4. Revert API and UI code changes

## Testing Checklist

- [ ] Create item without buffet assignment
- [ ] Create item with one buffet assignment
- [ ] Create item with multiple buffet assignments
- [ ] Update item to add buffet assignment
- [ ] Update item to remove specific buffet assignment
- [ ] Update item to remove all buffet assignments
- [ ] Delete item (verify cascade delete of junction records)
- [ ] Verify "All Items" always shows all items
- [ ] Verify buffet views show only assigned items
- [ ] Test with existing migrated data

## Support

For issues or questions about this implementation:
1. Check migration logs for data migration errors
2. Verify Prisma client regeneration completed successfully
3. Check server logs for API errors
4. Ensure all UI components updated to use new structure
