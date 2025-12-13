# Buffet Order Bug Fix

## Problem
**All items are being charged individually even in buffet mode.**

## Root Cause Analysis

After reviewing the code, the issue is likely one of these scenarios:

### Scenario 1: PWA Not Sending Correct Data ❌
The PWA might not be properly sending:
- `isBuffet: true`
- `buffetCategoryId: "actual-id"`

**Check**: Look at network tab when placing buffet order

### Scenario 2: Buffet Category Missing buffetPrice ❌  
If `buffetPrice` is `null` or `0`:
```typescript
subtotal = (category.buffetPrice || 0) * buffetQuantity;
// If buffetPrice is 0, subtotal becomes 0
// Then items might be calculated differently
```

### Scenario 3: All Items Have alwaysPriced Flag ❌
We already confirmed this is NOT the case (checked database).

## Debug Steps Added

Added debug logging to `orderService.ts`:

```typescript
console.log('🍽️  ORDER DEBUG:', {
  tableId,
  isBuffet,
  buffetCategoryId,
  buffetQuantity,
  itemCount: items.length
});

console.log(`🎫 First buffet order - Buffet: ${category.name}, Price: $${category.buffetPrice}, Quantity: ${buffetQuantity}, Subtotal: $${subtotal}`);
```

## How to Test

### Step 1: Rebuild Production App
```powershell
cd C:\personal\project\RMS\packages\desktop
.\build-and-package.ps1
```

### Step 2: Install and Run
1. Install the new `.exe`
2. Open the app
3. Open server logs (they'll show in console)

### Step 3: Place Buffet Order from PWA
1. Scan QR code from any table
2. Select buffet category
3. Add some items
4. Place order

### Step 4: Check Server Logs
Look for:
```
🍽️  ORDER DEBUG: { tableId: 1, isBuffet: true, buffetCategoryId: 'xxx', ... }
🎫 First buffet order - Buffet: Dinner Buffet, Price: $29.99, Quantity: 1, Subtotal: $29.99
```

## Expected Behavior

### Correct Buffet Order:
```
ORDER DEBUG: {
  tableId: 1,
  isBuffet: true,              ← Should be true
  buffetCategoryId: 'abc-123', ← Should have ID
  buffetQuantity: 1,
  itemCount: 5
}

First buffet order - Buffet: Dinner Buffet, Price: $29.99, Quantity: 1, Subtotal: $29.99
```

### What We'll See if Bug Exists:
```
ORDER DEBUG: {
  tableId: 1,
  isBuffet: false,             ← BUG: Should be true!
  buffetCategoryId: undefined, ← BUG: Missing!
  buffetQuantity: 1,
  itemCount: 5
}
```

## Potential Fixes

### Fix 1: PWA Not Sending Data
If logs show `isBuffet: false` or `buffetCategoryId: undefined`:

**File**: `packages/pwa/src/cartPage.ts`
```typescript
const orderData = {
  tableId: parseInt(tableId),
  isBuffet: buffetMode.isBuffet,        // Make sure this is true
  buffetCategoryId: buffetMode.category?.id, // Make sure this exists
  items: this.cartItems.map((item) => ({
    menuItemId: item.menuItem.id,
    quantity: item.quantity,
    notes: item.notes || this.specialInstructions,
  })),
};

// Add this debug log:
console.log('📤 Sending order:', orderData);
```

### Fix 2: Buffet Category Missing Price
If logs show `Price: $0` or `Price: $null`:

1. Open Desktop App → Menu → Categories
2. Find buffet category
3. Edit it
4. Set Buffet Price (e.g., 29.99)
5. Save

### Fix 3: Server Not Receiving Data
If PWA sends correct data but server doesn't receive it:

**File**: `packages/server/src/routes/pwa.ts`  
Add debug log:
```typescript
router.post('/order', async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('📥 Received order:', req.body); // Add this
    const { tableId, items, notes, isBuffet, buffetCategoryId } = req.body;
    //...
```

## Quick Fix (Manual Override)

If you need a temporary fix while debugging, you can force buffet pricing in desktop billing:

1. Open Desktop App → Billing
2. Select table
3. Click "Add Buffet" button instead of individual items
4. This will charge flat buffet rate correctly

## Next Steps

1. **Build** the updated app with debug logs
2. **Test** a buffet order
3. **Check** logs to see what values are being received
4. **Report** back what the logs show

The debug output will tell us exactly where the problem is!
