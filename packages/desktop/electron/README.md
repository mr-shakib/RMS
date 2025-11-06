# Electron Main Process

This directory contains the Electron main process implementation for the Restaurant Management System desktop application.

## Files

### main.ts
The main entry point for the Electron application. Handles:
- Application lifecycle management
- Window creation and management
- Server launcher integration
- System tray icon and menu
- Native OS integrations (notifications, auto-launch)
- IPC communication with renderer process

### serverLauncher.ts
Manages the Express API server as a child process. Features:
- Automatic port detection (starts at 5000, auto-increments if occupied)
- Server health check polling
- Graceful shutdown handling
- LAN IP address detection for network access
- Server restart capability

### preload.ts
Provides a secure bridge between the main and renderer processes using Electron's context isolation. Exposes:
- Server information (URL, port, LAN IP)
- Notification API
- App version
- Server restart
- Auto-launch controls
- Update checking (when configured)

### electron.d.ts
TypeScript declarations for the Electron API exposed to the renderer process.

## Features Implemented

### ✅ Task 6.1: Electron Main Process
- Window creation with proper configuration
- IPC handlers for renderer communication
- Window state management (minimize to tray, close behavior)
- Development and production mode handling

### ✅ Task 6.2: Express Server Launcher
- Child process spawning for Express server
- Port availability checking and auto-increment
- Health check polling (30 second timeout)
- Server output logging
- Graceful shutdown with SIGTERM/SIGKILL fallback
- LAN IP detection and display

### ✅ Task 6.3: Native OS Integrations
- System tray icon with context menu
- Native notifications for important events
- Auto-launch on system startup (configurable)
- Auto-updater setup (requires configuration for production)

## Usage

### Development
```bash
# Start Next.js dev server and Electron
npm run dev --workspace=packages/desktop
```

### Production Build
```bash
# Build Next.js and Electron
npm run build --workspace=packages/desktop

# Package for Windows
npm run package:win --workspace=packages/desktop

# Package for macOS
npm run package:mac --workspace=packages/desktop
```

## IPC API

The renderer process can access these methods via `window.electron`:

```typescript
// Get server information
const { serverUrl, lanIp, port } = await window.electron.getServerInfo();

// Show notification
await window.electron.showNotification('Title', 'Message');

// Get app version
const version = await window.electron.getAppVersion();

// Restart server
const result = await window.electron.restartServer();

// Auto-launch controls
const isEnabled = await window.electron.getAutoLaunchStatus();
await window.electron.setAutoLaunch(true);

// Update controls (requires configuration)
await window.electron.checkForUpdates();
await window.electron.installUpdate();
```

## Server Configuration

The server launcher uses the following environment variables:
- `SERVER_PORT`: Port number (default: 5000, auto-increments if occupied)
- `NODE_ENV`: Environment mode (development/production)

Server paths:
- **Development**: `packages/server/src/index.ts` (run with tsx)
- **Production**: `resources/server/dist/index.js` (run with node)

## System Tray

The system tray provides quick access to:
- Show/Hide window
- Server information (local and network URLs)
- Auto-launch toggle
- Quit application

## Auto-Launch

Auto-launch can be configured from:
1. System tray menu
2. Settings page (via IPC)
3. Programmatically via `setAutoLaunch()`

Note: Auto-launch is disabled in development mode.

## Auto-Updater

The auto-updater is set up but requires additional configuration for production:

1. Install electron-updater:
```bash
npm install electron-updater --workspace=packages/desktop
```

2. Configure update server in electron-builder config
3. Set up code signing for your platform
4. Uncomment the auto-updater code in main.ts

See: https://www.electron.build/auto-update

## Icons

Application icons should be placed in `packages/desktop/public/`:
- `icon.ico` - Windows application icon
- `icon.icns` - macOS application icon
- `tray-icon.png` - System tray icon

See `public/ICONS_README.md` for detailed icon requirements.

## Troubleshooting

### Server fails to start
- Check if port 5000-5010 are available
- Verify server code builds successfully
- Check server logs in console output

### Window doesn't load
- Ensure Next.js dev server is running (development)
- Verify Next.js build completed (production)
- Check console for errors

### Tray icon not visible
- Add proper icon files to public directory
- Restart application after adding icons

### Auto-launch not working
- Only works in production builds
- Check system permissions
- Verify app is properly installed (not running from build directory)

## Security Considerations

- Context isolation is enabled
- Node integration is disabled in renderer
- Preload script provides controlled API access
- IPC handlers validate inputs
- Server runs on localhost by default

## Performance

- Server health check timeout: 30 seconds
- Port scan range: 10 ports (5000-5009)
- Server shutdown timeout: 5 seconds
- Update check interval: 4 hours (when configured)

## Future Enhancements

- [ ] Custom window frame with native controls
- [ ] Multiple window support (KDS in separate window)
- [ ] Keyboard shortcuts and global hotkeys
- [ ] Crash reporting integration
- [ ] Analytics integration
- [ ] Custom protocol handler (rms://)
- [ ] Deep linking support
