// desktop/src/types/global.d.ts
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

export interface ElectronApi {
  startTracking: (projectId: string, taskId?: string) => Promise<{ success: boolean; entryId?: string }>;
  stopTracking: () => Promise<{ success: boolean; durationSeconds: number }>;
  getStatus: () => Promise<TrackerStatus>;
  handleIdleDecision: (decision: 'KEEP' | 'DISCARD') => Promise<{ success: boolean }>;
  getTasks: () => Promise<TaskItem[]>;
  minimizeWindow: () => void;
  quitApp: () => void;
  onTrackerTick: (callback: (status: TrackerStatus) => void) => () => void;
  onIdleDetected: (callback: (payload: IdlePayload) => void) => () => void;
}

declare global {
  interface Window {
    api: ElectronApi;
  }
}

export {};
