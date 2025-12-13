# Quick Start Guide: Buffet Many-to-Many Implementation

## What Was Changed

The system now uses a proper many-to-many relationship between Menu Items and Buffet Categories, replacing the old workaround with `secondaryCategoryId` and `tertiaryCategoryId` fields.

### Key Benefits:
- ✅ Items can be assigned to **zero, one, or multiple** buffet categories
- ✅ Clean, scalable database design
- ✅ Easier to add/remove buffet assignments
- ✅ Better data integrity

---

## Migration Steps

### 1. Run the Database Migration

```bash
cd packages/server
npx tsx migrate-buffet-categories.ts
```

This will:
- Create the `MenuItemBuffetCategory` junction table
- Migrate existing buffet assignments from `secondaryCategoryId`/`tertiaryCategoryId`
- Remove old fields from the schema
- Preserve all existing data

### 2. Regenerate Prisma Client

```bash
cd packages/server
npx prisma generate
```

### 3. Restart the Server

The server endpoints have been updated to use the new structure:
- `POST /api/menu` - Accepts `buffetCategoryIds` array
- `PATCH /api/menu/:id` - Accepts `buffetCategoryIds` array
- `GET /api/menu` - Returns items with `buffetCategories` populated

### 4. Update Desktop UI (Required)

The desktop app needs updates to work with the new API structure. See the reference implementation in `EXAMPLE_UI_COMPONENTS.tsx`.

**Key Changes Needed:**

#### In Menu Item Form (`packages/desktop/src/app/menu/[id]/page.tsx`):

**Before:**
```typescript
// Old approach - manipulating secondary/tertiary categories
const [formData, setFormData] = useState({
  addToLunchBuffet: false,
  addToDinnerBuffet: false,
});

// Complex logic to determine which category goes where
let primaryCategoryId = formData.categoryId;
let secondaryCategoryId = null;
if (formData.addToLunchBuffet) {
  secondaryCategoryId = launchBuffetCategory.id;
}
```

**After:**
```typescript
// New approach - simple array of buffet IDs
const [formData, setFormData] = useState({
  buffetCategoryIds: [], // Array of buffet category IDs
});

// Clean checkbox toggle
const handleBuffetToggle = (buffetId: string) => {
  setFormData(prev => ({
    ...prev,
    buffetCategoryIds: prev.buffetCategoryIds.includes(buffetId)
      ? prev.buffetCategoryIds.filter(id => id !== buffetId)
      : [...prev.buffetCategoryIds, buffetId],
  }));
};

// Simple submit
await updateMenuItem({
  id: itemId,
  data: {
    name: formData.name,
    categoryId: formData.categoryId,
    buffetCategoryIds: formData.buffetCategoryIds, // Just send the array
    price: formData.price,
  },
});
```

#### In Menu Display (`packages/desktop/src/app/menu/page.tsx`):

**Before:**
```typescript
// Complex filtering checking secondary/tertiary categories
const isInBuffet = 
  item.categoryId === buffetId ||
  item.secondaryCategoryId === buffetId ||
  item.tertiaryCategoryId === buffetId;
```

**After:**
```typescript
// Simple array check
const isInBuffet = item.buffetCategories?.some(bc => 
  bc.buffetCategory.id === buffetCategoryId
);
```

---

## API Examples

### Create Item with Multiple Buffets

```typescript
// POST /api/menu
const response = await fetch('/api/menu', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Caesar Salad',
    categoryId: 'appetizers-id',
    buffetCategoryIds: ['lunch-buffet-id', 'dinner-buffet-id'],
    price: 8.00,
  }),
});
```

Result: Item appears in Lunch Buffet, Dinner Buffet, AND All Items → Appetizers

### Update Item - Add to Buffet

