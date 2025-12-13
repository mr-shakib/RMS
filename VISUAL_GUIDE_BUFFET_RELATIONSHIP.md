# Visual Guide: Item-Buffet Category Relationship

## Database Structure

### Before (Old Approach - Limited to 2 Buffets)
```
┌─────────────────────────────────────────────────────┐
│                    MenuItem                          │
├─────────────────────────────────────────────────────┤
│ id                                                   │
│ name                                                 │
│ categoryId ───────────────┐                         │
│ secondaryCategoryId ──┐   │ (Limited: Only 2 slots) │
│ tertiaryCategoryId ────┼───┼─► Could point to       │
│ price                  │   │   buffet OR regular     │
└────────────────────────┼───┼─  category (confusing) │
                         │   │                         │
                         ▼   ▼                         │
                    ┌──────────────┐                   │
                    │   Category   │                   │
                    ├──────────────┤                   │
                    │ id           │                   │
                    │ name         │                   │
                    │ isBuffet     │                   │
                    └──────────────┘                   │
```

**Problems:**
- ❌ Limited to 2 buffet assignments
- ❌ Unclear what secondary/tertiary represent
- ❌ Can't distinguish between buffet and regular categories
- ❌ Complex logic to manage assignments

---

### After (New Approach - Many-to-Many)
```
┌──────────────────┐                 ┌─────────────────────────┐                 ┌─────────────────┐
│    MenuItem      │                 │ MenuItemBuffetCategory  │                 │    Category     │
├──────────────────┤                 │    (Junction Table)     │                 ├─────────────────┤
│ id               │                 ├─────────────────────────┤                 │ id              │
│ name             │◄────────────────┤ menuItemId              │                 │ name            │
│ categoryId ──────┼────────┐        │ buffetCategoryId        ├────────────────►│ isBuffet        │
│ price            │        │        │ createdAt               │                 │ buffetPrice     │
│ description      │        │        └─────────────────────────┘                 └─────────────────┘
│ available        │        │                                                              │
└──────────────────┘        │                                                              │
                            │                                                              │
                            └──────────────────────────────────────────────────────────────┘
                                           (Regular category for "All Items")
```

**Benefits:**
- ✅ Unlimited buffet assignments
- ✅ Clear separation: `categoryId` = All Items, junction = buffet assignments
- ✅ Easy to add/remove buffet assignments
- ✅ Standard database pattern

---

## Data Flow Examples

### Example 1: Item in "All Items" Only

```
┌────────────────────────┐
│ MenuItem: "Fries"      │
│ categoryId: "sides"    │
│ price: €3.50           │
└────────────────────────┘
           │
           │ (No junction records)
           │
           ▼
    [Empty junction table]

Result: Appears in "All Items → Sides" ONLY
```

---

### Example 2: Item in Multiple Buffets

```
┌───────────────────────────────┐
│ MenuItem: "Caesar Salad"      │
│ categoryId: "appetizers"      │◄─────┐
│ price: €8.00                  │      │
└───────────────────────────────┘      │
           │                            │
           │ Has 2 junction records     │ (All Items category)
           │                            │
           ▼                            │
┌────────────────────────────────┐     │     ┌──────────────────────┐
│ MenuItemBuffetCategory #1      │     └────►│ Category: Appetizers │
│ menuItemId: salad-id           │           │ isBuffet: false      │
│ buffetCategoryId: lunch-id ────┼──────────►│ (Regular category)   │
└────────────────────────────────┘           └──────────────────────┘
           │
           │
           ▼
┌────────────────────────────────┐
│ MenuItemBuffetCategory #2      │
│ menuItemId: salad-id           │           ┌──────────────────────┐
│ buffetCategoryId: dinner-id ───┼──────────►│ Category: Dinner     │
└────────────────────────────────┘           │ isBuffet: true       │
                                              │ buffetPrice: €25     │
                                              └──────────────────────┘
                                                       │
                                                       ▼
                                              ┌──────────────────────┐
                                              │ Category: Lunch      │
                                              │ isBuffet: true       │
                                              │ buffetPrice: €15     │
                                              └──────────────────────┘

Result: "Caesar Salad" appears in:
- ✅ All Items → Appetizers (€8.00 per item)
- ✅ Lunch Buffet (covered by €15 buffet price)
- ✅ Dinner Buffet (covered by €25 buffet price)
```

---

## Query Patterns

