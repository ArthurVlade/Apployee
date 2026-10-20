"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// desktop/electron/preload.ts
const electron_1 = require("electron");
const api = {
    startTracking: (projectId, taskId) => electron_1.ipcRenderer.invoke('tracker:start', { projectId, taskId }),
    stopTracking: () => electron_1.ipcRenderer.invoke('tracker:stop'),
    getStatus: () => electron_1.ipcRenderer.invoke('tracker:get-status'),
    handleIdleDecision: (decision) => electron_1.ipcRenderer.invoke('tracker:idle-decision', decision),
    getTasks: () => electron_1.ipcRenderer.invoke('tracker:get-tasks'),
    minimizeWindow: () => electron_1.ipcRenderer.send('window:minimize-to-tray'),
    quitApp: () => electron_1.ipcRenderer.send('app:quit'),
    onTrackerTick: (callback) => {
        const handler = (_, status) => callback(status);
        electron_1.ipcRenderer.on('tracker:tick', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('tracker:tick', handler);
        };
    },
    onIdleDetected: (callback) => {
        const handler = (_, payload) => callback(payload);
        electron_1.ipcRenderer.on('tracker:idle-detected', handler);
        return () => {
            electron_1.ipcRenderer.removeListener('tracker:idle-detected', handler);
        };
    },
};
electron_1.contextBridge.exposeInMainWorld('api', api);
