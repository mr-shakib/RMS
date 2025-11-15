# Restaurant Management System (RMS)

A comprehensive Point of Sale (POS) solution built with Electron, Next.js, Express, and SQLite/PostgreSQL. This system provides a complete restaurant management solution with desktop management interface, local API server, and Progressive Web App for customer-facing iPad ordering.

---

## 🚀 Quick Setup for New Developers

**Never worked with this project? Start here!**

```bash
# 1. Clone the repository
git clone https://github.com/your-org/restaurant-management-system.git
cd restaurant-management-system

# 2. Install dependencies (takes 2-5 min)
npm install

# 3. Setup database
npm run prisma:generate --workspace=packages/server
npm run prisma:migrate --workspace=packages/server
npm run prisma:seed --workspace=packages/server

# 4. Setup PWA (for iPad ordering)
npm run setup:pwa

# 5. Start the application
npm run dev
```

**Login credentials**: `admin` / `admin123`

**That's it!** The desktop app will open automatically. For detailed instructions, continue reading below.

---

## 📋 Table of Contents

- [Quick Setup for New Developers](#-quick-setup-for-new-developers)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation & Setup](#installation--setup)
- [Quick Start Guide](#quick-start-guide)
- [Testing the Application](#testing-the-application)
- [Development Guide](#development-guide)
- [Building & Packaging](#building--packaging)
- [Configuration](#configuration)
- [Troubleshooting](#troubleshooting)
- [Documentation](#documentation)
- [Technology Stack](#technology-stack)
- [License](#license)

## ✨ Features

### Desktop Application (Staff Interface)
- **Dashboard**: Real-time metrics, revenue summaries, and business analytics
- **Order Management**: Create, view, edit, and track orders through their lifecycle
- **Table Management**: Manage tables with QR code generation for customer ordering
- **Menu Management**: Full CRUD operations for menu items with categories and availability
- **Point of Sale (POS)**: Process payments with multiple payment methods, discounts, and tips
- **Kitchen Display System (KDS)**: Real-time order display for kitchen staff
- **Settings**: Configure business details, printer settings, and system parameters
- **Reporting**: Generate sales reports, top-selling items, and order history
- **Multi-user Authentication**: Role-based access control (Admin, Waiter, Chef)

### Progressive Web App (Customer Interface)
- **Menu Browsing**: Browse available menu items by category
- **Shopping Cart**: Add items, adjust quantities, and review orders
- **Order Placement**: Submit orders directly from iPad devices
- **Order Tracking**: Real-time order status updates
- **Offline Support**: Cache menu data and queue orders during network interruptions

### Backend Features
- **Real-time Updates**: WebSocket-based synchronization across all interfaces
- **Receipt Printing**: ESC/POS compatible printer support
- **Database Management**: SQLite for local deployments, PostgreSQL for cloud
- **QR Code Generation**: Automatic QR code generation for table-based ordering
- **Data Export**: Backup and restore functionality

## 📁 Project Structure

This is a monorepo containing the following packages:

```
restaurant-management-system/
├── packages/
│   ├── desktop/              # Electron + Next.js desktop application
│   │   ├── electron/         # Electron main process
│   │   ├── src/app/          # Next.js pages and components
│   │   └── package.json
│   ├── server/               # Express API server
│   │   ├── src/              # Server source code
│   │   ├── prisma/           # Database schema and migrations
│   │   └── package.json
│   ├── pwa/                  # Progressive Web App
│   │   ├── src/              # PWA source code
│   │   └── package.json
│   └── shared/               # Shared TypeScript types
│       ├── src/              # Type definitions and enums
│       └── package.json
├── scripts/                  # Build and setup scripts
├── docs/                     # Documentation
└── package.json              # Root workspace configuration
```

For detailed structure information, see [PROJECT_STRUCTURE.md](./PROJECT_STRUCTURE.md).

## 🔧 Prerequisites

Before you begin, ensure you have the following installed on your system:

### Required Software

- **Node.js** >= 20.0.0 ([Download here](https://nodejs.org/))
  - Verify installation: `node --version`
  - Should output v20.x.x or higher
  
- **npm** >= 10.0.0 (comes with Node.js)
  - Verify installation: `npm --version`
  - Should output 10.x.x or higher

- **Git** (for cloning the repository)
  - [Download here](https://git-scm.com/)
  - Verify installation: `git --version`

### Operating System Support

- ✅ Windows 10/11
- ✅ macOS 10.15 (Catalina) or higher
- ✅ Linux (Ubuntu 20.04+, Fedora 36+, or equivalent)

### Optional Hardware

- **Receipt Printer**: ESC/POS compatible printer (for printing receipts)
- **iPad/Tablet**: For customer ordering via Progressive Web App
- **WiFi Network**: Required for iPad ordering feature

### System Requirements

- **RAM**: Minimum 4GB, recommended 8GB
- **Disk Space**: ~1GB for development, ~500MB for production
- **Ports**: 3000, 5000 (must be available)

## 🚀 Installation & Setup

Follow these steps carefully to set up the Restaurant Management System for development.

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone https://github.com/your-org/restaurant-management-system.git

# Navigate to the project directory
cd restaurant-management-system
```

### Step 2: Install Dependencies

This project uses npm workspaces. Install all dependencies with a single command:

```bash
# Install all dependencies for all packages
npm install
```

This will install dependencies for:
- Root workspace
- Desktop application (Electron + Next.js)
- API Server (Express)
- PWA (Progressive Web App)
- Shared types

**Expected time**: 2-5 minutes depending on your internet connection.

### Step 3: Environment Configuration

The server needs environment variables. A default `.env` file exists, but you should verify it:

```bash
# Navigate to server directory
cd packages/server

# Check if .env file exists
# On Windows PowerShell:
dir .env

# On macOS/Linux:
ls -la .env
```

If `.env` doesn't exist, copy from the example:

```bash
# Windows PowerShell:
Copy-Item .env.example .env

# macOS/Linux:
cp .env.example .env
```

**Default `.env` contents** (no changes needed for development):
```env
NODE_ENV=development
SERVER_PORT=5000

# Database (SQLite for development - no setup needed!)
DATABASE_URL="file:./prisma/dev.db"

# JWT Secret (auto-generated, but you can change it)
JWT_SECRET="your-secret-key-change-in-production"
```

Return to root directory:
```bash
cd ../..
```

### Step 4: Database Setup

Initialize the database with schema and sample data:

```bash
# 1. Generate Prisma Client
npm run prisma:generate --workspace=packages/server

# 2. Run database migrations (creates tables)
npm run prisma:migrate --workspace=packages/server

# 3. Seed database with sample data (menu items, users, etc.)
npm run prisma:seed --workspace=packages/server
```

**What this creates**:
- Database file: `packages/server/prisma/dev.db`
- Sample menu items (appetizers, mains, desserts, beverages)
- Default users:
  - Admin: `admin` / `admin123`
  - Waiter: `waiter` / `waiter123`
  - Chef: `chef` / `chef123`
- Sample tables (Table 1-10)
- Sample categories

**If you see errors**:
- Make sure you're in the root directory
- Verify Node.js version: `node --version` (should be >= 20)
- Check that `packages/server/.env` exists

### Step 5: PWA Setup (for iPad Ordering)

Configure the Progressive Web App with your network IP:

```bash
# This script auto-detects your IP and configures the PWA
npm run setup:pwa
```

**What this does**:
1. Detects your computer's IP address
2. Configures PWA to connect to your API server
3. Builds the PWA for production
4. Copies PWA files to server's public directory

**Expected output**:
```
🔍 Detecting IP address...
✅ IP Address: 192.168.1.xxx
🔧 Configuring PWA...
🏗️  Building PWA...
✅ PWA setup complete!

Access from iPad: http://192.168.1.xxx:5000/?table=1
```

### Step 6: Verify Installation

Check that all packages are properly installed:

```bash
# Check Node.js version
node --version  # Should be >= v20.0.0

# Check npm version
npm --version   # Should be >= 10.0.0

# Verify database exists
# Windows PowerShell:
dir packages\server\prisma\dev.db

# macOS/Linux:
ls -l packages/server/prisma/dev.db
```

✅ **Installation Complete!** You're ready to start the application.

---

## 🎯 Quick Start Guide

Now that installation is complete, let's start the application!

### Option 1: Full Application (Recommended for First-Time Users)

Start both the API server and desktop application:

```bash
npm run dev
```

This will:
1. Start the Express API server on port 5000
2. Start the Electron desktop application
3. Open the login window automatically

**You should see**:
```
[server] 🚀 Server running on http://localhost:5000
[server] ✅ Database connected
[server] 🔌 WebSocket server initialized
[desktop] ⚡️ Next.js ready on http://localhost:3000
[desktop] 🖥️  Electron window opened
```

### Option 2: Components Separately

For more control, run components in separate terminals:

**Terminal 1 - API Server**:
```bash
npm run dev:server
```

**Terminal 2 - Desktop App**:
```bash
npm run dev:desktop
```

**Terminal 3 - PWA Development (Optional)**:
```bash
npm run dev:pwa
```

### First Login

When the desktop app opens:

1. You'll see a login screen
2. Use default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
3. Click "Login"

**⚠️ Important**: Change the default password after first login!
- Go to Settings → Users → Edit Admin User → Change Password

### Accessing Different Interfaces

- **Desktop App**: Opens automatically in Electron window
- **PWA (from computer)**: http://localhost:5000/?table=1
- **PWA (from iPad/Phone)**: http://[YOUR_IP]:5000/?table=1
  - Replace `[YOUR_IP]` with the IP from Step 5 (e.g., http://192.168.1.100:5000/?table=1)
  - Ensure iPad/Phone is on the **same WiFi network**

---

## 🧪 Testing the Application

### Test 1: Desktop Application Features

#### Create a New Order
1. Click **Orders** in the sidebar
2. Click **New Order**
3. Select a table (e.g., "Table 1")
4. Add items from the menu
5. Click **Place Order**
6. ✅ Order appears in the orders list

#### Process a Payment
1. Go to **Billing** in the sidebar
2. Select an order with status "SERVED"
3. Choose payment method (Cash/Card/Digital)
4. Add discount/tip if needed (optional)
5. Click **Process Payment**
6. ✅ Payment confirmation appears with receipt

#### Manage Menu Items
1. Go to **Menu** in the sidebar
2. Click **Add Item**
3. Fill in details:
   - Name: "Test Dish"
   - Category: Select one
   - Price: 12.99
   - Description: "Test description"
4. Click **Save**
5. ✅ Item appears in the menu list

### Test 2: iPad/PWA Ordering

#### Setup
1. Ensure server is running: `npm run dev:server`
2. Note your IP address (from `npm run setup:pwa` output)
3. Make sure iPad/phone is on the **same WiFi network**

#### Access PWA
**On your computer** (test first):
```
http://localhost:5000/?table=1
```

**On iPad/Phone**:
```
http://192.168.1.xxx:5000/?table=1
```
(Replace xxx with your IP address)

#### Place an Order from PWA
1. Open the PWA URL on iPad
2. Browse menu by category
3. Add items to cart (click + button)
4. Click "View Cart" or cart icon
5. Review items
6. Click "Place Order"
7. Enter customer name (optional)
8. Click "Confirm Order"
9. ✅ Order confirmation appears

#### Verify Order in Desktop App
1. Check the **Orders** page in desktop app
2. ✅ New order should appear with status "PENDING"
3. ✅ Order items should match what was placed from PWA
4. ✅ Table number should be correct

### Test 3: Real-Time Updates (WebSocket)

Test WebSocket synchronization:

1. Open desktop app on your computer
2. Open PWA on iPad (or another browser tab)
3. Place an order from PWA
4. ✅ **Watch**: Order appears in desktop app immediately (no refresh needed)
5. In desktop app, click on the order and change status to "CONFIRMED"
6. ✅ **Watch**: Status updates in real-time across all connected clients

### Test 4: Kitchen Display System (KDS)

1. In desktop app, go to **Kitchen Display** (KDS)
2. Place a new order with multiple items
3. ✅ Order appears on KDS screen with all items
4. Click "Mark as In Progress" on a dish
5. ✅ Dish moves to "In Progress" column
6. Click "Mark as Complete" when done
7. ✅ Dish moves to "Completed" column
8. ✅ When all items complete, order disappears from KDS

### Test 5: Manual Billing (POS)

Test the point-of-sale feature for walk-in customers:

1. Go to **Billing** page
2. Click **Create Manual Bill**
3. Select category (e.g., "Mains")
4. Click items to add (e.g., 2x Burger, 1x Soda)
5. Adjust quantities with +/- buttons
6. Choose payment method: **Cash**
7. Enter amount received: `$50.00`
8. ✅ Change calculated automatically (e.g., "Change: $27.50")
9. Click **Print Bill & Receipt**
10. ✅ Receipt preview appears with all details

### Test 6: QR Code Generation

1. Go to **Tables** page
2. Click on any table (e.g., "Table 3")
3. Click **View QR Code** button
4. ✅ QR code displays with URL
5. Scan QR code with phone camera
6. ✅ PWA opens for that specific table

### Test 7: Reports & Analytics

1. Go to **Dashboard**
2. ✅ View today's revenue, orders count
3. ✅ Check top-selling items chart
4. Create and complete some test orders
5. Refresh dashboard
6. ✅ Numbers update with new data

### Complete Order Flow Test

This tests the entire system end-to-end:

```
Step 1: Customer Orders (PWA)
  - Scan QR code for Table 5
  - Browse menu
  - Add: 2x Burger ($12 each), 1x Soda ($3), 1x Fries ($5)
  - Place order with name "John Doe"

Step 2: Waiter Confirms (Desktop - Orders)
  - See new order appear immediately
  - Click order to view details
  - Verify: Table 5, Customer "John Doe", 3 items
  - Click "Confirm Order"
  - Status changes to "CONFIRMED"

Step 3: Kitchen Prepares (Desktop - KDS)
  - Kitchen display shows the order
  - Chef marks "Burger" as "In Progress"
  - Chef marks "Fries" as "In Progress"
  - Soda already complete
  - Chef completes burger and fries

Step 4: Waiter Serves (Desktop - Orders)
  - Waiter marks order as "SERVED"

Step 5: Payment (Desktop - Billing)
  - Order appears in Billing page
  - Select the order
  - Total: $32.00 (Subtotal) + Tax
  - Add 10% discount
  - Add $5 tip
  - Choose payment: Cash
  - Process payment
  - ✅ Receipt generated

Step 6: Verify Completion
  - Check Dashboard - revenue updated
  - Check Orders - order status "PAID"
  - ✅ Complete workflow successful!
```

### Testing Checklist

Use this checklist to verify all features work:

- [ ] Server starts without errors
- [ ] Desktop app opens and shows login
- [ ] Can login with admin credentials
- [ ] Dashboard loads with metrics
- [ ] Can create new orders
- [ ] Can add/edit/delete menu items
- [ ] Can view and update table status
- [ ] PWA accessible from browser (localhost)
- [ ] PWA accessible from iPad (network IP)
- [ ] Orders placed from PWA appear in desktop
- [ ] Real-time updates work (WebSocket)
- [ ] Kitchen Display shows orders
- [ ] Can mark items as in progress/complete
- [ ] Can process payments with discount/tip
- [ ] Can create manual bills (walk-in POS)
- [ ] QR codes generate correctly
- [ ] Reports show accurate data
- [ ] Can change user settings
- [ ] Can logout and login again

### Test Data Reset

To start fresh with clean data:

```bash
# Stop the server (Ctrl+C in terminal)

# Reset database
cd packages/server
npx prisma migrate reset

# Confirm with 'y' when prompted
# This will:
# - Drop all tables
# - Re-create tables
# - Re-seed sample data

# Return to root and restart
cd ../..
npm run dev:server
```

### Common Issues & Solutions

See the [Troubleshooting](#troubleshooting) section below for common issues and solutions.

---

## 💻 Development Guide

### 📋 Command Cheatsheet

Here's a quick reference of the most common commands you'll use:

| Task | Command | When to Use |
|------|---------|-------------|
| **Start everything** | `npm run dev` | Daily development |
| **Start server only** | `npm run dev:server` | Backend work |
| **Start desktop only** | `npm run dev:desktop` | Frontend work |
| **Start PWA dev** | `npm run dev:pwa` | PWA development with hot reload |
| **Reset database** | `npx prisma migrate reset` (in packages/server) | Start fresh with clean data |
| **View database** | `npm run prisma:studio --workspace=packages/server` | Browse data visually |
| **Setup PWA** | `npm run setup:pwa` | After PWA code changes |
| **Build for Windows** | `npm run package:win` | Create installer |
| **Update dependencies** | `npm install` | After pulling new code |
| **Clean build** | `npm run clean` | Fix build issues |

### Project Commands

#### Root Level Commands

```bash
# Development
npm run dev              # Run server + desktop app
npm run dev:server       # Run server only
npm run dev:desktop      # Run desktop app only
npm run dev:pwa          # Run PWA dev server (hot reload)

# Building
npm run build            # Build desktop app for production
npm run build:server     # Build server
npm run build:pwa        # Build PWA

# Packaging
npm run package:win      # Package for Windows
npm run package:mac      # Package for macOS
npm run package:linux    # Package for Linux

# Database
npm run prisma:generate --workspace=packages/server  # Generate Prisma client
npm run prisma:migrate --workspace=packages/server   # Run migrations
npm run prisma:studio --workspace=packages/server    # Open Prisma Studio
npm run prisma:seed --workspace=packages/server      # Seed database

# Utilities
npm run setup:pwa        # Setup PWA with correct IP
npm run clean            # Clean all build artifacts
```

#### Package-Specific Commands

```bash
# Run commands in specific packages
npm run [command] --workspace=packages/[package-name]

# Examples:
npm run dev --workspace=packages/server
npm run build --workspace=packages/desktop
```

### Development Workflow

#### Full Stack Development

```bash
# Terminal 1: Start server
npm run dev:server

# Terminal 2: Start desktop app
npm run dev:desktop

# Terminal 3 (optional): PWA development with hot reload
npm run dev:pwa
```

#### PWA Development

For faster PWA development with hot module replacement:

```bash
# Terminal 1: API Server
npm run dev:server

# Terminal 2: PWA Dev Server
npm run dev:pwa
```

Access PWA at: http://localhost:3001/?table=1

> **Note**: Run `npm run setup:pwa` before final testing to ensure production build is correct.

### Code Structure

#### Desktop Application (Next.js)

```
packages/desktop/src/app/
├── layout.tsx              # Root layout with sidebar
├── page.tsx                # Dashboard page
├── login/                  # Authentication
├── orders/                 # Order management
├── tables/                 # Table management
├── menu/                   # Menu management
├── billing/                # POS interface
├── settings/               # System settings
└── kds/                    # Kitchen display
```

#### Server (Express)

```
packages/server/src/
├── routes/                 # API route handlers
├── services/               # Business logic layer
├── middleware/             # Express middleware
├── websocket/              # WebSocket handlers
├── utils/                  # Utility functions
└── app.ts                  # Express app configuration
```

### Database Management

#### Prisma Commands

```bash
# Generate Prisma client after schema changes
npm run prisma:generate --workspace=packages/server

# Create a new migration
npm run prisma:migrate --workspace=packages/server

# Open Prisma Studio (database GUI)
npm run prisma:studio --workspace=packages/server

# Reset database (WARNING: deletes all data)
npx prisma migrate reset --workspace=packages/server
```

#### Database Location

- **Development**: `packages/server/prisma/dev.db` (SQLite)
- **Production**: Configured via `DATABASE_URL` environment variable

### Adding New Features

1. **Update Prisma Schema** (if database changes needed)
   ```bash
   # Edit packages/server/prisma/schema.prisma
   npm run prisma:migrate --workspace=packages/server
   ```

2. **Create Service Layer** (business logic)
   ```typescript
   // packages/server/src/services/yourService.ts
   ```

3. **Create API Routes** (endpoints)
   ```typescript
   // packages/server/src/routes/yourRoutes.ts
   ```

4. **Create Frontend Pages** (UI)
   ```typescript
   // packages/desktop/src/app/your-feature/page.tsx
   ```

5. **Update Types** (if needed)
   ```typescript
   // packages/shared/src/types.ts
   ```

## 📦 Building & Packaging

### Development Builds

```bash
# Build for development (includes dev tools)
npm run build:dev
```

### Production Builds

```bash
# Build desktop app for production
npm run build

# Build server
npm run build:server

# Build PWA
npm run build:pwa
```

### Packaging for Distribution

```bash
# Package for all platforms
npm run package

# Package for specific platform
npm run package:win      # Windows installer
npm run package:mac      # macOS DMG
npm run package:linux    # Linux AppImage/deb
```

#### Staging Builds

For testing before production:

```bash
npm run build:staging
npm run package:win:staging
npm run package:mac:staging
```

### Build Output

- **Windows**: `packages/desktop/release/Restaurant Management System Setup [version].exe`
- **macOS**: `packages/desktop/release/Restaurant Management System-[version].dmg`
- **Linux**: `packages/desktop/release/restaurant-management-system-[version].AppImage`

### Version Management

```bash
# Increment version numbers
npm run version:major    # 1.0.0 -> 2.0.0
npm run version:minor    # 1.0.0 -> 1.1.0
npm run version:patch    # 1.0.0 -> 1.0.1
```

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in `packages/server/`:

```bash
# Server Configuration
SERVER_PORT=5000
NODE_ENV=development

# Database
DATABASE_URL="file:./prisma/dev.db"

# Authentication
JWT_SECRET="your-secret-key-change-in-production"

# Business Settings (optional, can be set via UI)
BUSINESS_NAME="My Restaurant"
TAX_PERCENTAGE=10
CURRENCY="USD"
```

### Configuration Files

#### Server Configuration
- **Location**: `packages/server/src/config/index.ts`
- **Settings**: Port, JWT secret, CORS origins

#### Desktop Configuration
- **Location**: `packages/desktop/electron/main.ts`
- **Settings**: Window size, auto-launch, update server

#### PWA Configuration
- **Location**: `packages/pwa/vite.config.ts`
- **Settings**: Build output, service worker

### Application Settings

Most settings can be configured through the desktop application:

1. Open the desktop app
2. Navigate to **Settings**
3. Configure:
   - Business information
   - Tax percentage and currency
   - Printer settings
   - Server port
   - Theme preferences

## 🔧 Troubleshooting

### Installation Issues

#### Problem: `npm install` fails

**Solution 1**: Clear npm cache
```bash
npm cache clean --force
npm install
```

**Solution 2**: Delete node_modules and reinstall
```bash
# Windows PowerShell:
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# macOS/Linux:
rm -rf node_modules package-lock.json
npm install
```

**Solution 3**: Check Node.js version
```bash
node --version  # Must be >= 20.0.0
```

If your Node.js is outdated, [download the latest LTS version](https://nodejs.org/).

#### Problem: Prisma commands fail

**Error**: `Prisma schema file not found`

**Solution**:
```bash
# Make sure you're in the root directory
cd c:\personal\project\RMS  # Or your project path

# Then run commands
npm run prisma:generate --workspace=packages/server
```

**Error**: `Environment variable DATABASE_URL not found`

**Solution**:
```bash
# Check if .env file exists
cd packages/server
dir .env  # Windows
ls -la .env  # macOS/Linux

# If not, create it from example
Copy-Item .env.example .env  # Windows
cp .env.example .env  # macOS/Linux
```

### Server Issues

#### Problem: Server won't start

**Error**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solution**: Port 5000 is already in use

```bash
# Windows - Find and kill process on port 5000:
netstat -ano | findstr :5000
taskkill /PID [PID_NUMBER] /F

# macOS/Linux:
lsof -i :5000
kill -9 [PID_NUMBER]

# Or change port in .env file:
SERVER_PORT=5001
```

#### Problem: Database connection fails

**Error**: `Can't reach database server`

**Solution**: Reset database
```bash
cd packages/server
npx prisma migrate reset
cd ../..
npm run dev:server
```

#### Problem: JWT errors

**Error**: `JsonWebTokenError: invalid token`

**Solution**: Clear browser storage and login again
1. Open browser DevTools (F12)
2. Go to Application → Storage → Clear site data
3. Refresh page and login

### Desktop App Issues

#### Problem: Electron window is blank/white screen

**Solution 1**: Check if server is running
```bash
# In separate terminal:
npm run dev:server
```

**Solution 2**: Clear Electron cache
```bash
# Windows:
Remove-Item -Recurse -Force $env:APPDATA\Restaurant Management System

# macOS:
rm -rf ~/Library/Application\ Support/Restaurant\ Management\ System

# Linux:
rm -rf ~/.config/Restaurant\ Management\ System
```

**Solution 3**: Check console for errors
- Press Ctrl+Shift+I (or Cmd+Option+I on Mac) in Electron window
- Check Console tab for errors

#### Problem: Desktop app won't connect to server

**Error**: `ERR_CONNECTION_REFUSED`

**Solution**:
1. Verify server is running: `npm run dev:server`
2. Check server URL in desktop app config
3. Verify port 5000 is not blocked by firewall

### PWA Issues

#### Problem: PWA won't load on iPad

**Error**: "Safari can't open the page"

**Solution 1**: Verify same WiFi network
- Computer and iPad must be on same network

**Solution 2**: Re-run PWA setup
```bash
npm run setup:pwa
```
Note the IP address shown and use it in iPad browser.

**Solution 3**: Check firewall
```bash
# Windows - Allow Node.js through firewall
# Run PowerShell as Administrator:
New-NetFirewallRule -DisplayName "Node.js Server" -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow
```

**Solution 4**: Test from computer first
```bash
# Access from computer browser:
http://localhost:5000/?table=1

# If this works, try from iPad:
http://[YOUR_IP]:5000/?table=1
```

#### Problem: Menu items don't load in PWA

**Solution**: Rebuild PWA
```bash
# Rebuild and reconfigure
npm run setup:pwa

# Restart server
npm run dev:server
```

### WebSocket Issues

#### Problem: Real-time updates not working

**Symptom**: Orders from PWA don't appear in desktop immediately

**Solution 1**: Check WebSocket connection
1. Open browser DevTools (F12)
2. Go to Network tab
3. Filter: WS (WebSocket)
4. Should see connected socket

**Solution 2**: Restart server
```bash
# Ctrl+C to stop server
npm run dev:server
```

**Solution 3**: Check CORS settings
Verify `packages/server/src/app.ts` has correct CORS configuration.

### Database Issues

#### Problem: Data not persisting

**Solution**: Check database file location
```bash
# Windows:
dir packages\server\prisma\dev.db

# macOS/Linux:
ls -l packages/server/prisma/dev.db
```

If file doesn't exist, run migrations:
```bash
npm run prisma:migrate --workspace=packages/server
npm run prisma:seed --workspace=packages/server
```

#### Problem: Prisma schema changes not applying

**Solution**: Regenerate and migrate
```bash
npm run prisma:generate --workspace=packages/server
npm run prisma:migrate --workspace=packages/server
```

### Build Issues

#### Problem: Production build fails

**Error**: `Module not found`

**Solution**: Clean and rebuild
```bash
npm run clean
npm install
npm run build
```

#### Problem: Packaged app won't run

**Solution 1**: Check antivirus/Windows Defender
- Temporarily disable antivirus
- Try running app again
- Add to exclusions if it works

**Solution 2**: Run from command line to see errors
```bash
# Navigate to where .exe is installed
cd "C:\Program Files\Restaurant Management System"
"Restaurant Management System.exe"
# Check for error messages
```

### Network Issues

#### Problem: Can't find local IP address

**Solution**: Manual IP detection

```bash
# Windows:
ipconfig

# macOS:
ifconfig | grep "inet "

# Linux:
ip addr show
```

Look for IPv4 address starting with:
- `192.168.x.x` (most home networks)
- `10.x.x.x` (some networks)
- `172.16.x.x` to `172.31.x.x` (some networks)

### Common Error Messages

| Error | Cause | Solution |
|-------|-------|----------|
| `EADDRINUSE` | Port already in use | Kill process or change port |
| `ECONNREFUSED` | Server not running | Start server with `npm run dev:server` |
| `MODULE_NOT_FOUND` | Missing dependencies | Run `npm install` |
| `ENOENT` | File/directory not found | Check file path, run from correct directory |
| `Prisma Client not initialized` | Prisma not generated | Run `npm run prisma:generate --workspace=packages/server` |
| `Invalid credentials` | Wrong username/password | Use `admin` / `admin123` for default login |

### Getting Help

If you still have issues:

1. Check the detailed [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
2. Review [User Manual](./docs/USER_MANUAL.md) for feature-specific help
3. Check [API Documentation](./docs/API.md) for API-related issues
4. Look at existing GitHub issues
5. Create a new issue with:
   - Error message (full text)
   - Steps to reproduce
   - Your OS and Node.js version
   - Screenshots if applicable

---

## 📚 Documentation

### Getting Started
- **[Quick Start Guide](./docs/QUICK_START.md)**: Fast setup for development
- **[Project Structure](./docs/PROJECT_STRUCTURE.md)**: Detailed code organization

### User Guides
- **[User Manual](./docs/USER_MANUAL.md)**: Complete feature guide for end users
- **[Troubleshooting Guide](./docs/TROUBLESHOOTING.md)**: Common issues and solutions

### Technical Documentation
- **[API Documentation](./docs/API.md)**: Complete API reference with examples
- **[Environment Variables](./docs/ENVIRONMENT_VARIABLES.md)**: Configuration reference
- **[Deployment Guide](./docs/DEPLOYMENT.md)**: Production deployment instructions

## 🛠️ Technology Stack

### Desktop Application
- **Electron 28+**: Desktop application framework
- **Next.js 14+**: React framework with App Router
- **React 18+**: UI library
- **Tailwind CSS 3+**: Utility-first CSS framework
- **TypeScript 5+**: Type-safe JavaScript
- **React Query**: Server state management
- **Zustand**: Client state management
- **Socket.io Client**: Real-time communication

### Server
- **Node.js 20+**: JavaScript runtime
- **Express 4+**: Web application framework
- **Prisma**: Next-generation ORM
- **Socket.io**: WebSocket server
- **JWT**: Authentication tokens
- **bcrypt**: Password hashing
- **ESC/POS**: Printer communication

### Database
- **SQLite 3**: Embedded database (development/local)
- **PostgreSQL 15+**: Relational database (production/cloud)

### PWA
- **Vite**: Build tool and dev server
- **TypeScript**: Type-safe JavaScript
- **Service Workers**: Offline support
- **IndexedDB**: Client-side storage

## 🤝 Contributing & Development Best Practices

### For New Developers

Welcome to the project! Here are some tips to get started:

1. **Read the Code**: Start with the main entry points:
   - Desktop: `packages/desktop/electron/main.ts`
   - Server: `packages/server/src/index.ts`
   - PWA: `packages/pwa/src/main.tsx`

2. **Understand the Flow**:
   ```
   PWA (Customer) → API Server → WebSocket → Desktop App (Staff)
   ```

3. **Database First**: All data models are in `packages/server/prisma/schema.prisma`

4. **Shared Types**: Use types from `packages/shared/src/` across all packages

### Development Workflow

#### Making Changes

```bash
# 1. Create a feature branch
git checkout -b feature/your-feature-name

# 2. Make your changes
# Edit files in packages/desktop, packages/server, or packages/pwa

# 3. Test locally
npm run dev

# 4. If you changed database schema:
npm run prisma:generate --workspace=packages/server
npm run prisma:migrate --workspace=packages/server

# 5. Commit your changes
git add .
git commit -m "feat: add your feature description"

# 6. Push and create pull request
git push origin feature/your-feature-name
```

#### Code Style Guidelines

- **TypeScript**: Use TypeScript for all new code
- **Naming**: Use camelCase for variables/functions, PascalCase for components/classes
- **Comments**: Add comments for complex logic
- **Error Handling**: Always handle errors with try-catch
- **Formatting**: Code is auto-formatted (Prettier recommended)

#### Testing Changes

Before submitting a PR, test:

- [ ] Desktop app starts without errors
- [ ] Server starts without errors
- [ ] Can create, read, update, delete data
- [ ] Real-time updates work
- [ ] PWA accessible from iPad
- [ ] No TypeScript errors: `npm run build`

### Project Structure Quick Reference

```
packages/
├── desktop/              # Electron + Next.js (Staff interface)
│   ├── electron/         # Electron main process
│   │   ├── main.ts       # App entry point
│   │   └── preload.ts    # Bridge between Electron and web
│   └── src/app/          # Next.js pages
│       ├── dashboard/    # Dashboard page
│       ├── orders/       # Order management
│       ├── billing/      # POS/Billing
│       └── ...
│
├── server/               # Express API (Backend)
│   ├── src/
│   │   ├── routes/       # API endpoints
│   │   ├── services/     # Business logic
│   │   ├── middleware/   # Auth, validation
│   │   └── websocket/    # Real-time updates
│   └── prisma/
│       ├── schema.prisma # Database schema
│       └── seed.ts       # Sample data
│
├── pwa/                  # Progressive Web App (Customer interface)
│   └── src/
│       ├── pages/        # PWA pages (menu, cart, order)
│       └── components/   # Reusable components
│
└── shared/               # Shared TypeScript types
    └── src/
        ├── types.ts      # Type definitions
        └── enums.ts      # Shared enums
```

### Common Development Tasks

#### Add a New API Endpoint

1. Define route in `packages/server/src/routes/yourRoute.ts`:
```typescript
router.get('/your-endpoint', async (req, res) => {
  // Your logic here
});
```

2. Register route in `packages/server/src/app.ts`:
```typescript
app.use('/api/your-endpoint', yourRoute);
```

#### Add a New Desktop Page

1. Create page: `packages/desktop/src/app/your-page/page.tsx`
2. Add to sidebar: `packages/desktop/src/app/layout.tsx`
3. Use existing hooks for data fetching

#### Add a New Database Table

1. Edit schema: `packages/server/prisma/schema.prisma`
```prisma
model YourTable {
  id        String   @id @default(uuid())
  name      String
  createdAt DateTime @default(now())
}
```

2. Run migrations:
```bash
npm run prisma:migrate --workspace=packages/server
```

3. Update seed data if needed: `packages/server/prisma/seed.ts`

### Debugging Tips

#### Desktop App
- Open DevTools: Ctrl+Shift+I (Windows) or Cmd+Option+I (Mac)
- Check Console for errors
- Use React DevTools extension

#### Server
- Add `console.log()` statements
- Use VS Code debugger (attach to process)
- Check server logs in terminal

#### Database
- Use Prisma Studio: `npm run prisma:studio --workspace=packages/server`
- View data visually at http://localhost:5555

### Performance Tips

- **Large Lists**: Use pagination or virtual scrolling
- **Images**: Optimize before adding to project
- **WebSocket**: Don't send large payloads
- **Database**: Add indexes for frequently queried fields

### Security Best Practices

- **Never commit** `.env` files with real secrets
- **Always hash** passwords (already done with bcrypt)
- **Validate input** on both client and server
- **Use HTTPS** in production
- **Keep dependencies updated**: `npm audit fix`

### Useful Resources

- [Electron Docs](https://www.electronjs.org/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [Prisma Docs](https://www.prisma.io/docs)
- [Express Docs](https://expressjs.com/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)

---

## 📄 License

Private - All rights reserved

---

## 🆘 Support & Resources

### Documentation

- 📖 **[Quick Start Guide](./docs/QUICK_START.md)** - Get up and running fast
- 🏗️ **[Project Structure](./docs/PROJECT_STRUCTURE.md)** - Understand the codebase
- 📘 **[User Manual](./docs/USER_MANUAL.md)** - Complete feature guide
- 🔧 **[Troubleshooting Guide](./docs/TROUBLESHOOTING.md)** - Fix common issues
- 🌐 **[API Documentation](./docs/API.md)** - API reference with examples
- 🚀 **[Deployment Guide](./docs/DEPLOYMENT.md)** - Production deployment

### Getting Help

If you encounter issues:

1. ✅ Check the [Troubleshooting](#troubleshooting) section above
2. 📚 Review the [Documentation](#documentation) for your specific topic
3. 🔍 Search existing GitHub issues
4. 💬 Ask your team lead or senior developer
5. 🐛 Create a new issue with:
   - Clear description of the problem
   - Steps to reproduce
   - Error messages (full text)
   - Your OS and Node.js version
   - Screenshots if helpful

### Quick Links

| Resource | Description |
|----------|-------------|
| [Installation](#installation--setup) | Step-by-step setup instructions |
| [Testing](#testing-the-application) | How to test all features |
| [Commands](#-command-cheatsheet) | Common commands reference |
| [Troubleshooting](#troubleshooting) | Solutions to common issues |
| [Contributing](#-contributing--development-best-practices) | Development guidelines |

---

## 📊 Project Status

**Version**: 1.0.0  
**Status**: ✅ Production Ready  
**Last Updated**: November 2025

### Recent Updates
- ✅ Desktop application with full POS functionality
- ✅ Progressive Web App for customer ordering
- ✅ Real-time synchronization via WebSocket
- ✅ Database with sample data
- ✅ Production build & packaging support
- ✅ Comprehensive documentation

### Supported Platforms
- ✅ Windows 10/11 (Tested)
- ✅ macOS 10.15+ (Tested)
- ✅ Linux (Ubuntu 20.04+)

---

**Made with ❤️ for Restaurant Management**

**Happy Coding! 🚀**
