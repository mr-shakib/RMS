# Restaurant Management System

A comprehensive Point of Sale (POS) solution built with Electron, Next.js, Express, and SQLite/PostgreSQL.

## Project Structure

This is a monorepo containing the following packages:

- **packages/desktop**: Electron + Next.js desktop application
- **packages/server**: Express API server
- **packages/pwa**: Progressive Web App for customer ordering
- **packages/shared**: Shared TypeScript types and utilities

## Prerequisites

- Node.js >= 20.0.0
- npm >= 10.0.0

## Getting Started

### Installation

```bash
# Install all dependencies
npm install
```

### Development

```bash
# Run both server and desktop app in development mode
npm run dev

# Run server only
npm run dev:server

# Run desktop app only
npm run dev:desktop
```

### Building

```bash
# Build all packages
npm run build

# Build server only
npm run build:server

# Build desktop app only
npm run build:desktop
```

### Packaging

```bash
# Package for Windows
npm run package:win

# Package for macOS
npm run package:mac
```

## Technology Stack

### Desktop Application
- Electron 28+
- Next.js 14+
- React 18+
- Tailwind CSS 3+
- TypeScript 5+

### Server
- Node.js 20+
- Express 4+
- Prisma ORM
- Socket.io
- SQLite/PostgreSQL

### PWA
- Vite
- TypeScript
- Service Workers

## Features

- Order management with real-time updates
- Table management with QR code generation
- Menu management with CRUD operations
- Point of Sale (POS) interface
- Kitchen Display System (KDS)
- Progressive Web App for customer ordering
- Receipt printing (ESC/POS)
- Sales reporting and analytics
- Multi-user authentication with role-based access

## License

Private - All rights reserved
