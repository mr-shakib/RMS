# Multi-Printer Quick Start Guide

## 🚀 Quick Setup (5 Minutes)

### Step 1: Run Migration
```powershell
cd packages\server
npx prisma migrate dev --name add-multi-printer-support
npx prisma generate
```

### Step 2: Start Server
```powershell
# In server directory
npm run dev
```

### Step 3: Configure Printers
1. Open Desktop App
2. Go to **Settings** → **Printer** tab
3. Click **+ Add Printer**
4. Fill in:
   - **Name**: "Kitchen Printer"
   - **Type**: Network
   - **IP Address**: "192.168.1.212" (from demoprint.js)
   - **Port**: "9100"
   - **Categories**: Check "Main Course", "Appetizers", etc.
5. Click **Add Printer**
6. Click **Test Print** ✅

### Step 4: Test It!
1. Create an order with items from different categories
2. Watch items print on their assigned printers automatically! 🎉

## 📝 Example Configuration

### Scenario: 3-Station Restaurant

**Kitchen Printer** (192.168.1.100)
```
Name: Kitchen Printer
Type: Network
IP: 192.168.1.100
Port: 9100
Categories: ✓ Main Course
            ✓ Appetizers
            ✓ Sides
```

**Bar Printer** (192.168.1.101)
```
Name: Bar Printer
Type: Network
IP: 192.168.1.101
Port: 9100
Categories: ✓ Drinks
            ✓ Cocktails
```

**Dessert Printer** (192.168.1.102)
```
Name: Dessert Station
Type: Network
IP: 192.168.1.102
Port: 9100
Categories: ✓ Desserts
            ✓ Ice Cream
```

## 🎯 How It Works

### When Order is Created:
```
Order #1234:
- Burger (Main Course) → 🖨️ Kitchen Printer
- Fries (Sides) → 🖨️ Kitchen Printer
- Coke (Drinks) → 🖨️ Bar Printer
- Ice Cream (Desserts) → 🖨️ Dessert Printer
```

**All print simultaneously!** ⚡

### When Payment is Made:
```
Customer Receipt → 🖨️ First Available Printer
(Complete order with all items)
```

## 🛠️ Common Operations

### Add Printer
Settings → Printer → **+ Add Printer**

### Edit Printer
Click **Configure** button on printer card

### Test Printer
Click **Test Print** button

### Delete Printer
Click **🗑️** trash icon → Confirm

### Assign Categories
Edit printer → Check/uncheck categories → Save

## ⚡ Pro Tips

1. **One Category, Multiple Printers**: If you have backup printers, assign the same category to multiple printers. Orders will print on all!

2. **Test Before Going Live**: Always click **Test Print** after adding a printer

3. **Check Server Logs**: If printing fails, check server console for detailed error messages

4. **Printer Naming**: Use descriptive names like "Kitchen Main", "Bar Station 1", "Dessert Prep"

5. **Network Printers**: Make sure printer IP is static (not DHCP) to avoid connection issues

## 🔍 Troubleshooting

### Printer Not Printing?
1. ✓ Is printer powered on?
2. ✓ Is printer on same network?
3. ✓ Click **Test Print** - does it work?
4. ✓ Is printer marked as "Active"?
5. ✓ Are categories assigned?

### Category Not Printing?
1. ✓ Edit printer
2. ✓ Check category is selected
3. ✓ Save changes
4. ✓ Create new order to test

### Wrong Printer Printing?
1. ✓ Check category assignments
2. ✓ Item might be in wrong category
3. ✓ Edit categories if needed

## 📊 Printer Status Indicators

- 🟢 **Green Check**: Printer is active and ready
- ⚪ **Gray X**: Printer is inactive
- 🔴 **Test Print Failed**: Connection issue

## 🎨 UI Features

### Printer Card Shows:
- ✓ Printer name and type
- ✓ Connection details (IP:Port or USB IDs)
- ✓ Active/Inactive status
- ✓ Assigned categories (as badges)
- ✓ Quick action buttons

### Modal Features:
- ✓ Full configuration form
- ✓ Type-specific fields (Network/USB/Serial)
- ✓ Category checklist
- ✓ Active toggle
- ✓ Validation

## 📚 More Information

- Full details: `MULTI_PRINTER_IMPLEMENTATION.md`
- Migration guide: `packages/server/MULTI_PRINTER_MIGRATION.md`
- Example code: `demoprint.js`

## ⚠️ Important Notes

1. **Database Migration Required**: Must run Prisma migration before using
2. **Category Assignment**: Items won't print if category has no printer
3. **Backward Compatible**: Old single-printer settings won't interfere
4. **Auto-Initialize**: Printers connect automatically on server startup

## 🎉 Success Checklist

- [ ] Migration completed
- [ ] Server restarted
- [ ] Printer(s) added in UI
- [ ] Categories assigned
- [ ] Test print successful
- [ ] Order created and printed correctly
- [ ] Customer receipt printed on payment

**You're ready to go!** 🚀
