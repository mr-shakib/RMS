"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
electron_1.contextBridge.exposeInMainWorld('electron', {
    getServerInfo: () => electron_1.ipcRenderer.invoke('get-server-info'),
    showNotification: (title, body) => electron_1.ipcRenderer.invoke('show-notification', { title, body }),
    getAppVersion: () => electron_1.ipcRenderer.invoke('get-app-version'),
    restartServer: () => electron_1.ipcRenderer.invoke('restart-server'),
    getAutoLaunchStatus: () => electron_1.ipcRenderer.invoke('get-auto-launch-status'),
    setAutoLaunch: (enable) => electron_1.ipcRenderer.invoke('set-auto-launch', enable),
    checkForUpdates: () => electron_1.ipcRenderer.invoke('check-for-updates'),
    installUpdate: () => electron_1.ipcRenderer.invoke('install-update'),
    quitApp: () => electron_1.ipcRenderer.invoke('quit-app'),
});
