"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
const serverLauncher_1 = require("./serverLauncher");
const nextServer_1 = require("./nextServer");
const appWithQuitting = electron_1.app;
let mainWindow = null;
let serverLauncher = null;
let serverConfig = null;
let nextServerLauncher = null;
let nextServerConfig = null;
let tray = null;
// Check if we're in development mode
const isDev = !electron_1.app.isPackaged;
// Server configuration
const DEFAULT_SERVER_PORT = 5000;
// Auto-launch setting (can be configured from settings)
let autoLaunchEnabled = false;
// Will be setup in app.whenReady()
let logStream = null;
/**
 * Create the main application window
 */
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1280,
        height: 800,
        minWidth: 1024,
        minHeight: 768,
        title: 'Restaurant Management System',
        backgroundColor: '#ffffff',
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
            devTools: isDev,
        },
        show: false, // Don't show until ready
        autoHideMenuBar: true, // Hide menu bar (Alt key to show temporarily)
    });
    // Hide the menu bar completely
    mainWindow.setMenuBarVisibility(false);
    // Show window when ready to avoid flickering
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
        // Maximize the window to fill the entire screen after showing
        mainWindow?.maximize();
    });
    // Load from Next.js server (dev or production)
    const nextUrl = nextServerConfig?.url || 'http://localhost:3000';
    mainWindow.loadURL(nextUrl);
    // Open DevTools in development
    if (isDev) {
        mainWindow.webContents.openDevTools();
    }
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
    // Allow F11 to toggle fullscreen
    mainWindow.on('leave-full-screen', () => {
        console.log('Exited fullscreen mode');
    });
    mainWindow.on('enter-full-screen', () => {
        console.log('Entered fullscreen mode');
    });
    // Handle window minimize to tray
    mainWindow.on('minimize', (event) => {
        if (tray) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });
    mainWindow.on('close', (event) => {
        if (!appWithQuitting.isQuitting && tray) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });
}
/**
 * Create system tray icon and menu
 */
function createTray() {
    // Try to load tray icon, fallback to empty icon if not found
    let icon;
    try {
        const iconPath = isDev
            ? path.join(__dirname, '../../public/tray-icon.png')
            : path.join(process.resourcesPath, 'public', 'tray-icon.png');
        icon = electron_1.nativeImage.createFromPath(iconPath);
        // If icon is empty, create a simple placeholder
        if (icon.isEmpty()) {
            icon = electron_1.nativeImage.createEmpty();
            console.warn('Tray icon not found, using placeholder. See public/ICONS_README.md for icon setup.');
        }
    }
    catch (error) {
        console.warn('Failed to load tray icon:', error);
        icon = electron_1.nativeImage.createEmpty();
    }
    tray = new electron_1.Tray(icon);
    updateTrayMenu();
    tray.setToolTip('Restaurant Management System');
    // Show window on tray icon click
    tray.on('click', () => {
        mainWindow?.show();
    });
}
/**
 * Update tray menu (called when settings change)
 */
function updateTrayMenu() {
    if (!tray)
        return;
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: 'Show',
            click: () => {
                mainWindow?.show();
            },
        },
        {
            label: 'Hide',
            click: () => {
                mainWindow?.hide();
            },
        },
        {
            label: 'Toggle Fullscreen',
            click: () => {
                if (mainWindow) {
                    mainWindow.setFullScreen(!mainWindow.isFullScreen());
                }
            },
        },
        { type: 'separator' },
        {
            label: 'Server Info',
            submenu: [
                { label: `Local: ${serverConfig?.url || 'Not started'}`, enabled: false },
                { label: `Network: http://${serverConfig?.lanIp || 'N/A'}:${serverConfig?.port || 'N/A'}`, enabled: false },
            ],
        },
        { type: 'separator' },
        {
            label: 'Start on System Startup',
            type: 'checkbox',
            checked: getAutoLaunchStatus(),
            click: (menuItem) => {
                configureAutoLaunch(menuItem.checked);
                updateTrayMenu();
            },
            enabled: !isDev,
        },
        { type: 'separator' },
        {
            label: 'Quit',
            click: () => {
                appWithQuitting.isQuitting = true;
                electron_1.app.quit();
            },
        },
    ]);
    tray.setContextMenu(contextMenu);
}
/**
 * Show native notification
 */
function showNotification(title, body) {
    if (electron_1.Notification.isSupported()) {
        new electron_1.Notification({
            title,
            body,
        }).show();
    }
}
/**
 * Configure auto-launch on system startup
 */
function configureAutoLaunch(enable) {
    if (isDev) {
        console.log('Auto-launch not available in development mode');
        return;
    }
    electron_1.app.setLoginItemSettings({
        openAtLogin: enable,
        openAsHidden: false,
        args: [],
    });
    autoLaunchEnabled = enable;
    console.log(`Auto-launch ${enable ? 'enabled' : 'disabled'}`);
}
/**
 * Get auto-launch status
 */
