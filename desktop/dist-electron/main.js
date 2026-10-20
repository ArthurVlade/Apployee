"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// desktop/electron/main.ts
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
let mainWindow = null;
let tray = null;
let isQuitting = false;
// Tracking State
let isTracking = false;
let activeEntryId = null;
let activeProjectId = null;
let activeTaskId = null;
let sessionStartTime = null;
let sessionDurationSeconds = 0;
let todayTotalSeconds = 0;
let timerInterval = null;
let screenshotInterval = null;
// Idle Detection State
let isIdlePaused = false;
const IDLE_THRESHOLD_SECONDS = 300; // 5 minutes
// Ensure single instance
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
function initializeApplication() {
    createMainWindow();
    createSystemTray();
    registerIpcHandlers();
    // Monitor idle state every 5 seconds using pure powerMonitor API
    setInterval(checkSystemIdleState, 5000);
    electron_1.app.on('activate', () => {
        if (electron_1.BrowserWindow.getAllWindows().length === 0) {
            createMainWindow();
        }
    });
    electron_1.app.on('before-quit', () => {
        isQuitting = true;
    });
}
function createMainWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 380,
        height: 560,
        resizable: false,
        maximizable: false,
        fullscreenable: false,
        frame: false,
        backgroundColor: '#020617',
        show: false,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: true,
        },
    });
    const devUrl = process.env.VITE_DEV_SERVER_URL;
    if (devUrl) {
        mainWindow.loadURL(devUrl);
    }
    else {
        // Packaged production app loads from dist
        mainWindow.loadFile(path_1.default.join(__dirname, '../dist/index.html'));
    }
    mainWindow.once('ready-to-show', () => {
        mainWindow?.show();
    });
    mainWindow.on('close', (event) => {
        if (!isQuitting) {
            event.preventDefault();
            mainWindow?.hide();
        }
    });
}
function createSystemTray() {
    const icon = electron_1.nativeImage.createEmpty();
    tray = new electron_1.Tray(icon);
    tray.setToolTip('Apploye Native Time Tracker');
    const updateMenu = () => {
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
                label: isTracking ? 'Stop Tracking' : 'Start Tracking',
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
                label: 'Quit',
                click: () => {
                    isQuitting = true;
                    electron_1.app.quit();
                },
            },
        ]);
        tray?.setContextMenu(contextMenu);
    };
    updateMenu();
    tray.on('double-click', () => {
        mainWindow?.show();
        mainWindow?.focus();
    });
}
// Pure Electron PowerMonitor Idle Detection (Zero native C++ modules)
function checkSystemIdleState() {
    if (!isTracking)
        return;
    const idleSeconds = electron_1.powerMonitor.getSystemIdleTime();
    if (idleSeconds >= IDLE_THRESHOLD_SECONDS && !isIdlePaused) {
        isIdlePaused = true;
        mainWindow?.webContents.send('tracker:idle-detected', {
            idleMinutes: Math.floor(idleSeconds / 60),
            pausedTimestamp: new Date().toISOString(),
            autoDiscardAllowed: true,
        });
        broadcastTick();
    }
    else if (idleSeconds < 10 && isIdlePaused) {
        // User resumed activity
        isIdlePaused = false;
        broadcastTick();
    }
}
// Pure Electron DesktopCapturer Screen Recording (Zero native C++ modules)
async function captureRandomizedScreenshot() {
    if (!isTracking || !activeEntryId)
        return;
    try {
        const displays = electron_1.screen.getAllDisplays();
        const primaryDisplay = displays[0] || { size: { width: 1920, height: 1080 } };
        const sources = await electron_1.desktopCapturer.getSources({
            types: ['screen'],
            thumbnailSize: {
                width: primaryDisplay.size.width,
                height: primaryDisplay.size.height,
            },
        });
        if (sources.length > 0) {
            const primarySource = sources[0];
            const thumbnailBuffer = primarySource.thumbnail.toJPEG(75);
            // Dispatch screenshot payload to renderer for preview & Supabase sync
            mainWindow?.webContents.send('tracker:screenshot-captured', {
                id: `shot_${Date.now()}`,
                timeEntryId: activeEntryId,
                timestamp: new Date().toISOString(),
                resolution: `${primaryDisplay.size.width}x${primaryDisplay.size.height}`,
                dataUrl: `data:image/jpeg;base64,${thumbnailBuffer.toString('base64')}`,
                activityScore: calculateActivityScore(),
            });
        }
    }
    catch (err) {
        console.error('Failed to capture desktop screenshot:', err);
    }
}
function calculateActivityScore() {
    const idleSec = electron_1.powerMonitor.getSystemIdleTime();
    if (idleSec < 15)
        return 94;
    if (idleSec < 60)
        return 82;
    if (idleSec < 180)
        return 65;
    return 40;
}
function startTrackingSession(projectId, taskId) {
    isTracking = true;
    activeProjectId = projectId;
    activeTaskId = taskId || null;
    activeEntryId = `entry_${Date.now()}`;
    sessionStartTime = Date.now();
    sessionDurationSeconds = 0;
    isIdlePaused = false;
    // 1-second interval timer
    if (timerInterval)
        clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        if (!isIdlePaused) {
            sessionDurationSeconds++;
            todayTotalSeconds++;
            broadcastTick();
        }
    }, 1000);
    // Randomized screen capture (every ~3 minutes)
    if (screenshotInterval)
        clearInterval(screenshotInterval);
    screenshotInterval = setInterval(() => {
        captureRandomizedScreenshot();
    }, 180 * 1000);
    // Take an initial screenshot after 10 seconds of starting work
    setTimeout(() => {
        if (isTracking)
            captureRandomizedScreenshot();
    }, 10000);
    broadcastTick();
}
function stopTrackingSession() {
    if (timerInterval)
        clearInterval(timerInterval);
    if (screenshotInterval)
        clearInterval(screenshotInterval);
    const duration = sessionDurationSeconds;
    isTracking = false;
    activeEntryId = null;
    isIdlePaused = false;
    broadcastTick();
    return { success: true, durationSeconds: duration };
}
function broadcastTick() {
    mainWindow?.webContents.send('tracker:tick', {
        isTracking,
        activeEntryId,
        activeTaskId,
        activeProjectId,
        startTime: sessionStartTime ? new Date(sessionStartTime).toISOString() : null,
        elapsedSeconds: sessionDurationSeconds,
        todaySeconds: todayTotalSeconds,
        currentProductivityScore: calculateActivityScore(),
        isIdlePaused,
        isOnline: true,
        queuedSyncItems: 0,
    });
}
function registerIpcHandlers() {
    electron_1.ipcMain.handle('tracker:start', async (_, payload) => {
        startTrackingSession(payload.projectId, payload.taskId);
        return { success: true, entryId: activeEntryId };
    });
    electron_1.ipcMain.handle('tracker:stop', async () => {
        return stopTrackingSession();
    });
    electron_1.ipcMain.handle('tracker:get-status', () => ({
        isTracking,
        activeEntryId,
        activeTaskId,
        activeProjectId,
        startTime: sessionStartTime ? new Date(sessionStartTime).toISOString() : null,
        elapsedSeconds: sessionDurationSeconds,
        todaySeconds: todayTotalSeconds,
        currentProductivityScore: calculateActivityScore(),
        isIdlePaused,
        isOnline: true,
        queuedSyncItems: 0,
    }));
    electron_1.ipcMain.handle('tracker:idle-decision', async (_, decision) => {
        if (decision === 'DISCARD') {
            const idleSec = electron_1.powerMonitor.getSystemIdleTime();
            sessionDurationSeconds = Math.max(0, sessionDurationSeconds - idleSec);
        }
        isIdlePaused = false;
        broadcastTick();
        return { success: true };
    });
    electron_1.ipcMain.handle('tracker:get-tasks', async () => [
        { id: 'task_1', projectId: 'proj_main', projectName: 'Core SaaS App', taskTitle: 'Database RLS and Migrations', billingRate: 55 },
        { id: 'task_2', projectId: 'proj_main', projectName: 'Core SaaS App', taskTitle: 'Desktop Tracker Packaging', billingRate: 55 },
        { id: 'task_3', projectId: 'proj_client', projectName: 'Client Portal', taskTitle: 'Invoicing & Stripe Integration', billingRate: 65 },
    ]);
    electron_1.ipcMain.on('window:minimize-to-tray', () => {
        mainWindow?.hide();
    });
    electron_1.ipcMain.on('app:quit', () => {
        isQuitting = true;
        electron_1.app.quit();
    });
}
