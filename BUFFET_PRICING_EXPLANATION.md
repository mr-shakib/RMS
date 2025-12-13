# Buffet Pricing - How It Works

## Overview
The system supports **two types of pricing** for buffet orders:
1. **Included Items** - Part of the buffet price (free)
2. **Always Priced Items** - Charged separately even in buffet mode

## Why Some Items Are Charged in Buffet?

This is **intentional behavior** for premium items like:
- 🥤 **Beverages** (soft drinks, juices, alcohol)
- 🍰 **Premium Desserts** 
- 🦞 **Premium Seafood** (lobster, crab legs)
- 🍷 **Wine & Spirits**

### Example: Dinner Buffet ($29.99)
- ✅ **Rice, Noodles, Curry** - Included (free)
- ✅ **Chicken, Beef, Vegetables** - Included (free)  
- ✅ **Regular Desserts** - Included (free)
- ❌ **Coca Cola ($2.50)** - Always charged separately
- ❌ **Premium Ice Cream ($5.00)** - Always charged separately

### How It's Calculated
```
Customer orders Dinner Buffet:
- Buffet price: $29.99
- Rice (included): $0.00
- Chicken Curry (included): $0.00
- Fried Noodles (included): $0.00
- Coca Cola (always priced): $2.50
--------------------------------------
Subtotal: $32.49  ← Buffet + Always Priced items
Tax (10%): $3.25
--------------------------------------
Total: $35.74
```

## How to Configure

### Option 1: All Items Included (Current Setup)
✅ **Your current setup** - All buffet items are FREE, nothing is charged extra.

To verify:
1. Open Desktop App
2. Go to **Menu**
3. Check any item
4. "Always Priced" checkbox should be **unchecked**

### Option 2: Charge Some Items Separately
If you want to charge beverages/desserts extra:

1. Open Desktop App → **Menu**
2. Find the item (e.g., "Coca Cola")
3. Click **Edit**
4. Check ☑️ **"Always Priced"** checkbox
5. This item will now be charged even in buffet orders

## Checking Your Current Setup

Run the app and check:
```
Menu → Categories → Find your buffet category
- Buffet Price: $XX.XX (flat rate)

Menu → Items → Click any buffet item
- Always Priced: ☐ Unchecked = Included in buffet
- Always Priced: ☑️ Checked = Charged separately
```

## Common Scenarios

### Scenario 1: Customer Complains About Extra Charges
**Problem**: Customer ordered buffet but sees extra charges  
**Cause**: Some items are marked as "Always Priced"  
**Solution**: 
- Uncheck "Always Priced" for those items
- OR explain to customer these are premium add-ons

### Scenario 2: Want to Charge for All Beverages
**Solution**:
1. Go to Menu → Items
2. Filter by category "Beverages"
3. Edit each beverage
4. Check ☑️ "Always Priced"
5. Save

### Scenario 3: Want Everything Included in Buffet
**Solution** (This is your current setup):
- Keep all items with "Always Priced" **unchecked**
- Only the buffet category price is charged
- All items are FREE

## Technical Details

### Database Field
- Table: `MenuItem`
- Field: `alwaysPriced` (boolean)
- Default: `false` (included in buffet)

### Code Logic
```typescript
// In orderService.ts
if (isBuffet) {
  subtotal = buffetCategory.buffetPrice; // e.g., $29.99
  
  for (each item) {
    if (item.alwaysPriced) {
      subtotal += item.price * quantity; // Add extra charge
    } else {
      // Item is FREE - included in buffet
    }
  }
}
```

## Quick Check

To see which items (if any) are charged extra in buffet:

1. **Desktop App**:
   - Menu → Items
   - Look for items with "Always Priced" badge

2. **During Order**:
   - Check receipt line items
   - Items with $0.00 price = Included
   - Items with price > $0.00 = Extra charge

## Current Status

Based on the database check:
✅ **No items are marked as "Always Priced"**  
✅ **All buffet items are included in the buffet price**  
✅ **Customers only pay the flat buffet rate**

If you're seeing individual prices being charged in buffet orders, please:
1. Show me a specific order example
2. Check if the order was actually placed as a buffet order (isBuffet = true)
3. Verify the buffet category is properly configured

---

**Need Help?**
- To charge beverages separately: Edit beverage items → Check "Always Priced"
- To include everything: Keep all items with "Always Priced" unchecked ✅ (current)
- To check orders: Desktop App → Orders → View specific order details
