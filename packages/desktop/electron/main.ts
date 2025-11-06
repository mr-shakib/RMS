import { app, BrowserWindow, ipcMain, Notification, Tray, Menu, nativeImage } from 'electron';
import * as path from 'path';
import { ServerLauncher, ServerConfig } from './serverLauncher';

// Extend app object to include isQuitting property
interface AppWithQuitting extends Electron.App {
  isQuitting?: boolean;
}

const appWithQuitting = app as AppWithQuitting;

let mainWindow: BrowserWindow | null = null;
let serverLauncher: ServerLauncher | null = null;
let serverConfig: ServerConfig | null = null;
let tray: Tray | null = null;

// Check if we're in development mode
const isDev = !app.isPackaged;

// Server configuration
const DEFAULT_SERVER_PORT = 5000;

// Auto-launch setting (can be configured from settings)
let autoLaunchEnabled = false;

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
  });

  // Show window when ready to avoid flickering
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // In development, load from Next.js dev server
  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // In production, load from built files
    mainWindow.loadFile(path.join(__dirname, '../../.next/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle window minimize to tray
  mainWindow.on('minimize', (event: Electron.Event) => {
    if (tray) {
      event.preventDefault();
      mainWindow?.hide();
    }
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

  // Check for updates every 4 hours
  setInterval(() => {
    autoUpdater.checkForUpdates().catch((err: Error) => {
      console.error('Failed to check for updates:', err);
    });
  }, 4 * 60 * 60 * 1000);
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
}

// Application lifecycle
app.whenReady().then(async () => {
  try {
    // Initialize server launcher
    serverLauncher = new ServerLauncher(isDev);
    
    // Start the server first
    serverConfig = await serverLauncher.start(DEFAULT_SERVER_PORT);
    
    // Set up IPC handlers
    setupIpcHandlers();
    
    // Create the window
    createWindow();
    
    // Create system tray
    createTray();
    
    // Set up auto-updater
    setupAutoUpdater();
    
    // Show success notification
    showNotification(
      'Server Started',
      `Restaurant Management System is running on port ${serverConfig.port}`
    );
  } catch (error) {
    console.error('Failed to initialize application:', error);
    showNotification(
      'Startup Error',
      'Failed to start the application. Please check the logs.'
    );
    app.quit();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', async () => {
  appWithQuitting.isQuitting = true;
  if (serverLauncher) {
    await serverLauncher.stop();
  }
});

// Handle app quit
app.on('will-quit', async (event) => {
  if (serverLauncher && serverLauncher.isRunning()) {
    event.preventDefault();
    await serverLauncher.stop();
    app.quit();
  }
});
