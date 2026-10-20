import { contextBridge, ipcRenderer } from 'electron';
import type {
  IElectronAPI,
  TrackingStartPayload,
  TrackingSessionStatus,
  IdleDetectionPayload,
  TaskOption
} from '../../types/electron';

const electronAPI: IElectronAPI = {
  startTracking: (payload: TrackingStartPayload) =>
    ipcRenderer.invoke('tracker:start', payload),

  stopTracking: () =>
    ipcRenderer.invoke('tracker:stop'),

  getAvailableTasks: () =>
    ipcRenderer.invoke('tracker:get-tasks'),

  getSystemStatus: () =>
    ipcRenderer.invoke('tracker:get-status'),

  respondToIdlePrompt: (decision: 'KEEP' | 'DISCARD') =>
    ipcRenderer.invoke('tracker:idle-decision', decision),

  onIdleDetected: (callback: (data: IdleDetectionPayload) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, data: IdleDetectionPayload) =>
      callback(data);
    ipcRenderer.on('tracker:idle-detected', handler);
    return () => {
      ipcRenderer.removeListener('tracker:idle-detected', handler);
    };
  },

  onTrackingTick: (callback: (status: TrackingSessionStatus) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: TrackingSessionStatus) =>
      callback(status);
    ipcRenderer.on('tracker:tick', handler);
    return () => {
      ipcRenderer.removeListener('tracker:tick', handler);
    };
  },

  onSyncStatusChanged: (callback: (status: { isSyncing: boolean; queueCount: number }) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: { isSyncing: boolean; queueCount: number }) =>
      callback(status);
    ipcRenderer.on('tracker:sync-status', handler);
    return () => {
      ipcRenderer.removeListener('tracker:sync-status', handler);
    };
  },

  minimizeToTray: () =>
    ipcRenderer.send('window:minimize-to-tray'),

  quitApp: () =>
    ipcRenderer.send('app:quit'),
};

contextBridge.exposeInMainWorld('electronAPI', electronAPI);
