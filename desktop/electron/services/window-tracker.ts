export interface AppUsageRecord {
  processName: string;
  windowTitle: string;
  urlOrDomain?: string;
  durationSeconds: number;
}

export class WindowTrackerService {
  private isTracking: boolean = false;
  private pollInterval: NodeJS.Timeout | null = null;
  private activeWinModule: any = null;
  private currentAggregatedUsage: Map<string, AppUsageRecord> = new Map();
  private lastPollTimestamp: number = Date.now();
  private lastCapturedProcess: string = 'Unknown';
  private lastCapturedTitle: string = 'Active Desktop';

  constructor() {
    this.initializeActiveWin();
  }

  private async initializeActiveWin(): Promise<void> {
    try {
      // Dynamic import to handle active-win ESM module
      const activeWin = await import('active-win');
      this.activeWinModule = activeWin.default || activeWin;
    } catch (err) {
      console.warn('active-win not available. Using fallback process detection.');
    }
  }

  public start(pollIntervalSeconds: number = 15): void {
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

  private async pollForegroundWindow(): Promise<void> {
    if (!this.isTracking) return;

    const now = Date.now();
    const elapsedSeconds = Math.max(1, Math.round((now - this.lastPollTimestamp) / 1000));
    this.lastPollTimestamp = now;

    let processName = 'Desktop Environment';
    let windowTitle = 'System Window';
    let urlOrDomain: string | undefined;

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
    } catch {
      // Fallback
    }

    this.lastCapturedProcess = processName;
    this.lastCapturedTitle = windowTitle;

    // Aggregate time in Map using processName + windowTitle as key
    const aggregateKey = `${processName}:::${windowTitle}`;
    const existing = this.currentAggregatedUsage.get(aggregateKey);

    if (existing) {
      existing.durationSeconds += elapsedSeconds;
    } else {
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
  public flushUsageRecords(): AppUsageRecord[] {
    const records = Array.from(this.currentAggregatedUsage.values());
    this.currentAggregatedUsage.clear();
    this.lastPollTimestamp = Date.now();
    return records;
  }

  public getCurrentActiveWindow(): { processName: string; windowTitle: string } {
    return {
      processName: this.lastCapturedProcess,
      windowTitle: this.lastCapturedTitle,
    };
  }

  public stop(): void {
    this.isTracking = false;
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}
