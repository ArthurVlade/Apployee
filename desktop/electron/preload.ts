// desktop/electron/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

export interface TaskItem {
  id: string;
  projectId: string;
  projectName: string;
  taskTitle: string;
  billingRate: number;
}

export interface TrackerStatus {
  isTracking: boolean;
  activeEntryId: string | null;
  activeTaskId: string | null;
  activeProjectId: string | null;
  startTime: string | null;
  elapsedSeconds: number;
  todaySeconds: number;
  currentProductivityScore: number;
  isIdlePaused: boolean;
  isOnline: boolean;
  queuedSyncItems: number;
}

export interface IdlePayload {
  idleMinutes: number;
  pausedTimestamp: string;
  autoDiscardAllowed: boolean;
}

const api = {
  startTracking: (projectId: string, taskId?: string) =>
    ipcRenderer.invoke('tracker:start', { projectId, taskId }),

  stopTracking: () =>
    ipcRenderer.invoke('tracker:stop'),

  getStatus: (): Promise<TrackerStatus> =>
    ipcRenderer.invoke('tracker:get-status'),

  handleIdleDecision: (decision: 'KEEP' | 'DISCARD') =>
    ipcRenderer.invoke('tracker:idle-decision', decision),

  getTasks: (): Promise<TaskItem[]> =>
    ipcRenderer.invoke('tracker:get-tasks'),

  minimizeWindow: () =>
    ipcRenderer.send('window:minimize-to-tray'),

  quitApp: () =>
    ipcRenderer.send('app:quit'),

  onTrackerTick: (callback: (status: TrackerStatus) => void) => {
    const handler = (_: Electron.IpcRendererEvent, status: TrackerStatus) => callback(status);
    ipcRenderer.on('tracker:tick', handler);
    return () => {
      ipcRenderer.removeListener('tracker:tick', handler);
    };
  },

  onIdleDetected: (callback: (payload: IdlePayload) => void) => {
    const handler = (_: Electron.IpcRendererEvent, payload: IdlePayload) => callback(payload);
    ipcRenderer.on('tracker:idle-detected', handler);
    return () => {
      ipcRenderer.removeListener('tracker:idle-detected', handler);
    };
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronApi = typeof api;