### Get All Items with Buffet Info
```typescript
const items = await prisma.menuItem.findMany({
  include: {
    category: true,                    // Primary category (All Items)
    buffetCategories: {                // Many-to-many relation
      include: {
        buffetCategory: true,          // Buffet category details
      },
    },
  },
});

// Result structure:
{
  id: "item-1",
  name: "Caesar Salad",
  categoryId: "appetizers-id",
  category: { id: "...", name: "Appetizers", isBuffet: false },
  buffetCategories: [
    {
      id: "junction-1",
      buffetCategory: { id: "lunch-id", name: "Lunch", isBuffet: true, buffetPrice: 15 }
    },
    {
      id: "junction-2",
      buffetCategory: { id: "dinner-id", name: "Dinner", isBuffet: true, buffetPrice: 25 }
    }
  ],
  price: 8.00
}
```

### Filter Items by Buffet
```typescript
// Get only items in Lunch Buffet
const lunchItems = await prisma.menuItem.findMany({
  where: {
    buffetCategories: {
      some: {
        buffetCategoryId: "lunch-buffet-id"
      }
    }
  }
});
```

### Get Items NOT in Any Buffet
```typescript
// Get items in "All Items" only
const allItemsOnly = await prisma.menuItem.findMany({
  where: {
    buffetCategories: {
      none: {}  // No buffet assignments
    }
  }
});
```

---

## UI Component Structure

### Menu Item Form

```
┌─────────────────────────────────────────┐
│  Add/Edit Menu Item                     │
├─────────────────────────────────────────┤
│                                         │
│  Name: [Caesar Salad_______________]   │
│                                         │
│  Category (All Items):                  │
│  [▼ Appetizers         ]                │
│                                         │
│  Price: [€8.00]                         │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ Add to Buffet (Optional)          │ │
│  ├───────────────────────────────────┤ │
│  │ ☑ Lunch Buffet (€15.00)          │ │
│  │ ☑ Dinner Buffet (€25.00)         │ │
│  │ ☐ Weekend Brunch (€20.00)        │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ✓ This item will appear in:            │
│    • Lunch Buffet                       │
│    • Dinner Buffet                      │
│    • All Items menu (€8.00)             │
│                                         │
│  [Save] [Cancel]                        │
└─────────────────────────────────────────┘
```

### Menu Display with Badges

```
All Items → Appetizers
┌────────────────────────────────────────┐
│  Caesar Salad                €8.00    │
│  Fresh romaine, parmesan...           │
│  [Lunch] [Dinner]              [Edit] │
└────────────────────────────────────────┘
```

---

## Comparison Summary

| Aspect | Old Approach | New Approach |
|--------|-------------|--------------|
| Max Buffets | 2 (secondary + tertiary) | Unlimited |
| Clarity | Confusing (what is secondary?) | Clear (junction table) |
| Flexibility | Limited | High |
| Scalability | Poor | Excellent |
| Data Integrity | Manual management | Automatic (CASCADE) |
| Query Complexity | Medium | Simple |
| Standards | Non-standard workaround | Industry standard |

---

## Real-World Scenarios

### Scenario 1: Restaurant with 3 Buffets
**Requirement:** Lunch, Dinner, and Weekend Brunch buffets

**Old Approach:**
- ❌ Can only assign to 2 buffets
- ❌ Would need complex workarounds or multiple item duplicates

**New Approach:**
- ✅ Simply assign `buffetCategoryIds: ['lunch', 'dinner', 'brunch']`
- ✅ Item appears in all 3 buffets automatically

### Scenario 2: Seasonal Menu Item
**Requirement:** Add "Pumpkin Soup" to Lunch and Dinner in October, remove in November

**Old Approach:**
- ❌ Edit item, manually update secondary/tertiary categories
- ❌ Risk of data inconsistency

**New Approach:**
- ✅ October: `PATCH /api/menu/:id { buffetCategoryIds: ['lunch', 'dinner'] }`
- ✅ November: `PATCH /api/menu/:id { buffetCategoryIds: [] }`
- ✅ Item stays in All Items, just removed from buffets

### Scenario 3: Remove Dinner Buffet, Keep Lunch
**Requirement:** Item should only appear in Lunch Buffet

**Old Approach:**
- ❌ Manually determine which field (secondary or tertiary) has which buffet
- ❌ Complex logic to update correctly

**New Approach:**
- ✅ Simply: `PATCH /api/menu/:id { buffetCategoryIds: ['lunch'] }`
- ✅ Replaces ALL buffet assignments with just Lunch

---

This visual guide should help you understand the new architecture and how to work with the many-to-many relationship!
