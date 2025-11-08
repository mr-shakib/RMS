# Restaurant Management System

A comprehensive Point of Sale (POS) solution built with Electron, Next.js, Express, and SQLite/PostgreSQL. This system provides a complete restaurant management solution with desktop management interface, local API server, and Progressive Web App for customer-facing iPad ordering.

## 📋 Table of Contents

- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Development Guide](#development-guide)
- [Building & Packaging](#building--packaging)
- [Configuration](#configuration)
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

- **Node.js** >= 20.0.0
- **npm** >= 10.0.0
- **Operating System**: Windows 10+, macOS 10.15+, or Linux

### Optional
- ESC/POS compatible receipt printer (for printing functionality)
- iPad or tablet device (for customer ordering via PWA)

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/your-org/restaurant-management-system.git
cd restaurant-management-system

# Install all dependencies
npm install
```

### 2. Database Setup

```bash
# Generate Prisma client
npm run prisma:generate --workspace=packages/server

# Run database migrations
npm run prisma:migrate --workspace=packages/server

# Seed database with sample data
npm run prisma:seed --workspace=packages/server
```

### 3. PWA Setup

```bash
# Configure and build PWA
npm run setup:pwa
```

This will automatically detect your IP address and configure the PWA with the correct API URL.

### 4. Start Development

```bash
# Start both server and desktop app
npm run dev

# OR start individually:
npm run dev:server    # Start API server only
npm run dev:desktop   # Start desktop app only
```

### 5. Access the Application

- **Desktop App**: Opens automatically in Electron window
- **PWA (from computer)**: http://localhost:5000/?table=1
- **PWA (from iPad)**: http://[YOUR_IP]:5000/?table=1

**Default Login Credentials:**
- Username: `admin`
- Password: `admin123`

> ⚠️ **Important**: Change the default password after first login!

For detailed setup instructions, see [QUICK_START.md](./QUICK_START.md).

## 💻 Development Guide

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

## 🤝 Contributing

This is a private project. For internal development:

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📄 License

Private - All rights reserved

## 🆘 Support

For issues, questions, or feature requests:
- Check the [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
- Review the [User Manual](./docs/USER_MANUAL.md)
- Contact: support@rms-system.com

---

**Version**: 1.0.0  
**Last Updated**: 2024
