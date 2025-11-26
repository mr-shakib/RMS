import { contextBridge, ipcRenderer } from 'electron';

// Define the API interface
export interface ElectronAPI {
  getServerInfo: () => Promise<{
    url: string;
    lanIp: string;
    port: number;
  }>;
  showNotification: (title: string, body: string) => Promise<void>;
  getAppVersion: () => Promise<string>;
  restartServer: () => Promise<{ success: boolean; error?: string }>;
  getAutoLaunchStatus: () => Promise<boolean>;
  setAutoLaunch: (enable: boolean) => Promise<{ success: boolean; enabled?: boolean; error?: string }>;
  checkForUpdates: () => Promise<{ success: boolean; error?: string }>;
  installUpdate: () => Promise<{ success: boolean; error?: string }>;
  quitApp: () => Promise<{ success: boolean }>;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  getServerInfo: () => ipcRenderer.invoke('get-server-info'),
  showNotification: (title: string, body: string) => 
    ipcRenderer.invoke('show-notification', { title, body }),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  restartServer: () => ipcRenderer.invoke('restart-server'),
  getAutoLaunchStatus: () => ipcRenderer.invoke('get-auto-launch-status'),
  setAutoLaunch: (enable: boolean) => ipcRenderer.invoke('set-auto-launch', enable),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  quitApp: () => ipcRenderer.invoke('quit-app'),
} as ElectronAPI);
