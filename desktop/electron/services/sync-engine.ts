import { app, net } from 'electron';
import fs from 'fs';
import path from 'path';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface QueuedSyncItem {
  id: string;
  type: 'SCREENSHOT' | 'ACTIVITY_LOG' | 'APP_USAGE_LOG' | 'TIME_ENTRY_SLICE';
  payload: any;
  filePath?: string; // Path to saved offline image file on disk
  createdAt: string;
  retryCount: number;
}

export class SyncEngineService {
  private queueFilePath: string;
  private offlineStorageDir: string;
  private queue: QueuedSyncItem[] = [];
  private isSyncing: boolean = false;
  private syncTimer: NodeJS.Timeout | null = null;
  private supabase: SupabaseClient | null = null;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.offlineStorageDir = path.join(userDataPath, 'offline_cache');
    this.queueFilePath = path.join(this.offlineStorageDir, 'sync_queue.json');

    this.ensureStorageDirectories();
    this.loadQueueFromDisk();
    this.initializeSupabase();

    // Auto-retry sync worker runs every 15 seconds
    this.syncTimer = setInterval(() => {
      this.attemptSync();
    }, 15 * 1000);
  }

  private ensureStorageDirectories(): void {
    if (!fs.existsSync(this.offlineStorageDir)) {
      fs.mkdirSync(this.offlineStorageDir, { recursive: true });
    }
  }

  private initializeSupabase(): void {
    const supabaseUrl = process.env.SUPABASE_URL || 'https://sample.supabase.co';
    const supabaseKey = process.env.SUPABASE_ANON_KEY || 'sample-key';
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  private loadQueueFromDisk(): void {
    try {
      if (fs.existsSync(this.queueFilePath)) {
        const raw = fs.readFileSync(this.queueFilePath, 'utf-8');
        this.queue = JSON.parse(raw);
      }
    } catch (err) {
      console.error('Failed to load sync queue from disk:', err);
      this.queue = [];
    }
  }

  private saveQueueToDisk(): void {
    try {
      fs.writeFileSync(this.queueFilePath, JSON.stringify(this.queue, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to save sync queue to disk:', err);
    }
  }

  /**
   * Enqueues a screenshot capture (persisting image buffer safely to disk).
   */
  public async enqueueScreenshot(screenshot: {
    id: string;
    timeEntryId: string;
    imageBuffer: Buffer;
    capturedAt: string;
    monitorIndex: number;
    resolution: string;
    activityScore: number;
  }): Promise<void> {
    const fileName = `screenshot_${screenshot.id}.jpg`;
    const localFilePath = path.join(this.offlineStorageDir, fileName);

    // Save image buffer to local disk
    fs.writeFileSync(localFilePath, screenshot.imageBuffer);

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
  public enqueueActivityBlock(blockPayload: any): void {
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
  public enqueueAppLogs(appLogsPayload: any): void {
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
  public async attemptSync(): Promise<void> {
    if (this.isSyncing || this.queue.length === 0) return;

    // Verify system network connectivity
    if (!net.isOnline()) {
      return;
    }

    this.isSyncing = true;

    try {
      const remainingQueue: QueuedSyncItem[] = [];

      for (const item of this.queue) {
        let syncedSuccessfully = false;

        try {
          if (item.type === 'SCREENSHOT' && item.filePath && this.supabase) {
            if (fs.existsSync(item.filePath)) {
              const fileBuffer = fs.readFileSync(item.filePath);
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
                  fs.unlinkSync(item.filePath);
                  syncedSuccessfully = true;
                }
              }
            }
          } else if (item.type === 'ACTIVITY_LOG' && this.supabase) {
            const { error } = await this.supabase.from('activity_logs').insert(item.payload);
            if (!error) syncedSuccessfully = true;
          } else if (item.type === 'APP_USAGE_LOG' && this.supabase) {
            const { error } = await this.supabase.from('app_url_logs').insert(item.payload);
            if (!error) syncedSuccessfully = true;
          }
        } catch (itemErr) {
          console.error('Error syncing individual queue item:', itemErr);
        }

        if (!syncedSuccessfully) {
          item.retryCount++;
          remainingQueue.push(item);
        }
      }

      this.queue = remainingQueue;
      this.saveQueueToDisk();
    } finally {
      this.isSyncing = false;
    }
  }

  public getPendingCount(): number {
    return this.queue.length;
  }

  public destroy(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}
