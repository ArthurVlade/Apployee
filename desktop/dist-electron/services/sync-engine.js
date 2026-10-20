"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncEngineService = void 0;
const electron_1 = require("electron");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const supabase_js_1 = require("@supabase/supabase-js");
class SyncEngineService {
    queueFilePath;
    offlineStorageDir;
    queue = [];
    isSyncing = false;
    syncTimer = null;
    supabase = null;
    constructor() {
        const userDataPath = electron_1.app.getPath('userData');
        this.offlineStorageDir = path_1.default.join(userDataPath, 'offline_cache');
        this.queueFilePath = path_1.default.join(this.offlineStorageDir, 'sync_queue.json');
        this.ensureStorageDirectories();
        this.loadQueueFromDisk();
        this.initializeSupabase();
        // Auto-retry sync worker runs every 15 seconds
        this.syncTimer = setInterval(() => {
            this.attemptSync();
        }, 15 * 1000);
    }
    ensureStorageDirectories() {
        if (!fs_1.default.existsSync(this.offlineStorageDir)) {
            fs_1.default.mkdirSync(this.offlineStorageDir, { recursive: true });
        }
    }
    initializeSupabase() {
        const supabaseUrl = process.env.SUPABASE_URL || 'https://sample.supabase.co';
        const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sample-key';
        this.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    }
    loadQueueFromDisk() {
        try {
            if (fs_1.default.existsSync(this.queueFilePath)) {
                const raw = fs_1.default.readFileSync(this.queueFilePath, 'utf-8');
                this.queue = JSON.parse(raw);
            }
        }
        catch (err) {
            console.error('Failed to load sync queue from disk:', err);
            this.queue = [];
        }
    }
    saveQueueToDisk() {
        try {
            fs_1.default.writeFileSync(this.queueFilePath, JSON.stringify(this.queue, null, 2), 'utf-8');
        }
        catch (err) {
            console.error('Failed to save sync queue to disk:', err);
        }
    }
    /**
     * Enqueues a screenshot capture (persisting image buffer safely to disk).
     */
    async enqueueScreenshot(screenshot) {
        const fileName = `screenshot_${screenshot.id}.jpg`;
        const localFilePath = path_1.default.join(this.offlineStorageDir, fileName);
        // Save image buffer to local disk
        fs_1.default.writeFileSync(localFilePath, screenshot.imageBuffer);
        this.queue.push({
            id: screenshot.id,
            type: 'SCREENSHOT',
            payload: {
                id: screenshot.id,
                timeEntryId: screenshot.timeEntryId,
                capturedAt: screenshot.capturedAt,
                monitorIndex: screenshot.monitorIndex,
                resolution: screenshot.resolution,
                activityScore: screenshot.activityScore,
                fileName,
            },
            filePath: localFilePath,
            createdAt: new Date().toISOString(),
            retryCount: 0,
        });
        this.saveQueueToDisk();
        this.attemptSync();
    }
    /**
     * Enqueues an activity log block.
     */
    enqueueActivityBlock(blockPayload) {
        this.queue.push({
            id: crypto.randomUUID(),
            type: 'ACTIVITY_LOG',
            payload: blockPayload,
            createdAt: new Date().toISOString(),
            retryCount: 0,
        });
        this.saveQueueToDisk();
        this.attemptSync();
    }
    /**
     * Enqueues app/URL usage logs.
     */
    enqueueAppLogs(appLogsPayload) {
        this.queue.push({
            id: crypto.randomUUID(),
            type: 'APP_USAGE_LOG',
            payload: appLogsPayload,
            createdAt: new Date().toISOString(),
            retryCount: 0,
        });
        this.saveQueueToDisk();
        this.attemptSync();
    }
    /**
     * Processes the sync queue when network is available.
     */
    async attemptSync() {
        if (this.isSyncing || this.queue.length === 0)
            return;
        // Verify system network connectivity
        if (!electron_1.net.isOnline()) {
            return;
        }
        this.isSyncing = true;
        try {
            const remainingQueue = [];
            for (const item of this.queue) {
                let syncedSuccessfully = false;
                try {
                    if (item.type === 'SCREENSHOT' && item.filePath && this.supabase) {
                        if (fs_1.default.existsSync(item.filePath)) {
                            const fileBuffer = fs_1.default.readFileSync(item.filePath);
                            const storageKey = `screenshots/${item.payload.timeEntryId}/${item.payload.fileName}`;
                            // 1. Upload to Supabase Storage private bucket
                            const { error: uploadError } = await this.supabase.storage
                                .from('screenshots')
                                .upload(storageKey, fileBuffer, {
                                contentType: 'image/jpeg',
                                upsert: true,
                            });
                            if (!uploadError) {
                                // 2. Insert record in screenshots table
                                const { error: dbError } = await this.supabase.from('screenshots').insert({
                                    id: item.payload.id,
                                    time_entry_id: item.payload.timeEntryId,
                                    storage_key: storageKey,
                                    public_url: storageKey,
                                    captured_at: item.payload.capturedAt,
                                    monitor_index: item.payload.monitorIndex,
                                    resolution: item.payload.resolution,
                                    activity_score_at_capture: item.payload.activityScore,
                                });
                                if (!dbError) {
                                    // Delete local staged image file
                                    fs_1.default.unlinkSync(item.filePath);
                                    syncedSuccessfully = true;
                                }
                            }
                        }
                    }
                    else if (item.type === 'ACTIVITY_LOG' && this.supabase) {
                        const { error } = await this.supabase.from('activity_logs').insert(item.payload);
                        if (!error)
                            syncedSuccessfully = true;
                    }
                    else if (item.type === 'APP_USAGE_LOG' && this.supabase) {
                        const { error } = await this.supabase.from('app_url_logs').insert(item.payload);
                        if (!error)
                            syncedSuccessfully = true;
                    }
                }
                catch (itemErr) {
                    console.error('Error syncing individual queue item:', itemErr);
                }
                if (!syncedSuccessfully) {
                    item.retryCount++;
                    remainingQueue.push(item);
                }
            }
            this.queue = remainingQueue;
            this.saveQueueToDisk();
        }
        finally {
            this.isSyncing = false;
        }
    }
    getPendingCount() {
        return this.queue.length;
    }
    destroy() {
        if (this.syncTimer) {
            clearInterval(this.syncTimer);
            this.syncTimer = null;
        }
    }
}
exports.SyncEngineService = SyncEngineService;