```typescript
// PATCH /api/menu/:id
await fetch(`/api/menu/${itemId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    buffetCategoryIds: ['lunch-buffet-id'],
  }),
});
```

### Update Item - Remove from All Buffets

```typescript
// PATCH /api/menu/:id
await fetch(`/api/menu/${itemId}`, {
  method: 'PATCH',
  body: JSON.stringify({
    buffetCategoryIds: [], // Empty array removes all buffet assignments
  }),
});
```

### Fetch Items with Buffet Info

```typescript
const response = await fetch('/api/menu');
const data = await response.json();

// Each item now has:
data.data.menuItems.forEach(item => {
  console.log(item.name);
  console.log('Buffets:', item.buffetCategories.map(bc => bc.buffetCategory.name));
});
```

---

## Testing Checklist

After implementation, test these scenarios:

- [ ] Create new item WITHOUT buffet assignment → Appears only in All Items
- [ ] Create new item WITH one buffet → Appears in that buffet + All Items
- [ ] Create new item WITH multiple buffets → Appears in all selected buffets + All Items
- [ ] Edit item to ADD buffet assignment → Item now appears in new buffet
- [ ] Edit item to REMOVE specific buffet → Item removed from that buffet only
- [ ] Edit item to REMOVE all buffets → Item removed from all buffets, still in All Items
- [ ] Verify migrated items still show correct buffet assignments
- [ ] Verify All Items view always shows all items

---

## Rollback (If Needed)

If you need to revert:

1. Restore database from backup
2. Revert Prisma schema:
   ```bash
   git checkout HEAD^ packages/server/prisma/schema.prisma
   ```
3. Regenerate Prisma client
4. Revert code changes

---

## Files Modified

### Schema & Migration:
- ✅ `packages/server/prisma/schema.prisma` - New junction table
- ✅ `packages/server/prisma/migrations/add_buffet_junction_table/migration.sql` - Migration SQL
- ✅ `packages/server/migrate-buffet-categories.ts` - Migration script

### Server:
- ✅ `packages/shared/src/types.ts` - Updated types and DTOs
- ✅ `packages/server/src/services/menuService.ts` - Updated CRUD operations
- ✅ `packages/server/src/routes/menu.ts` - Updated API endpoints
- ✅ `packages/server/src/utils/menuTransform.ts` - Helper utilities (NEW)

### Documentation:
- ✅ `BUFFET_MANY_TO_MANY_IMPLEMENTATION.md` - Full implementation guide
- ✅ `EXAMPLE_UI_COMPONENTS.tsx` - Reference UI implementation
- ✅ `QUICK_START_BUFFET_MIGRATION.md` - This file

### To Be Updated (Desktop UI):
- ⏳ `packages/desktop/src/app/menu/[id]/page.tsx` - Edit form
- ⏳ `packages/desktop/src/app/menu/new/page.tsx` - Create form  
- ⏳ `packages/desktop/src/app/menu/page.tsx` - Menu display & filtering

---

## Support & Questions

### Common Issues:

**Q: Prisma generate fails with "cannot rename" error**  
A: Close any running Node processes, then retry `npx prisma generate`

**Q: Migration fails - data not migrated correctly**  
A: Check migration logs. The script validates and reports issues.

**Q: UI shows old structure (secondaryCategory, etc.)**  
A: The UI components need to be updated manually. See `EXAMPLE_UI_COMPONENTS.tsx` for reference.

**Q: How do I query items in a specific buffet?**  
A:
```typescript
const items = await prisma.menuItem.findMany({
  where: {
    buffetCategories: {
      some: { buffetCategoryId: 'lunch-buffet-id' },
    },
  },
  include: {
    buffetCategories: { include: { buffetCategory: true } },
  },
});
```

---

## Next Steps

1. ✅ Run migration script
2. ✅ Verify data migrated correctly
3. ⏳ Update desktop UI components
4. ⏳ Test all CRUD operations
5. ⏳ Update PWA if needed
6. ⏳ Deploy to production

For detailed implementation guide, see `BUFFET_MANY_TO_MANY_IMPLEMENTATION.md`
