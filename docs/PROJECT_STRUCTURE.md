# Project Structure

## Monorepo Layout

```
restaurant-management-system/
├── packages/
│   ├── shared/              # Shared TypeScript types and utilities
│   │   ├── src/
│   │   │   ├── index.ts     # Main export
│   │   │   ├── types.ts     # Type definitions
│   │   │   └── enums.ts     # Enum definitions
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── server/              # Express API server
│   │   ├── src/
│   │   │   └── index.ts     # Server entry point
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── .env.example
│   │
│   ├── desktop/             # Electron + Next.js desktop app
│   │   ├── electron/
│   │   │   ├── main.ts      # Electron main process
│   │   │   └── preload.ts   # Electron preload script
│   │   ├── src/
│   │   │   └── app/         # Next.js app directory
│   │   │       ├── layout.tsx
│   │   │       ├── page.tsx
│   │   │       └── globals.css
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.electron.json
│   │   ├── next.config.js
│   │   ├── tailwind.config.ts
│   │   └── postcss.config.js
│   │
│   └── pwa/                 # Progressive Web App
│       ├── src/
│       │   └── main.ts      # PWA entry point
│       ├── index.html
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── package.json             # Root package.json (workspace config)
├── tsconfig.json            # Root TypeScript config
├── .gitignore
└── README.md
```

## Package Dependencies

### @rms/shared
- Core TypeScript types and enums
- Used by all other packages
- No external dependencies

### @rms/server
- Express API server
- Prisma ORM for database
- Socket.io for real-time updates
- JWT authentication
- Depends on: @rms/shared

### @rms/desktop
- Electron desktop application
- Next.js 14 with App Router
- Tailwind CSS for styling
- React Query for state management
- Depends on: @rms/shared

### @rms/pwa
- Vite-based Progressive Web App
- Service workers for offline support
- Depends on: @rms/shared

## Build Scripts

### Root Level
- `npm run dev` - Run server and desktop in development
- `npm run build` - Build all packages
- `npm run clean` - Clean all build artifacts

### Package Level
- `npm run dev --workspace=packages/[package]` - Run specific package in dev mode
- `npm run build --workspace=packages/[package]` - Build specific package

## TypeScript Configuration

All packages use strict TypeScript configuration with:
- Strict mode enabled
- Path aliases configured (@rms/shared, @/*)
- ES2022 target
- Proper module resolution

## Next Steps

1. Set up Prisma schema (Task 2)
2. Implement database services (Task 3)
3. Build Express API routes (Task 4)
4. Implement WebSocket server (Task 5)
5. Create Electron integration (Task 6)
6. Build Next.js frontend pages (Tasks 7-14)
7. Develop PWA (Task 15)
