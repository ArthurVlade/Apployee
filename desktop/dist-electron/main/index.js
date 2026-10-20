"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const screenshot_engine_1 = require("../services/screenshot-engine");
const activity_monitor_1 = require("../services/activity-monitor");
const window_tracker_1 = require("../services/window-tracker");
const sync_engine_1 = require("../services/sync-engine");
let mainWindow = null;
let tray = null;
let isQuitting = false;
// Core Engine Services
let screenshotScheduler;
let activityMonitor;
let windowTracker;
let syncEngine;
// Runtime Tracking Session State
let isTracking = false;
let activeEntryId = null;
let activeProjectId = null;
let activeTaskId = null;
let sessionStartTime = null;
let sessionDurationSeconds = 0;
let todayTotalSeconds = 21740; // Simulated 6h 2m baseline
let sessionInterval = null;
let isIdlePaused = false;
let idleStartedTimestamp = null;
// 1. Single Instance Lock
const gotSingleInstanceLock = electron_1.app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
    electron_1.app.quit();
}
else {
    electron_1.app.on('second-instance', () => {
        if (mainWindow) {
            if (mainWindow.isMinimized())
                mainWindow.restore();
            mainWindow.show();
            mainWindow.focus();
        }
    });
    electron_1.app.whenReady().then(initializeApplication);
}
async function initializeApplication() {
    // Initialize services
    screenshotScheduler = new screenshot_engine_1.ScreenshotScheduler(3); // 3 screenshots per 10 mins
    activityMonitor = new activity_monitor_1.ActivityMonitorService(5); // 5 minutes idle threshold
    windowTracker = new window_tracker_1.WindowTrackerService();
    syncEngine = new sync_engine_1.SyncEngineService();
    createMainWindow();
    createSystemTray();
    registerIpcHandlers();
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
        else {
            mainWindow?.show();
        }
    });
}
function createMainWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 380,
        height: 560,
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        frame: false, // Sleek frameless custom widget
        transparent: false,
        backgroundColor: '#020617', // Slate 950
        show: false,
        webPreferences: {
            preload: path_1.default.join(__dirname, '../preload/index.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });
    const rendererUrl = process.env['ELECTRON_RENDERER_URL'] || process.env.VITE_DEV_SERVER_URL;
    if (rendererUrl) {
        mainWindow.loadURL(rendererUrl);
    }
    else {
        // electron-vite bundles renderer into out/renderer/index.html
        const prodPath = path_1.default.join(__dirname, '../renderer/index.html');
        mainWindow.loadFile(prodPath);
    }
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    // Intercept close button: Hide to tray instead of quitting tracking process
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });
}
function createSystemTray() {
    // 16x16 icon placeholder or nativeImage
    const icon = electron_1.nativeImage.createEmpty();
    tray = new electron_1.Tray(icon);
    tray.setToolTip('Apploye Native Time Tracker');
    const updateTrayMenu = () => {
        const contextMenu = electron_1.Menu.buildFromTemplate([
            {
                label: isTracking ? 'Apploye: Tracking Active' : 'Apploye: Stopped',
                enabled: false,
            },
            { type: 'separator' },
            {
                label: 'Open Tracker',
                click: () => {
                    mainWindow?.show();
                    mainWindow?.focus();
                },
            },
            {
                label: isTracking ? 'Pause Tracking' : 'Start Tracking',
                click: () => {
                    if (isTracking) {
                        stopTrackingSession();
                    }
                    else {
                        mainWindow?.show();
                    }
                },
            },
            { type: 'separator' },
            {
                label: 'Quit Apploye',
                click: () => {
                    isQuitting = true;
                    stopTrackingSession();
                    electron_1.app.quit();
                },
            },
        ]);
        tray?.setContextMenu(contextMenu);
    };
    updateTrayMenu();
    tray.on('click', () => {
        if (mainWindow?.isVisible()) {
            mainWindow.hide();
        }
        else {
            mainWindow?.show();
            mainWindow?.focus();
        }
    });
}
function registerIpcHandlers() {
    // Start Tracking
    electron_1.ipcMain.handle('tracker:start', async (_event, payload) => {
        try {
            startTrackingSession(payload);
            return { success: true, entryId: activeEntryId };
        }
        catch (err) {
            return { success: false, error: err.message };
        }
    });
    // Stop Tracking
    electron_1.ipcMain.handle('tracker:stop', async () => {
        try {
            const duration = stopTrackingSession();
            return { success: true, durationSeconds: duration };
        }
        catch (err) {
            return { success: false, durationSeconds: 0, error: err.message };
        }
    });
    // Get available tasks
    electron_1.ipcMain.handle('tracker:get-tasks', async () => {
        return [
            {
                id: 'task-101',
                projectId: 'proj-1',
                projectName: 'Fintech Mobile App',
                taskTitle: 'Integrate Stripe Webhooks',
                billingRate: 65.0,
            },
            {
                id: 'task-102',
                projectId: 'proj-1',
                projectName: 'Fintech Mobile App',
                taskTitle: 'Code Review PR #44',
                billingRate: 65.0,
            },
            {
                id: 'task-201',
                projectId: 'proj-2',
                projectName: 'SaaS Design System',
                taskTitle: 'Figma Auto-layout Components',
                billingRate: 50.0,
            },
            {
                id: 'task-301',
                projectId: 'proj-3',
                projectName: 'Database Optimization',
                taskTitle: 'Postgres Index Tuning',
                billingRate: 75.0,
            },
        ];
    });
    // Status Poll
    electron_1.ipcMain.handle('tracker:get-status', async () => {
        return getCurrentStatus();
    });
    // Idle Decision Prompt Response (Keep vs Discard)
    electron_1.ipcMain.handle('tracker:idle-decision', async (_event, decision) => {
        if (decision === 'DISCARD' && idleStartedTimestamp) {
            const idleElapsed = Math.round((Date.now() - idleStartedTimestamp) / 1000);
            sessionDurationSeconds = Math.max(0, sessionDurationSeconds - idleElapsed);
            todayTotalSeconds = Math.max(0, todayTotalSeconds - idleElapsed);
        }
        isIdlePaused = false;
        idleStartedTimestamp = null;
        return { success: true };
    });
    electron_1.ipcMain.on('window:minimize-to-tray', () => {
        mainWindow?.hide();
    });
    electron_1.ipcMain.on('app:quit', () => {
        isQuitting = true;
        stopTrackingSession();
        electron_1.app.quit();
    });
}
function startTrackingSession(payload) {
    isTracking = true;
    isIdlePaused = false;
    activeEntryId = crypto.randomUUID();
    activeProjectId = payload.projectId;
    activeTaskId = payload.taskId || null;
    sessionStartTime = Date.now();
    sessionDurationSeconds = 0;
    // 1. Start randomized screenshot capture engine
    screenshotScheduler.start(activeEntryId, async (screenshot) => {
        await syncEngine.enqueueScreenshot({
            id: screenshot.id,
            timeEntryId: screenshot.timeEntryId,
            imageBuffer: screenshot.imageBuffer,
            capturedAt: screenshot.capturedAt,
            monitorIndex: screenshot.monitorIndex,
            resolution: screenshot.resolution,
            activityScore: screenshot.activityScoreAtCapture,
        });
    }, () => activityMonitor.getCurrentProductivityScore());
    // 2. Start native activity & idle monitor
    activityMonitor.start((idleSeconds) => {
        // Idle detection triggered: pause and alert renderer
        if (!isIdlePaused) {
            isIdlePaused = true;
            idleStartedTimestamp = Date.now();
            mainWindow?.webContents.send('tracker:idle-detected', {
                idleMinutes: Math.floor(idleSeconds / 60),
                pausedTimestamp: new Date().toLocaleTimeString(),
                autoDiscardAllowed: true,
            });
            mainWindow?.show();
            mainWindow?.focus();
        }
    }, (tenMinuteBlock) => {
        // Flush 10-minute activity block and app logs
        syncEngine.enqueueActivityBlock({
            time_entry_id: activeEntryId,
            ...tenMinuteBlock,
        });
        const appLogs = windowTracker.flushUsageRecords();
        syncEngine.enqueueAppLogs({
            time_entry_id: activeEntryId,
            logs: appLogs,
        });
    });
    // 3. Start window tracker
    windowTracker.start(15);
    // 4. Session tick interval (1 second)
    sessionInterval = setInterval(() => {
        if (!isIdlePaused) {
            sessionDurationSeconds++;
            todayTotalSeconds++;
        }
        mainWindow?.webContents.send('tracker:tick', getCurrentStatus());
    }, 1000);
}
function stopTrackingSession() {
    if (!isTracking)
        return 0;
    const duration = sessionDurationSeconds;
    isTracking = false;
    isIdlePaused = false;
    screenshotScheduler.stop();
    activityMonitor.stop();
    windowTracker.stop();
    if (sessionInterval) {
        clearInterval(sessionInterval);
        sessionInterval = null;
    }
    // Flush remaining app logs
    const appLogs = windowTracker.flushUsageRecords();
    if (appLogs.length > 0 && activeEntryId) {
        syncEngine.enqueueAppLogs({
            time_entry_id: activeEntryId,
            logs: appLogs,
        });
    }
    activeEntryId = null;
    sessionStartTime = null;
    mainWindow?.webContents.send('tracker:tick', getCurrentStatus());
    return duration;
}
function getCurrentStatus() {
    return {
        isTracking,
        activeEntryId,
        activeTaskId,
        activeProjectId,
        startTime: sessionStartTime ? new Date(sessionStartTime).toISOString() : null,
        elapsedSeconds: sessionDurationSeconds,
        todaySeconds: todayTotalSeconds,
        currentProductivityScore: activityMonitor ? activityMonitor.getCurrentProductivityScore() : 88,
        isIdlePaused,
        isOnline: true,
        queuedSyncItems: syncEngine ? syncEngine.getPendingCount() : 0,
    };
}
electron_1.app.on('before-quit', () => {
    isQuitting = true;
    stopTrackingSession();
});
