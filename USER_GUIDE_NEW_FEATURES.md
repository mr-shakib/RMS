# Quick User Guide: New Features

## 🎯 Feature 1: Multiple Orders Per Table Payment

### How It Works
- A table can have multiple orders (e.g., different courses, additional drinks)
- Each order is tracked separately
- Payment can be processed for each order individually
- Table becomes FREE only when ALL orders are paid

### How to Use
1. Go to **Billing** page
2. View all unpaid orders grouped by table
3. Select an order to process payment
4. Process payment (Cash, Card, or Wallet)
5. Table remains OCCUPIED if other orders are still active
6. Table automatically becomes FREE when last order is paid

---

## 🍽️ Feature 2: Flexible Buffet Assignment

### How It Works
Items can be assigned to:
- **All Items menu only** (regular ordering)
- **Dinner Buffet** (appears in both Dinner Buffet AND All Items)
- **Launch/Lunch Buffet** (appears in both Launch Buffet AND All Items)

### How to Use

**When Adding a New Item:**
1. Go to **Menu Management** → **Add Menu Item**
2. Choose the main category:
   - Click **"All Items"** - Item appears only in regular menu
   - Click **"Dinner Buffet"** - Item appears in Dinner Buffet + All Items
   - Click **"Launch Buffet"** - Item appears in Launch Buffet + All Items
3. Select subcategory (Main Course, Appetizer, Dessert, etc.)
4. Enter item name, price, and other details
5. Save

**Example:**
- Item: "Grilled Salmon"
- Main Category: **Dinner Buffet**
- Subcategory: **Main Course**
- Price: €15.00

Result:
- Appears in **Dinner Buffet** menu (covered by buffet flat price)
- Appears in **All Items → Main Course** (charged €15.00 if ordered individually)

---

## 🥤 Feature 3: Always-Priced Items (Beverages & Desserts)

### What It Does
Marks certain items (beverages, desserts) to ALWAYS be charged individually, even when customer orders a buffet.

### Why It Matters
**Before:** Customer orders Dinner Buffet → All items included, even drinks and desserts
**Now:** Customer orders Dinner Buffet + Coca-Cola → Buffet price + Coca-Cola price

### How to Use

**Auto-Detection (Recommended):**
When you add an item in these categories, it's automatically marked:
- Beverages
- Drinks  
- Desserts
- Sweets

**Manual Control:**
1. Go to **Menu Management**
2. Click on an item (or add new item)
3. Find the checkbox: **"Always price individually (even in buffet)"**
4. Check/uncheck as needed
5. Save

### Examples

**Example 1: Beverage**
- Name: "Orange Juice"
- Category: Beverages
- Price: €3.50
- Always Priced: ✅ (auto-checked)

Customer Order:
- Lunch Buffet: €19.99
- 1x Orange Juice: €3.50
- **Total: €23.49**

**Example 2: Dessert**
- Name: "Chocolate Cake"
- Category: Desserts
- Price: €6.00
- Always Priced: ✅ (auto-checked)

Customer Order:
- Dinner Buffet: €29.99
- 1x Chocolate Cake: €6.00
- **Total: €35.99**

**Example 3: Regular Buffet Item**
- Name: "Pasta Carbonara"
- Category: Main Course
- Price: €12.00
- Always Priced: ☐ (unchecked)

Customer Order:
- Dinner Buffet: €29.99
- Pasta Carbonara: **Included** (no extra charge)
- **Total: €29.99**

---

## 📋 Quick Tips

### For Admin/Manager:

**Setting Up Buffets:**
1. Create buffet categories (Dinner Buffet, Lunch Buffet) in **Categories**
2. Set buffet prices (e.g., €29.99 for Dinner, €19.99 for Lunch)
3. When adding items, select which buffet(s) they belong to
4. Beverages and desserts are auto-marked as always-priced

**Processing Payments:**
1. Go to **Billing** page
2. All unpaid orders are shown by table
3. Select order → Process payment
4. Receipt automatically prints
5. Table freed when all orders paid

### For Waiters:

**Taking Buffet Orders:**
1. Customer selects buffet (Lunch or Dinner)
2. They can order unlimited items from that buffet category
3. If they want drinks/desserts, those are charged extra
4. System automatically calculates correct total

**Taking Regular Orders:**
1. Customer orders from All Items menu
2. Each item charged at individual price
3. No buffet discount applies

---

## ❓ FAQs

**Q: Can an item be in both Lunch and Dinner buffet?**
A: Not directly, but you can create two separate items (one in each buffet) with the same name. Each can have different pricing if needed.

**Q: What if I want water to be free in buffet?**
A: Uncheck "Always price individually" for that item. It will be included in buffet.

**Q: Can I change alwaysPriced setting for existing items?**
A: Yes! Just edit the item and check/uncheck the box.

**Q: What happens if table has multiple unpaid orders and I pay one?**
A: Table stays OCCUPIED until you pay all orders. This allows flexible payment handling.

**Q: Do always-priced items show differently on the menu?**
A: On customer PWA menu, buffet items show "Included" label. Always-priced items show their individual price even in buffet view.

---

## 🚀 Getting Started Checklist

- [ ] Create/verify buffet categories exist (Lunch Buffet, Dinner Buffet)
- [ ] Set buffet prices in category settings
- [ ] Add items to buffets using new category selection
- [ ] Verify beverages/desserts are marked as always-priced
- [ ] Test creating a buffet order with drinks
- [ ] Verify total calculation is correct
- [ ] Process a payment for buffet order
- [ ] Confirm receipt prints correctly

---

*For technical questions or issues, refer to IMPLEMENTATION_SUMMARY_DEC_2_2025.md*