function getAutoLaunchStatus() {
    if (isDev) {
        return false;
    }
    return electron_1.app.getLoginItemSettings().openAtLogin;
}
/**
 * Set up auto-updater
 * Note: Auto-updater requires proper code signing and update server configuration
 * This is a basic setup that can be extended when deploying to production
 */
function setupAutoUpdater() {
    if (isDev) {
        console.log('Auto-updater not available in development mode');
        return;
    }
    // Auto-updater is only available on Windows and macOS with proper setup
    // For now, we'll just log that it's available but not configured
    console.log('Auto-updater is available but requires configuration');
    console.log('See: https://www.electron.build/auto-update for setup instructions');
    // Uncomment and configure when ready for production with update server:
    /*
    const { autoUpdater } = require('electron-updater');
    
    autoUpdater.on('checking-for-update', () => {
      console.log('Checking for updates...');
    });
  
    autoUpdater.on('update-available', (info: any) => {
      console.log('Update available:', info);
      showNotification(
        'Update Available',
        'A new version is available. It will be downloaded in the background.'
      );
    });
  
    autoUpdater.on('update-not-available', (info: any) => {
      console.log('Update not available:', info);
    });
  
    autoUpdater.on('error', (err: Error) => {
      console.error('Error in auto-updater:', err);
    });
  
    autoUpdater.on('download-progress', (progressObj: any) => {
      const message = `Download speed: ${progressObj.bytesPerSecond} - Downloaded ${progressObj.percent}%`;
      console.log(message);
    });
  
    autoUpdater.on('update-downloaded', (info: any) => {
      console.log('Update downloaded:', info);
      showNotification(
        'Update Ready',
        'A new version has been downloaded. Restart the application to apply the update.'
      );
    });
  
    // Check for updates on startup (after a delay)
    setTimeout(() => {
      autoUpdater.checkForUpdates().catch((err: Error) => {
        console.error('Failed to check for updates:', err);
      });
    }, 5000);
  
    // Check for updates every 4 hours (DISABLED - uncomment when auto-updater is configured)
    // setInterval(() => {
    //   autoUpdater.checkForUpdates().catch((err: Error) => {
    //     console.error('Failed to check for updates:', err);
    //   });
    // }, 4 * 60 * 60 * 1000);
    */
}
/**
 * Set up IPC handlers for communication with renderer process
 */
