"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const electronAPI = {
    startTracking: (payload) => electron_1.ipcRenderer.invoke('tracker:start', payload),
    stopTracking: () => electron_1.ipcRenderer.invoke('tracker:stop'),
    getAvailableTasks: () => electron_1.ipcRenderer.invoke('tracker:get-tasks'),
    getSystemStatus: () => electron_1.ipcRenderer.invoke('tracker:get-status'),
    respondToIdlePrompt: (decision) => electron_1.ipcRenderer.invoke('tracker:idle-decision', decision),
    onIdleDetected: (callback) => {
        const handler = (_event, data) => callback(data);
        electron_1.ipcRenderer.on('tracker:idle-detected', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('tracker:idle-detected', handler);
        };
    },
    onTrackingTick: (callback) => {
        const handler = (_event, status) => callback(status);
        electron_1.ipcRenderer.on('tracker:tick', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('tracker:tick', handler);
        };
    },
    onSyncStatusChanged: (callback) => {
        const handler = (_event, status) => callback(status);
        electron_1.ipcRenderer.on('tracker:sync-status', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('tracker:sync-status', handler);
        };
    },
    minimizeToTray: () => electron_1.ipcRenderer.send('window:minimize-to-tray'),
    quitApp: () => electron_1.ipcRenderer.send('app:quit'),
};
electron_1.contextBridge.exposeInMainWorld('electronAPI', electronAPI);
