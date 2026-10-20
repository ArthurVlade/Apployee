"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.WindowTrackerService = void 0;
class WindowTrackerService {
    isTracking = false;
    pollInterval = null;
    activeWinModule = null;
    currentAggregatedUsage = new Map();
    lastPollTimestamp = Date.now();
    lastCapturedProcess = 'Unknown';
    lastCapturedTitle = 'Active Desktop';
    constructor() {
        this.initializeActiveWin();
    }
    async initializeActiveWin() {
        try {
            // Dynamic import to handle active-win ESM module
            const activeWin = await Promise.resolve().then(() => __importStar(require('active-win')));
            this.activeWinModule = activeWin.default || activeWin;
        }
        catch (err) {
            console.warn('active-win not available. Using fallback process detection.');
        }
    }
    start(pollIntervalSeconds = 15) {
        this.stop();
        this.isTracking = true;
        this.currentAggregatedUsage.clear();
        this.lastPollTimestamp = Date.now();
        this.pollInterval = setInterval(async () => {
            await this.pollForegroundWindow();
        }, pollIntervalSeconds * 1000);
        // Initial poll
        this.pollForegroundWindow();
    }
    async pollForegroundWindow() {
        if (!this.isTracking)
            return;
        const now = Date.now();
        const elapsedSeconds = Math.max(1, Math.round((now - this.lastPollTimestamp) / 1000));
        this.lastPollTimestamp = now;
        let processName = 'Desktop Environment';
        let windowTitle = 'System Window';
        let urlOrDomain;
        try {
            if (this.activeWinModule) {
                const windowInfo = await this.activeWinModule();
                if (windowInfo) {
                    processName = windowInfo.owner?.name || windowInfo.owner?.processId?.toString() || 'Application';
                    windowTitle = windowInfo.title || 'Untitled';
                    if (windowInfo.url) {
                        urlOrDomain = windowInfo.url;
                    }
                }
            }
        }
        catch {
            // Fallback
        }
        this.lastCapturedProcess = processName;
        this.lastCapturedTitle = windowTitle;
        // Aggregate time in Map using processName + windowTitle as key
        const aggregateKey = `${processName}:::${windowTitle}`;
        const existing = this.currentAggregatedUsage.get(aggregateKey);
        if (existing) {
            existing.durationSeconds += elapsedSeconds;
        }
        else {
            this.currentAggregatedUsage.set(aggregateKey, {
                processName,
                windowTitle,
                urlOrDomain,
                durationSeconds: elapsedSeconds,
            });
        }
    }
    /**
     * Flushes and returns the aggregated 10-minute process usage logs.
     */
    flushUsageRecords() {
        const records = Array.from(this.currentAggregatedUsage.values());
        this.currentAggregatedUsage.clear();
        this.lastPollTimestamp = Date.now();
        return records;
    }
    getCurrentActiveWindow() {
        return {
            processName: this.lastCapturedProcess,
            windowTitle: this.lastCapturedTitle,
        };
    }
    stop() {
        this.isTracking = false;
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }
}
exports.WindowTrackerService = WindowTrackerService;
