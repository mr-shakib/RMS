import { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { ServerLauncher, ServerConfig } from './serverLauncher';
import { NextServerLauncher, NextServerConfig } from './nextServer';

// Extend app object to include isQuitting property
interface AppWithQuitting extends Electron.App {
  isQuitting?: boolean;
}

const appWithQuitting = app as AppWithQuitting;

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let serverLauncher: ServerLauncher | null = null;
let serverConfig: ServerConfig | null = null;
let nextServerLauncher: NextServerLauncher | null = null;
let nextServerConfig: NextServerConfig | null = null;
let tray: Tray | null = null;

// Check if we're in development mode
const isDev = !app.isPackaged;

// Server configuration
const DEFAULT_SERVER_PORT = 5000;

// Auto-launch setting (can be configured from settings)
let autoLaunchEnabled = false;

// Will be setup in app.whenReady()
let logStream: any = null;

/**
 * Create splash/loading window
 */
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  // Create a modern, professional loading HTML
  const loadingHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            margin: 0;
            padding: 0;
            background: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            overflow: hidden;
          }
          
          .splash-container {
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            box-shadow: 0 25px 80px rgba(0, 0, 0, 0.35);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 50px;
            position: relative;
            overflow: hidden;
          }
          
          /* Animated gradient overlay */
          .gradient-overlay {
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
            animation: rotate 10s linear infinite;
          }
          
          @keyframes rotate {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          /* Floating particles */
          .particle {
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.15);
            animation: float 8s ease-in-out infinite;
          }
          
          .particle:nth-child(1) {
            width: 60px;
            height: 60px;
            top: 10%;
            left: 10%;
            animation-delay: 0s;
            animation-duration: 8s;
          }
          
          .particle:nth-child(2) {
            width: 40px;
            height: 40px;
            top: 60%;
            right: 15%;
            animation-delay: 2s;
            animation-duration: 10s;
          }
          
          .particle:nth-child(3) {
            width: 30px;
            height: 30px;
            bottom: 20%;
            left: 20%;
            animation-delay: 4s;
            animation-duration: 12s;
          }
          
          .particle:nth-child(4) {
            width: 50px;
            height: 50px;
            top: 30%;
            right: 25%;
            animation-delay: 1s;
            animation-duration: 9s;
          }
          
          @keyframes float {
            0%, 100% {
              transform: translateY(0) translateX(0) scale(1);
              opacity: 0.3;
            }
            33% {
              transform: translateY(-30px) translateX(20px) scale(1.1);
              opacity: 0.6;
            }
            66% {
              transform: translateY(20px) translateX(-20px) scale(0.9);
              opacity: 0.4;
            }
          }
          
          .content {
            position: relative;
            z-index: 10;
            text-align: center;
          }
          
          .icon-wrapper {
            position: relative;
            margin-bottom: 30px;
          }
          
          .logo {
            font-size: 80px;
            filter: drop-shadow(0 10px 20px rgba(0,0,0,0.2));
            animation: bounce 2.5s ease-in-out infinite;
          }
          
          @keyframes bounce {
            0%, 100% {
              transform: translateY(0) scale(1);
            }
            50% {
              transform: translateY(-15px) scale(1.05);
            }
          }
          
          .logo-glow {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 120px;
            height: 120px;
            background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
            border-radius: 50%;
            animation: pulse 2s ease-in-out infinite;
          }
          
          @keyframes pulse {
            0%, 100% {
              transform: translate(-50%, -50%) scale(1);
              opacity: 0.5;
            }
            50% {
              transform: translate(-50%, -50%) scale(1.3);
              opacity: 0.8;
            }
          }
          
          h1 {
            color: white;
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 8px 0;
            letter-spacing: -0.5px;
            text-shadow: 0 2px 10px rgba(0,0,0,0.2);
          }
          
          .subtitle {
            color: rgba(255, 255, 255, 0.95);
            font-size: 15px;
            font-weight: 500;
            margin-bottom: 50px;
            letter-spacing: 1px;
            text-transform: uppercase;
            text-shadow: 0 2px 5px rgba(0,0,0,0.1);
          }
          
          .loading-container {
            width: 100%;
            max-width: 240px;
            margin: 0 auto;
          }
          
          .progress-wrapper {
            position: relative;
            margin-bottom: 25px;
          }
          
          .progress-bar {
            width: 100%;
            height: 5px;
            background: rgba(255, 255, 255, 0.2);
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, 
              rgba(255,255,255,0.6) 0%, 
              rgba(255,255,255,1) 50%, 
              rgba(255,255,255,0.6) 100%
            );
            background-size: 200% 100%;
            border-radius: 10px;
            animation: shimmer 2s ease-in-out infinite;
            box-shadow: 0 0 15px rgba(255,255,255,0.5);
          }
          
          @keyframes shimmer {
            0% {
              width: 0%;
              background-position: -200% 0;
            }
            50% {
              width: 80%;
              background-position: 0% 0;
            }
            100% {
              width: 100%;
              background-position: 200% 0;
            }
          }
          
          .status-text {
            color: rgba(255, 255, 255, 0.95);
            font-size: 14px;
            font-weight: 600;
            animation: fadeInOut 2.5s ease-in-out infinite;
            text-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          
          @keyframes fadeInOut {
            0%, 100% {
              opacity: 0.6;
            }
            50% {
              opacity: 1;
            }
          }
          
          .dots {
            display: inline-flex;
            gap: 5px;
            margin-left: 5px;
          }
          
          .dot {
            width: 5px;
            height: 5px;
            background: white;
            border-radius: 50%;
            box-shadow: 0 0 5px rgba(255,255,255,0.5);
            animation: dotBounce 1.4s ease-in-out infinite;
          }
          
          .dot:nth-child(1) { animation-delay: 0s; }
          .dot:nth-child(2) { animation-delay: 0.2s; }
          .dot:nth-child(3) { animation-delay: 0.4s; }
          
          @keyframes dotBounce {
            0%, 60%, 100% {
              opacity: 0.4;
              transform: scale(0.8);
            }
            30% {
              opacity: 1;
              transform: scale(1.3);
            }
          }
          
          .version {
            position: absolute;
            bottom: 25px;
            right: 30px;
            color: rgba(255, 255, 255, 0.7);
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-shadow: 0 1px 2px rgba(0,0,0,0.1);
          }
          
          .powered-by {
            position: absolute;
            bottom: 25px;
            left: 30px;
            color: rgba(255, 255, 255, 0.6);
            font-size: 11px;
            font-weight: 500;
            letter-spacing: 0.3px;
          }
        </style>
      </head>
      <body>
        <div class="splash-container">
          <div class="gradient-overlay"></div>
          <div class="particle"></div>
          <div class="particle"></div>
          <div class="particle"></div>
          <div class="particle"></div>
          
          <div class="content">
            <div class="icon-wrapper">
              <div class="logo-glow"></div>
              <div class="logo">🍽️</div>
            </div>
            <h1>Restaurant POS</h1>
            <div class="subtitle">Management System</div>
            
            <div class="loading-container">
              <div class="progress-wrapper">
                <div class="progress-bar">
                  <div class="progress-fill"></div>
                </div>
              </div>
              <div class="status-text">
                Initializing<span class="dots"><span class="dot"></span><span class="dot"></span><span class="dot"></span></span>
              </div>
            </div>
          </div>
          
          <div class="powered-by">Powered by Electron</div>
          <div class="version">v1.0.0</div>
        </div>
      </body>
    </html>
  `;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(loadingHTML)}`);
}

