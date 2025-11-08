# User Manual

Complete guide to using the Restaurant Management System.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard](#dashboard)
3. [Order Management](#order-management)
4. [Table Management](#table-management)
5. [Menu Management](#menu-management)
6. [Billing & POS](#billing--pos)
7. [Kitchen Display System](#kitchen-display-system)
8. [Settings](#settings)
9. [Customer Ordering (PWA)](#customer-ordering-pwa)
10. [User Roles & Permissions](#user-roles--permissions)

---

## Getting Started

### First Launch

When you launch the Restaurant Management System for the first time, you'll see a setup wizard that guides you through initial configuration.

#### Setup Wizard Steps

1. **Business Information**
   - Enter your restaurant name
   - Add business address
   - Upload logo (optional)
   - Set tax percentage
   - Choose currency

2. **Admin Account**
   - Create admin username
   - Set secure password
   - Confirm password

3. **Table Setup**
   - Specify number of tables
   - Choose naming convention (Table 1, Table 2, etc.)
   - QR codes are automatically generated

4. **Printer Configuration** (Optional)
   - Select printer type (Network, USB, Serial)
   - Enter connection details
   - Test print to verify

5. **Network Information**
   - View your LAN IP address
   - Note the URL for iPad access
   - QR codes are configured with this URL

### Login

After setup, you'll see the login screen:

1. Enter your username
2. Enter your password
3. Click "Login"

**Default Credentials** (if using seed data):
- Username: `admin`
- Password: `admin123`

> ⚠️ **Security**: Change the default password immediately after first login!

### Main Interface

After login, you'll see the main interface with:

- **Sidebar Navigation**: Access all features
- **Main Content Area**: Current page content
- **User Profile**: Shows logged-in user and role
- **Theme Toggle**: Switch between light and dark mode

---

## Dashboard

The Dashboard provides an at-a-glance view of your restaurant's operations.

### Metrics Cards

**Revenue Summary**
- **Daily Revenue**: Today's total sales
- **Weekly Revenue**: Last 7 days sales
- **Monthly Revenue**: Current month sales

**Order Statistics**
- **Active Orders**: Orders currently in progress
- **Pending Kitchen Orders**: Orders waiting to be prepared

**Table Occupancy**
- Visual representation of table status
- Free tables (green)
- Occupied tables (red)
- Reserved tables (yellow)

### Charts and Visualizations

**Top Selling Items**
- Bar chart showing best-selling menu items
- Displays quantity sold and revenue
- Updates in real-time

**Sales Trends**
- Line chart showing sales over time
- Helps identify peak hours and days

### Real-Time Updates

The dashboard updates automatically when:
- New orders are placed
- Orders are completed
- Tables change status
- Payments are processed

---

## Order Management

Manage all customer orders from placement to completion.

### Viewing Orders

**Order List View**

1. Navigate to **Orders** in the sidebar
2. See all orders with key information:
   - Order ID
   - Table name
   - Status
   - Total amount
   - Time created

**Filter Orders**

Use the status tabs to filter:
- **All**: Show all orders
- **Pending**: New orders awaiting kitchen
- **Preparing**: Orders being prepared
- **Ready**: Orders ready to serve
- **Served**: Orders delivered to customers
- **Paid**: Completed orders

**Search Orders**
- Use the search box to find orders by ID or table name

### Creating Orders (Manual)

1. Click **New Order** button
2. Select a table
3. Add menu items:
   - Click on items to add
   - Adjust quantities
   - Add special notes
4. Review order summary
5. Click **Place Order**

**What Happens Next:**
- Order appears in order list
- Kitchen receives notification
- Kitchen ticket prints automatically
- Table status changes to "Occupied"

### Order Details

Click on any order to view full details:

**Order Information**
- Order ID and timestamp
- Table assignment
- Current status

**Items List**
- Each item with quantity and price
- Special instructions
- Subtotal per item

**Price Breakdown**
- Subtotal
- Tax
- Discount (if applied)
- Service charge (if applied)
- Tip (if added)
- **Total**

### Updating Order Status

**Status Progression:**
```
Pending → Preparing → Ready → Served → Paid
```

**To Update Status:**
1. Open order details
2. Click status button (e.g., "Mark as Preparing")
3. Status updates across all interfaces
4. Kitchen display updates automatically

### Reprinting Receipts

1. Open order details
2. Click **Reprint Receipt** button
3. Choose receipt type:
   - Customer receipt (with prices)
   - Kitchen ticket (items only)

### Cancelling Orders

1. Open order details
2. Click **Cancel Order** button
3. Confirm cancellation
4. Order marked as cancelled
5. Table status returns to "Free"

> ⚠️ **Note**: Paid orders cannot be cancelled

---

## Table Management

Manage restaurant tables and QR codes for customer ordering.

### Viewing Tables

Navigate to **Tables** to see all tables with:
- Table name
- Current status (color-coded)
- Current order (if occupied)
- QR code access

**Status Colors:**
- 🟢 **Green**: Free
- 🔴 **Red**: Occupied
- 🟡 **Yellow**: Reserved

### Adding Tables

1. Click **Add Table** button
2. Enter table name (e.g., "Table 11", "VIP Table")
3. Click **Create**
4. QR code automatically generated

### Editing Tables

1. Click on a table card
2. Click **Edit** button
3. Update table name
4. Change status (Free, Occupied, Reserved)
5. Click **Save**

### Deleting Tables

1. Click on a table card
2. Click **Delete** button
3. Confirm deletion

> ⚠️ **Note**: Cannot delete tables with active orders

### QR Codes

Each table has a unique QR code for customer ordering.

**Viewing QR Code:**
1. Click on a table
2. Click **View QR Code**
3. QR code displays in modal

**Downloading QR Code:**
1. View QR code
2. Click **Download** button
3. Save as PNG image

**Printing QR Codes:**
1. Download QR code
2. Print using your preferred method
3. Place on table for customers to scan

**QR Code URL Format:**
```
http://[YOUR_IP]:5000/?table=[TABLE_ID]
```

### Bulk QR Code Generation

Generate all QR codes at once:

1. Go to **Settings** → **Server & QR**
2. Click **Generate All QR Codes**
3. Click **Download All QR Codes**
4. Receive ZIP file with all QR codes

---

## Menu Management

Manage your restaurant's menu items.

### Viewing Menu Items

Navigate to **Menu Management** to see all items.

**View Options:**
- Grid view (default)
- List view

**Filter Menu:**
- **By Category**: Appetizers, Main Course, Desserts, Beverages, etc.
- **By Availability**: Available, Unavailable, All

**Search Menu:**
- Use search box to find items by name

### Adding Menu Items

1. Click **Add Menu Item** button
2. Fill in details:
   - **Name**: Item name (required)
   - **Category**: Select category (required)
   - **Price**: Item price (required)
   - **Description**: Brief description
   - **Image**: Upload image (optional)
   - **Available**: Toggle availability
3. Click **Save**

**Image Guidelines:**
- Recommended size: 800x600 pixels
- Formats: JPG, PNG
- Max file size: 2MB

### Editing Menu Items

1. Click on a menu item
2. Update any field
3. Click **Save Changes**

**Quick Availability Toggle:**
- Click the availability switch on item card
- Item immediately marked available/unavailable
- Updates sync to PWA instantly

### Deleting Menu Items

1. Click on a menu item
2. Click **Delete** button
3. Confirm deletion

> ⚠️ **Note**: Cannot delete items that are in active orders

### Categories

**Default Categories:**
- Appetizers
- Main Course
- Desserts
- Beverages
- Specials

**Adding Custom Categories:**
1. Go to **Settings** → **Menu Categories**
2. Click **Add Category**
3. Enter category name
4. Click **Save**

---

## Billing & POS

Process payments and manage billing.

### POS Interface

Navigate to **Billing/POS** to see:

**Left Panel: Unpaid Orders**
- List of orders with status "Served"
- Shows table, items count, and total
- Click to select for payment

**Right Panel: Payment Processing**
- Selected order details
- Payment options
- Total calculation

### Processing Payments

1. **Select Order**
   - Click on an unpaid order from the list
   - Order details load in payment panel

2. **Review Order**
   - Verify items and quantities
   - Check subtotal

3. **Apply Adjustments** (Optional)
   - **Discount**: Enter percentage or fixed amount
   - **Service Charge**: Add service charge
   - **Tip**: Add tip amount
   - Total updates automatically

4. **Select Payment Method**
   - Cash
   - Card
   - Digital Wallet

5. **Process Payment**
   - Click **Process Payment** button
   - Enter reference number (for card/wallet)
   - Confirm payment

**What Happens Next:**
- Order status changes to "Paid"
- Table status changes to "Free"
- Customer receipt prints automatically
- Payment recorded in system

### Receipt Printing

**Automatic Printing:**
- Customer receipt prints when payment processed
- Kitchen ticket prints when order placed

**Manual Reprinting:**
1. Go to **Orders**
2. Find the order
3. Click **Reprint Receipt**

**Receipt Contents:**

*Customer Receipt:*
- Business logo and info
- Date and time
- Order ID
- Table number
- Itemized list with prices
- Subtotal, tax, discounts
- Total amount
- Payment method
- Thank you message

*Kitchen Ticket:*
- Order number
- Table number
- Items list (no prices)
- Special instructions
- Timestamp

### Split Bills

To split a bill:

1. Create separate orders for each split
2. Process payments individually
3. Each customer receives their own receipt

---

## Kitchen Display System

Real-time order display for kitchen staff.

### Accessing KDS

Navigate to **Kitchen Display System** in the sidebar.

**Recommended Setup:**
- Use a dedicated monitor or tablet
- Mount in kitchen area
- Ensure good visibility for all kitchen staff

### KDS Layout

**Column-Based View:**

```
┌─────────────┬─────────────┬─────────────┐
│   PENDING   │  PREPARING  │    READY    │
├─────────────┼─────────────┼─────────────┤
│  Order #123 │  Order #120 │  Order #118 │
│  Table 5    │  Table 3    │  Table 1    │
│  2 items    │  3 items    │  1 item     │
│  12:30 PM   │  12:25 PM   │  12:20 PM   │
└─────────────┴─────────────┴─────────────┘
```

### Order Tickets

Each order ticket shows:
- Order number
- Table name
- Items list with quantities
- Special instructions (highlighted)
- Time since order placed
- Color coding by urgency

**Color Coding:**
- 🟢 **Green**: Recent (< 10 minutes)
- 🟡 **Yellow**: Moderate (10-20 minutes)
- 🔴 **Red**: Urgent (> 20 minutes)

### Updating Order Status

**Method 1: Drag and Drop**
- Drag order ticket to next column
- Status updates automatically

**Method 2: Status Buttons**
- Click **Start Preparing** on pending orders
- Click **Mark as Ready** on preparing orders

**Status Flow:**
```
Pending → Preparing → Ready
```

### Real-Time Updates

KDS updates automatically when:
- New orders arrive (with sound notification)
- Orders are updated from other interfaces
- Orders are cancelled

**Sound Notifications:**
- Configurable in Settings
- Plays when new order arrives
- Can be muted if needed

### Filtering Orders

- **All Orders**: Show all active orders
- **My Station**: Filter by kitchen station (if configured)
- **Priority**: Show urgent orders first

---

## Settings

Configure system settings and preferences.

### Business Settings

**Business Information**
- Restaurant name
- Address
- Phone number
- Email
- Logo upload

**Financial Settings**
- Tax percentage
- Currency
- Service charge default
- Tip suggestions

**To Update:**
1. Go to **Settings** → **Business**
2. Edit fields
3. Click **Save Changes**

### Printer Settings

**Printer Configuration**

1. Go to **Settings** → **Printer**
2. Select printer type:
   - **Network Printer**: Enter IP address and port
   - **USB Printer**: Select from detected printers
   - **Serial Printer**: Enter COM port

3. Click **Test Print** to verify
4. Click **Save**

**Troubleshooting Printer:**
- Ensure printer is powered on
- Check network connection (for network printers)
- Verify USB connection (for USB printers)
- See [Troubleshooting Guide](./TROUBLESHOOTING.md)

### Server & QR Settings

**Server Configuration**
- View current server URL
- Change server port (requires restart)
- View LAN IP address

**QR Code Management**
- Generate all QR codes
- Download QR codes (individual or bulk)
- Regenerate QR codes after IP change

**To Regenerate QR Codes:**
1. Go to **Settings** → **Server & QR**
2. Click **Generate All QR Codes**
3. Click **Download All QR Codes**
4. Print and replace old QR codes

### Backup & Restore

**Create Backup**

1. Go to **Settings** → **Backup**
2. Click **Create Backup**
3. Choose save location
4. Backup file downloaded

**Backup Contents:**
- All orders
- Menu items
- Tables
- Users
- Settings
- Payment records

**Restore from Backup**

1. Go to **Settings** → **Backup**
2. Click **Restore Backup**
3. Select backup file
4. Confirm restoration
5. Application restarts

> ⚠️ **Warning**: Restoring will replace all current data!

**Backup Schedule:**
- Recommended: Daily backups
- Store backups in secure location
- Keep multiple backup versions

### Theme Settings

**Theme Options:**
- **Light**: Light background, dark text
- **Dark**: Dark background, light text
- **System**: Follow system preference

**To Change Theme:**
1. Go to **Settings** → **Appearance**
2. Select theme
3. Changes apply immediately

### User Management

**View Users**
1. Go to **Settings** → **Users**
2. See all user accounts

**Add User**
1. Click **Add User**
2. Enter username
3. Set password
4. Select role (Admin, Waiter, Chef)
5. Click **Create**

**Edit User**
1. Click on user
2. Update details
3. Change role if needed
4. Click **Save**

**Delete User**
1. Click on user
2. Click **Delete**
3. Confirm deletion

> ⚠️ **Note**: Cannot delete currently logged-in user

**Change Password**
1. Go to **Settings** → **Profile**
2. Click **Change Password**
3. Enter current password
4. Enter new password
5. Confirm new password
6. Click **Update**

---

## Customer Ordering (PWA)

Guide for customers using the iPad ordering system.

### Accessing the PWA

**Method 1: Scan QR Code**
1. Open camera app on iPad
2. Point at table QR code
3. Tap notification to open link
4. PWA loads automatically

**Method 2: Direct URL**
- Enter URL: `http://[SERVER_IP]:5000/?table=[TABLE_NUMBER]`

### Browsing Menu

**Menu Interface:**
- Category tabs at top
- Menu items in grid layout
- Each item shows:
  - Image
  - Name
  - Description
  - Price

**Filtering:**
- Tap category tabs to filter
- Use search box to find items

**Item Details:**
- Tap item card for full description
- View larger image
- See ingredients/allergens (if configured)

### Adding to Cart

1. Tap menu item
2. Adjust quantity using +/- buttons
3. Add special instructions (optional)
4. Tap **Add to Cart**

**Cart Badge:**
- Shows number of items in cart
- Located in top-right corner

### Reviewing Cart

1. Tap cart icon
2. Review items:
   - Name and quantity
   - Price per item
   - Subtotal
3. Adjust quantities if needed
4. Remove items by tapping X

**Price Breakdown:**
- Subtotal
- Tax
- **Total**

### Placing Order

1. Review cart
2. Add special instructions (optional)
3. Tap **Place Order**
4. Order confirmation appears
5. Order number displayed

**What Happens Next:**
- Order sent to kitchen
- Staff notified
- Kitchen starts preparing

### Tracking Order

**Order Status Screen:**
- Shows current order status
- Updates in real-time
- Estimated time remaining

**Status Indicators:**
```
📝 Pending    → Order received
👨‍🍳 Preparing  → Being cooked
✅ Ready      → Ready to serve
🍽️ Served     → Delivered to table
```

**Notifications:**
- Status changes trigger visual updates
- No need to refresh page

### Offline Support

**If Connection Lost:**
- Menu remains accessible (cached)
- Can continue browsing
- Orders queued automatically
- Sent when connection restored

**Offline Indicator:**
- Shows when not connected
- Orders marked as "pending sync"

### Calling for Assistance

**Call Waiter Button:**
- Located at bottom of screen
- Tap to notify staff
- Staff receives notification on desktop

---

## User Roles & Permissions

The system supports three user roles with different access levels.

### Admin

**Full System Access**

Can access all features:
- ✅ Dashboard
- ✅ Orders (view, create, update, cancel)
- ✅ Tables (view, create, edit, delete)
- ✅ Menu Management (full CRUD)
- ✅ Billing/POS
- ✅ Kitchen Display System
- ✅ Settings (all sections)
- ✅ Reports
- ✅ User Management

**Typical Users:**
- Restaurant owner
- Manager
- System administrator

### Waiter

**Front-of-House Operations**

Can access:
- ✅ Dashboard (view only)
- ✅ Orders (view, create, update)
- ✅ Tables (view, update status)
- ✅ Menu Management (view only)
- ✅ Billing/POS
- ❌ Kitchen Display System
- ❌ Settings
- ❌ Reports
- ❌ User Management

**Typical Users:**
- Waiters
- Servers
- Front desk staff

### Chef

**Kitchen Operations Only**

Can access:
- ❌ Dashboard
- ❌ Orders
- ❌ Tables
- ❌ Menu Management
- ❌ Billing/POS
- ✅ Kitchen Display System
- ❌ Settings
- ❌ Reports
- ❌ User Management

**Typical Users:**
- Chefs
- Kitchen staff
- Cooks

### Switching Users

**To Switch User:**
1. Click user profile in sidebar
2. Click **Logout**
3. Login with different credentials

**Multiple Devices:**
- Multiple users can be logged in simultaneously
- Each device maintains its own session
- Real-time updates sync across all devices

---

## Tips & Best Practices

### For Managers

1. **Regular Backups**: Create daily backups
2. **Monitor Dashboard**: Check metrics regularly
3. **Update Menu**: Keep menu items current
4. **Review Reports**: Analyze sales data weekly
5. **Train Staff**: Ensure all staff know their role's features

### For Waiters

1. **Check Orders**: Regularly check order status
2. **Update Status**: Mark orders as served promptly
3. **Process Payments**: Process payments immediately after service
4. **Table Management**: Update table status accurately

### For Kitchen Staff

1. **Monitor KDS**: Keep KDS visible at all times
2. **Update Status**: Update order status as you work
3. **Check Times**: Watch for orders turning red (urgent)
4. **Communicate**: Use notes to communicate with front-of-house

### For Customers (PWA)

1. **Scan QR Code**: Easiest way to access menu
2. **Review Cart**: Double-check order before submitting
3. **Add Notes**: Include special requests in notes
4. **Track Status**: Monitor order status screen

---

## Keyboard Shortcuts

Speed up your workflow with keyboard shortcuts:

### Global
- `Ctrl/Cmd + K`: Quick search
- `Ctrl/Cmd + B`: Toggle sidebar
- `Ctrl/Cmd + ,`: Open settings
- `Ctrl/Cmd + Q`: Logout

### Orders
- `Ctrl/Cmd + N`: New order
- `Ctrl/Cmd + F`: Focus search
- `Ctrl/Cmd + P`: Print receipt

### Menu
- `Ctrl/Cmd + N`: New menu item
- `Ctrl/Cmd + E`: Edit selected item

### Navigation
- `Ctrl/Cmd + 1`: Dashboard
- `Ctrl/Cmd + 2`: Orders
- `Ctrl/Cmd + 3`: Tables
- `Ctrl/Cmd + 4`: Menu
- `Ctrl/Cmd + 5`: Billing

---

## Getting Help

### In-App Help

- Hover over ? icons for tooltips
- Check status bar for system messages
- Review error messages for guidance

### Documentation

- [API Documentation](./API.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)
- [Deployment Guide](./DEPLOYMENT.md)

### Support

- Email: support@rms-system.com
- Documentation: Check docs folder
- GitHub Issues: Report bugs and request features

---

## Appendix

### Glossary

- **Order Status**: Current state of an order in its lifecycle
- **Table Status**: Current availability of a table
- **QR Code**: Quick Response code for customer ordering
- **PWA**: Progressive Web App for customer interface
- **KDS**: Kitchen Display System
- **POS**: Point of Sale system
- **ESC/POS**: Standard printer protocol

### Order Status Definitions

- **Pending**: Order received, awaiting kitchen
- **Preparing**: Kitchen is preparing the order
- **Ready**: Order is ready to be served
- **Served**: Order delivered to customer
- **Paid**: Payment completed
- **Cancelled**: Order cancelled

### Table Status Definitions

- **Free**: Table available for seating
- **Occupied**: Table has active order
- **Reserved**: Table reserved for future customer

---

**Document Version**: 1.0  
**Last Updated**: 2024  
**For**: Restaurant Management System v1.0