function setupIpcHandlers() {
    // Get server info
    electron_1.ipcMain.handle('get-server-info', () => {
        return serverConfig || {
            url: '',
            lanIp: '',
            port: 0,
        };
    });
    // Show notification from renderer
    electron_1.ipcMain.handle('show-notification', (_event, { title, body }) => {
        showNotification(title, body);
    });
    // Get app version
    electron_1.ipcMain.handle('get-app-version', () => {
        return electron_1.app.getVersion();
    });
    // Restart server
    electron_1.ipcMain.handle('restart-server', async () => {
        try {
            if (serverLauncher) {
                serverConfig = await serverLauncher.restart();
                return { success: true };
            }
            return { success: false, error: 'Server launcher not initialized' };
        }
        catch (error) {
            console.error('Failed to restart server:', error);
            return { success: false, error: error.message };
        }
    });
    // Auto-launch controls
    electron_1.ipcMain.handle('get-auto-launch-status', () => {
        return getAutoLaunchStatus();
    });
    electron_1.ipcMain.handle('set-auto-launch', (_event, enable) => {
        try {
            configureAutoLaunch(enable);
            return { success: true, enabled: enable };
        }
        catch (error) {
            console.error('Failed to set auto-launch:', error);
            return { success: false, error: error.message };
        }
    });
    // Toggle fullscreen
    electron_1.ipcMain.handle('toggle-fullscreen', () => {
        if (mainWindow) {
            mainWindow.setFullScreen(!mainWindow.isFullScreen());
            return { success: true, fullscreen: mainWindow.isFullScreen() };
        }
        return { success: false, error: 'Window not available' };
    });
    // Update controls
    electron_1.ipcMain.handle('check-for-updates', async () => {
        if (isDev) {
            return { success: false, error: 'Updates not available in development mode' };
        }
        // Auto-updater requires electron-updater package and proper configuration
        return { success: false, error: 'Auto-updater not configured. See documentation for setup.' };
        // Uncomment when electron-updater is configured:
        /*
        try {
          const { autoUpdater } = require('electron-updater');
          await autoUpdater.checkForUpdates();
          return { success: true };
        } catch (error) {
          console.error('Failed to check for updates:', error);
          return { success: false, error: (error as Error).message };
        }
        */
    });
    electron_1.ipcMain.handle('install-update', () => {
        if (isDev) {
            return { success: false, error: 'Updates not available in development mode' };
        }
        // Auto-updater requires electron-updater package and proper configuration
        return { success: false, error: 'Auto-updater not configured. See documentation for setup.' };
        // Uncomment when electron-updater is configured:
        /*
        try {
          const { autoUpdater } = require('electron-updater');
          autoUpdater.quitAndInstall();
          return { success: true };
        } catch (error) {
          console.error('Failed to install update:', error);
          return { success: false, error: (error as Error).message };
        }
        */
    });
    // Quit application
    electron_1.ipcMain.handle('quit-app', () => {
        try {
            appWithQuitting.isQuitting = true;
            // Use setImmediate to ensure the response is sent before quitting
            setImmediate(() => {
                electron_1.app.quit();
            });
            return { success: true };
        }
        catch (error) {
            console.error('Error quitting app:', error);
            return { success: false, error: error.message };
        }
    });
}
// Application lifecycle
electron_1.app.whenReady().then(async () => {
    try {
        // Setup logging to file for production debugging  
        if (!isDev) {
            const fs = require('fs');
            try {
                const userDataPath = electron_1.app.getPath('userData');
                const logPath = path.join(userDataPath, 'startup.log');
                logStream = fs.createWriteStream(logPath, { flags: 'a' });
                // Override console.log and console.error to also write to file
                const originalLog = console.log;
                const originalError = console.error;
                console.log = (...args) => {
                    const message = args.join(' ');
                    originalLog(...args);
                    if (logStream) {
                        try {
                            logStream.write(`[LOG ${new Date().toISOString()}] ${message}\n`);
                        }
                        catch (e) {
                            // Ignore write errors
                        }
                    }
                };
                console.error = (...args) => {
                    const message = args.join(' ');
                    originalError(...args);
                    if (logStream) {
                        try {
                            logStream.write(`[ERROR ${new Date().toISOString()}] ${message}\n`);
                        }
                        catch (e) {
                            // Ignore write errors
                        }
                    }
                };
            }
            catch (error) {
                // If logging setup fails, continue without it
                console.error('Failed to setup logging:', error);
            }
        }
        console.log('🚀 Application starting...');
        console.log('📦 Is packaged:', electron_1.app.isPackaged);
        console.log('📁 App path:', electron_1.app.getAppPath());
        console.log('📁 Resources path:', process.resourcesPath || 'undefined');
        console.log('📁 User data:', electron_1.app.getPath('userData'));
        console.log('🔧 Development mode:', isDev);
        console.log('📁 __dirname:', __dirname);
        // Create user data directory if it doesn't exist
        const fs = require('fs');
        const userDataPath = electron_1.app.getPath('userData');
        if (!fs.existsSync(userDataPath)) {
            fs.mkdirSync(userDataPath, { recursive: true });
            console.log('✅ Created user data directory');
        }
        // In development mode, skip server launchers (assumes dev servers are already running)
        if (!isDev) {
            // Initialize and start API server
            console.log('🔧 Starting API server...');
            try {
                serverLauncher = new serverLauncher_1.ServerLauncher(isDev);
                serverConfig = await serverLauncher.start(DEFAULT_SERVER_PORT);
                console.log('✅ API server started:', serverConfig.url);
            }
            catch (serverError) {
                console.error('❌ Failed to start API server:', serverError);
                throw new Error(`API Server failed: ${serverError instanceof Error ? serverError.message : String(serverError)}`);
            }
            // Initialize and start Next.js server
            console.log('🔧 Starting Next.js server...');
            try {
                nextServerLauncher = new nextServer_1.NextServerLauncher(isDev);
                nextServerConfig = await nextServerLauncher.start(3000);
                console.log('✅ Next.js server started:', nextServerConfig.url);
            }
            catch (nextError) {
                console.error('❌ Failed to start Next.js server:', nextError);
                const errorMsg = nextError instanceof Error ? nextError.message : String(nextError);
                // Provide detailed troubleshooting information
                console.error('\n📋 Troubleshooting Information:');
                console.error('1. Check if port 3000 is available');
                console.error('2. Verify Next.js standalone build exists');
                console.error('3. Check logs at:', path.join(electron_1.app.getPath('userData'), 'startup.log'));
                console.error('4. Check error log at:', path.join(electron_1.app.getPath('userData'), 'error.log'));
                // Write detailed error information
                const fs = require('fs');
                const detailedError = `
Next.js Startup Error Details:
==============================
Time: ${new Date().toISOString()}
Error: ${errorMsg}
Stack: ${nextError instanceof Error ? nextError.stack : 'N/A'}

System Information:
- Platform: ${process.platform}
- Arch: ${process.arch}
- Node Version: ${process.version}
- Electron Version: ${process.versions.electron}
- App Path: ${electron_1.app.getAppPath()}
- Resources Path: ${process.resourcesPath}
- User Data: ${electron_1.app.getPath('userData')}

Expected Paths:
- Next.js Standalone (nested): ${path.join(process.resourcesPath, 'nextjs', 'standalone', 'packages', 'desktop', 'server.js')}
- Next.js Standalone (flat): ${path.join(process.resourcesPath, 'nextjs', 'standalone', 'server.js')}

Please check if these files exist and report this error to support.
`;
                try {
                    const errorLogPath = path.join(electron_1.app.getPath('userData'), 'nextjs-error.log');
                    fs.writeFileSync(errorLogPath, detailedError);
                    console.error(`\n📝 Detailed error written to: ${errorLogPath}`);
                }
                catch (writeError) {
                    console.error('Failed to write error log:', writeError);
                }
                throw new Error(`Next.js Server failed: ${errorMsg}`);
            }
            // Show success notification
            showNotification('Server Started', `Restaurant Management System is running`);
        }
        else {
            console.log('Development mode: Using external dev servers on port 3000 and 5000');
            // In dev mode, assume servers are running externally
            serverConfig = {
                port: DEFAULT_SERVER_PORT,
                url: `http://localhost:${DEFAULT_SERVER_PORT}`,
                lanIp: 'localhost'
            };
            nextServerConfig = {
                port: 3000,
                url: 'http://localhost:3000'
            };
        }
        // Set up IPC handlers
        setupIpcHandlers();
        // Create the window
        createWindow();
        // Create system tray
        createTray();
        // Set up auto-updater
        setupAutoUpdater();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';
        console.error('❌ Failed to initialize application:');
        console.error('Error message:', errorMessage);
        console.error('Error stack:', errorStack);
        // Write error to log file in production
        if (!isDev) {
            const fs = require('fs');
            const logPath = path.join(electron_1.app.getPath('userData'), 'error.log');
            const logMessage = `
[${new Date().toISOString()}] Startup Error:
${errorMessage}
${errorStack}
`;
            try {
                fs.appendFileSync(logPath, logMessage);
                console.log('📝 Error logged to:', logPath);
            }
            catch (logError) {
                console.error('Failed to write error log:', logError);
            }
        }
        // Instead of quitting, show error dialog and create window anyway
        const { dialog } = require('electron');
        // Create window first so user can see something
        createWindow();
        // Show error dialog with options
        const choice = await dialog.showMessageBox({
            type: 'error',
            title: 'Server Startup Error',
            message: 'Failed to start application servers',
            detail: `${errorMessage}\n\nThe application may not work correctly. You can:\n\n1. Retry - Attempt to restart the servers\n2. Continue Anyway - Use the app (may have limited functionality)\n3. View Logs - Open the log file for troubleshooting\n4. Quit - Close the application`,
            buttons: ['Retry', 'Continue Anyway', 'View Logs', 'Quit'],
            defaultId: 0,
            cancelId: 1,
        });
        if (choice.response === 0) {
            // Retry - restart the app
            electron_1.app.relaunch();
            electron_1.app.quit();
        }
        else if (choice.response === 2) {
            // View Logs
            const { shell } = require('electron');
            const logPath = path.join(electron_1.app.getPath('userData'), 'error.log');
            shell.showItemInFolder(logPath);
        }
        else if (choice.response === 3) {
            // Quit
            electron_1.app.quit();
        }
        // If choice is 1 (Continue Anyway), just continue with the window already created
    }
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});
electron_1.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('before-quit', async () => {
    appWithQuitting.isQuitting = true;
    // Stop both servers
    if (nextServerLauncher) {
        await nextServerLauncher.stop();
    }
    if (serverLauncher) {
        await serverLauncher.stop();
    }
});
// Handle app quit
electron_1.app.on('will-quit', async (event) => {
    const isNextRunning = nextServerLauncher && nextServerLauncher.isRunning();
    const isServerRunning = serverLauncher && serverLauncher.isRunning();
    if (isNextRunning || isServerRunning) {
        event.preventDefault();
        try {
            // Set a maximum timeout for cleanup
            const cleanupPromise = Promise.all([
                nextServerLauncher ? nextServerLauncher.stop() : Promise.resolve(),
                serverLauncher ? serverLauncher.stop() : Promise.resolve()
            ]);
            // Wait maximum 10 seconds for graceful shutdown
            await Promise.race([
                cleanupPromise,
                new Promise((resolve) => setTimeout(resolve, 10000))
            ]);
        }
        catch (error) {
            console.error('Error during cleanup:', error);
        }
        finally {
            // Force quit after cleanup attempt
            setTimeout(() => {
                process.exit(0);
            }, 100);
        }
    }
});