/**
 * Close splash window
 */
function closeSplashWindow() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
    splashWindow = null;
  }
}

/**
 * Create the main application window
 */
function createWindow() {
  mainWindow = new BrowserWindow({
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
    autoHideMenuBar: true,
    // Start fullscreen
    fullscreen: !isDev, // Fullscreen in production, normal in dev
  });

  // Hide the menu bar completely
  mainWindow.setMenuBarVisibility(false);

  // Show window when ready to avoid flickering
  mainWindow.once('ready-to-show', () => {
    closeSplashWindow();
    mainWindow?.show();
    // Set fullscreen after showing in production
    if (!isDev) {
      mainWindow?.setFullScreen(true);
    } else {
      mainWindow?.maximize();
    }
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

  mainWindow.on('close', (event: Electron.Event) => {
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
  let icon: Electron.NativeImage;

  try {
    const iconPath = isDev
      ? path.join(__dirname, '../../public/tray-icon.png')
      : path.join(process.resourcesPath, 'public', 'tray-icon.png');

    icon = nativeImage.createFromPath(iconPath);

    // If icon is empty, create a simple placeholder
    if (icon.isEmpty()) {
      icon = nativeImage.createEmpty();
      console.warn('Tray icon not found, using placeholder. See public/ICONS_README.md for icon setup.');
    }
  } catch (error) {
    console.warn('Failed to load tray icon:', error);
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);

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
  if (!tray) return;

  const contextMenu = Menu.buildFromTemplate([
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
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
}

/**
 * Show native notification
 */
function showNotification(title: string, body: string) {
  if (Notification.isSupported()) {
    new Notification({
      title,
      body,
    }).show();
  }
}

/**
 * Configure auto-launch on system startup
 */
function configureAutoLaunch(enable: boolean) {
  if (isDev) {
    console.log('Auto-launch not available in development mode');
    return;
  }

  app.setLoginItemSettings({
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
function getAutoLaunchStatus(): boolean {
  if (isDev) {
    return false;
  }
  return app.getLoginItemSettings().openAtLogin;
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
  ipcMain.handle('get-server-info', () => {
    return serverConfig || {
      url: '',
      lanIp: '',
      port: 0,
    };
  });

  // Show notification from renderer
  ipcMain.handle('show-notification', (_event, { title, body }) => {
    showNotification(title, body);
  });

  // Get app version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Restart server
  ipcMain.handle('restart-server', async () => {
    try {
      if (serverLauncher) {
        serverConfig = await serverLauncher.restart();
        return { success: true };
      }
      return { success: false, error: 'Server launcher not initialized' };
    } catch (error) {
      console.error('Failed to restart server:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Auto-launch controls
  ipcMain.handle('get-auto-launch-status', () => {
    return getAutoLaunchStatus();
  });

  ipcMain.handle('set-auto-launch', (_event, enable: boolean) => {
    try {
      configureAutoLaunch(enable);
      return { success: true, enabled: enable };
    } catch (error) {
      console.error('Failed to set auto-launch:', error);
      return { success: false, error: (error as Error).message };
    }
  });

  // Toggle fullscreen
  ipcMain.handle('toggle-fullscreen', () => {
    if (mainWindow) {
      mainWindow.setFullScreen(!mainWindow.isFullScreen());
      return { success: true, fullscreen: mainWindow.isFullScreen() };
    }
    return { success: false, error: 'Window not available' };
  });

  // Update controls
  ipcMain.handle('check-for-updates', async () => {
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

  ipcMain.handle('install-update', () => {
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
  ipcMain.handle('quit-app', () => {
    try {
      appWithQuitting.isQuitting = true;
      // Use setImmediate to ensure the response is sent before quitting
      setImmediate(() => {
        app.quit();
      });
      return { success: true };
    } catch (error) {
      console.error('Error quitting app:', error);
      return { success: false, error: (error as Error).message };
    }
  });
}

// Application lifecycle
app.whenReady().then(async () => {
  try {
    // Show splash window immediately
    if (!isDev) {
      createSplashWindow();
    }

    // Setup logging to file for production debugging  
    if (!isDev) {
      const fs = require('fs');
      try {
        const userDataPath = app.getPath('userData');
        const logPath = path.join(userDataPath, 'startup.log');
        logStream = fs.createWriteStream(logPath, { flags: 'a' });

        // Override console.log and console.error to also write to file
        const originalLog = console.log;
        const originalError = console.error;

        console.log = (...args: any[]) => {
          const message = args.join(' ');
          originalLog(...args);
          if (logStream) {
            try {
              logStream.write(`[LOG ${new Date().toISOString()}] ${message}\n`);
            } catch (e) {
              // Ignore write errors
            }
          }
        };

        console.error = (...args: any[]) => {
          const message = args.join(' ');
          originalError(...args);
          if (logStream) {
            try {
              logStream.write(`[ERROR ${new Date().toISOString()}] ${message}\n`);
            } catch (e) {
              // Ignore write errors
            }
          }
        };
      } catch (error) {
        // If logging setup fails, continue without it
        console.error('Failed to setup logging:', error);
      }
    }

    console.log('🚀 Application starting...');
    console.log('📦 Is packaged:', app.isPackaged);
    console.log('📁 App path:', app.getAppPath());
    console.log('📁 Resources path:', process.resourcesPath || 'undefined');
    console.log('📁 User data:', app.getPath('userData'));
    console.log('🔧 Development mode:', isDev);
    console.log('📁 __dirname:', __dirname);

    // Create user data directory if it doesn't exist
    const fs = require('fs');
    const userDataPath = app.getPath('userData');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
      console.log('✅ Created user data directory');
    }

    // Create database directory in user data path
    const databaseDir = path.join(userDataPath, 'database');
    if (!fs.existsSync(databaseDir)) {
      fs.mkdirSync(databaseDir, { recursive: true });
      console.log('✅ Created database directory:', databaseDir);
    }

    // Verify we can write to the database directory
    const testFile = path.join(databaseDir, '.write-test');
    try {
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      console.log('✅ Database directory is writable');
    } catch (writeError) {
      console.error('❌ Cannot write to database directory:', writeError);
      throw new Error(`Database directory is not writable: ${databaseDir}`);
    }

    // In development mode, skip server launchers (assumes dev servers are already running)
    if (!isDev) {
      // Start servers in parallel for faster startup
      console.log('🔧 Starting servers in parallel...');
      
      const startServers = async () => {
        const [apiConfig, nextConfig] = await Promise.allSettled([
          // API Server
          (async () => {
            try {
              serverLauncher = new ServerLauncher(isDev);
              const config = await serverLauncher.start(DEFAULT_SERVER_PORT);
              console.log('✅ API server started:', config.url);
              return config;
            } catch (error) {
              console.error('❌ Failed to start API server:', error);
              throw new Error(`API Server failed: ${error instanceof Error ? error.message : String(error)}`);
            }
          })(),
          
          // Next.js Server (can start in parallel)
          (async () => {
            try {
              nextServerLauncher = new NextServerLauncher(isDev);
              const config = await nextServerLauncher.start(3000);
              console.log('✅ Next.js server started:', config.url);
              return config;
            } catch (error) {
              console.error('❌ Failed to start Next.js server:', error);
              // Log error but don't throw - use fallback
              console.log('⚠️  Next.js server reported errors, using fallback config...');
              return { port: 3000, url: 'http://localhost:3000' };
            }
          })()
        ]);

        // Handle API server result
        if (apiConfig.status === 'fulfilled') {
          serverConfig = apiConfig.value;
        } else {
          throw apiConfig.reason;
        }

        // Handle Next.js server result
        if (nextConfig.status === 'fulfilled') {
          nextServerConfig = nextConfig.value;
        } else {
          // Use fallback config if Next.js failed
          nextServerConfig = { port: 3000, url: 'http://localhost:3000' };
        }
      };

      await startServers();

      // Show success notification
      showNotification(
        'Server Started',
        `Restaurant Management System is ready`
      );
    } else {
      console.log('Development mode: Using external dev servers on port 3000 and 5000');
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

    // Create the main window
    createWindow();

    // Create system tray
    createTray();

    // Set up auto-updater
    setupAutoUpdater();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : '';

    console.error('❌ Failed to initialize application:');
    console.error('Error message:', errorMessage);
    console.error('Error stack:', errorStack);

    // Close splash window
    closeSplashWindow();

    // Write error to log file in production
    if (!isDev) {
      const fs = require('fs');
      const logPath = path.join(app.getPath('userData'), 'error.log');
      const logMessage = `
[${new Date().toISOString()}] Startup Error:
${errorMessage}
${errorStack}
`;
      try {
        fs.appendFileSync(logPath, logMessage);
        console.log('📝 Error logged to:', logPath);
      } catch (logError) {
        console.error('Failed to write error log:', logError);
      }
    }

    // Only show critical errors
    if (errorMessage.includes('API Server failed')) {
      const { dialog } = require('electron');
      
      createWindow();

      const choice = await dialog.showMessageBox({
        type: 'error',
        title: 'Critical Server Error',
        message: 'Failed to start API server',
        detail: `${errorMessage}\n\nThe API server is required. You can:\n\n1. Retry - Restart the application\n2. View Logs - Check error logs\n3. Quit - Close the application`,
        buttons: ['Retry', 'View Logs', 'Quit'],
        defaultId: 0,
        cancelId: 2,
      });

      if (choice.response === 0) {
        // Retry
        app.relaunch();
        app.exit();
      } else if (choice.response === 1) {
        // View Logs
        const userDataPath = app.getPath('userData');
        const logPath = path.join(userDataPath, 'error.log');
        const { shell } = require('electron');
        shell.openPath(logPath);
      } else {
        // Quit
        app.quit();
      }
    } else {
      // For non-critical errors, just quit
      app.quit();
    }
  }
});

// Quit application when all windows are closed (except on macOS)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// macOS specific: re-create the window in the app when the dock icon is clicked and no other windows are open
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
