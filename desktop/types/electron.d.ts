export interface TaskOption {
  id: string;
  projectId: string;
  projectName: string;
  taskTitle: string;
  billingRate: number;
}

export interface TrackingSessionStatus {
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

export interface IdleDetectionPayload {
  idleMinutes: number;
  pausedTimestamp: string;
  autoDiscardAllowed: boolean;
}

export interface TrackingStartPayload {
  projectId: string;
  taskId?: string;
  note?: string;
}

export interface IElectronAPI {
  // Session Controls
  startTracking: (payload: TrackingStartPayload) => Promise<{ success: boolean; entryId?: string; error?: string }>;
  stopTracking: () => Promise<{ success: boolean; durationSeconds: number; error?: string }>;
  
  // Data Retrieval
  getAvailableTasks: () => Promise<TaskOption[]>;
  getSystemStatus: () => Promise<TrackingSessionStatus>;
  
  // Idle Decision Handling
  respondToIdlePrompt: (decision: 'KEEP' | 'DISCARD') => Promise<{ success: boolean }>;
  
  // Subscriptions & Event Listeners
  onIdleDetected: (callback: (data: IdleDetectionPayload) => void) => () => void;
  onTrackingTick: (callback: (status: TrackingSessionStatus) => void) => () => void;
  onSyncStatusChanged: (callback: (status: { isSyncing: boolean; queueCount: number }) => void) => () => void;
  
  // App Controls
  minimizeToTray: () => void;
  quitApp: () => void;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
