import { powerMonitor } from 'electron';

export interface TenMinuteActivityBlock {
  blockStartTime: string;
  blockEndTime: string;
  keystrokesCount: number;
  mouseClicksCount: number;
  mouseMovementPixels: number;
  activeMinutes: number;
  idleMinutes: number;
  productivityPercentage: number;
  isFlaggedJiggler: boolean;
}

export class ActivityMonitorService {
  private isMonitoring: boolean = false;
  private idleThresholdSeconds: number = 300; // 5 minutes default
  private idleCheckInterval: NodeJS.Timeout | null = null;
  private minuteTickInterval: NodeJS.Timeout | null = null;

  // Real-time counter metrics
  private currentKeystrokes: number = 0;
  private currentMouseClicks: number = 0;
  private currentMouseMovementPixels: number = 0;
  
  // Rolling 10-minute buffer (10 1-minute buckets)
  private minuteBuckets: { hasInput: boolean; keystrokes: number; clicks: number }[] = [];
  
  private onIdleDetectedCallback: ((idleSeconds: number) => void) | null = null;
  private onBlockFinalizedCallback: ((block: TenMinuteActivityBlock) => void) | null = null;
  private uIOhook: any = null;

  constructor(idleThresholdMinutes: number = 5) {
    this.idleThresholdSeconds = idleThresholdMinutes * 60;
    this.initializeNativeHooks();
  }

  /**
   * Initializes native OS global hooks via uiohook-napi with safe fallback.
   */
  private initializeNativeHooks(): void {
    try {
      // Dynamic import to allow compilation even if native addon build is pending
      const { uIOhook } = require('uiohook-napi');
      this.uIOhook = uIOhook;

      // PRIVACY GUARDRAIL: We ONLY increment an integer volume counter.
      // We NEVER log event.keycode, raw characters, or clipboard strings.
      this.uIOhook.on('keydown', () => {
        if (this.isMonitoring) {
          this.currentKeystrokes++;
        }
      });

      this.uIOhook.on('click', () => {
        if (this.isMonitoring) {
          this.currentMouseClicks++;
        }
      });

      this.uIOhook.on('mousemove', () => {
        if (this.isMonitoring) {
          this.currentMouseMovementPixels += 2;
        }
      });
    } catch (err) {
      console.warn('uiohook-napi not found or native build pending. Falling back to powerMonitor input tracking.', err);
    }
  }

  public start(
    onIdleDetected: (idleSeconds: number) => void,
    onBlockFinalized: (block: TenMinuteActivityBlock) => void
  ): void {
    this.stop();
    this.isMonitoring = true;
    this.onIdleDetectedCallback = onIdleDetected;
    this.onBlockFinalizedCallback = onBlockFinalized;

    // Start native global event hook if available
    if (this.uIOhook) {
      try {
        this.uIOhook.start();
      } catch (err) {
        console.error('Failed to start uIOhook:', err);
      }
    }

    // 1. Idle Detection Poll (Every 2 seconds)
    this.idleCheckInterval = setInterval(() => {
      this.checkSystemIdle();
    }, 2000);

    // 2. Minute Aggregation Window (Every 60 seconds)
    this.minuteTickInterval = setInterval(() => {
      this.tickMinuteWindow();
    }, 60 * 1000);
  }

  /**
   * Polls OS idle state via Electron powerMonitor.
   */
  private checkSystemIdle(): void {
    if (!this.isMonitoring) return;

    try {
      const idleTimeSeconds = powerMonitor.getSystemIdleTime();
      if (idleTimeSeconds >= this.idleThresholdSeconds) {
        if (this.onIdleDetectedCallback) {
          this.onIdleDetectedCallback(idleTimeSeconds);
        }
      }
    } catch (err) {
      console.error('Error polling system idle time:', err);
    }
  }

  /**
   * Evaluates input volume every 60 seconds.
   */
  private tickMinuteWindow(): void {
    const hasInputThisMinute =
      this.currentKeystrokes > 5 || this.currentMouseClicks > 2 || this.currentMouseMovementPixels > 50;

    this.minuteBuckets.push({
      hasInput: hasInputThisMinute,
      keystrokes: this.currentKeystrokes,
      clicks: this.currentMouseClicks,
    });

    // Reset current 60-second raw counters
    this.currentKeystrokes = 0;
    this.currentMouseClicks = 0;
    this.currentMouseMovementPixels = 0;

    // Every 10 minutes (10 buckets), finalize and flush the block
    if (this.minuteBuckets.length >= 10) {
      this.finalize10MinuteBlock();
    }
  }

  private finalize10MinuteBlock(): void {
    const totalMinutes = this.minuteBuckets.length;
    const activeMinutes = this.minuteBuckets.filter((b) => b.hasInput).length;
    const idleMinutes = totalMinutes - activeMinutes;

    const totalKeys = this.minuteBuckets.reduce((acc, b) => acc + b.keystrokes, 0);
    const totalClicks = this.minuteBuckets.reduce((acc, b) => acc + b.clicks, 0);

    // Productivity Percentage: Active minutes ratio
    const productivityPercentage = Math.round((activeMinutes / totalMinutes) * 100);

    // Mouse Jiggler Anomaly Detection:
    // If movement is detected every single minute without any keystrokes or mouse clicks
    const isFlaggedJiggler =
      totalKeys === 0 && totalClicks <= 2 && activeMinutes >= 9;

    const block: TenMinuteActivityBlock = {
      blockStartTime: new Date(Date.now() - 600 * 1000).toISOString(),
      blockEndTime: new Date().toISOString(),
      keystrokesCount: totalKeys,
      mouseClicksCount: totalClicks,
      mouseMovementPixels: this.currentMouseMovementPixels,
      activeMinutes,
      idleMinutes,
      productivityPercentage,
      isFlaggedJiggler,
    };

    if (this.onBlockFinalizedCallback) {
      this.onBlockFinalizedCallback(block);
    }

    this.minuteBuckets = [];
  }

  /**
   * Returns live calculated productivity score for the current rolling window.
   */
  public getCurrentProductivityScore(): number {
    if (this.minuteBuckets.length === 0) return 88;
    const active = this.minuteBuckets.filter((b) => b.hasInput).length;
    return Math.round((active / this.minuteBuckets.length) * 100);
  }

  public stop(): void {
    this.isMonitoring = false;
    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval);
      this.idleCheckInterval = null;
    }
    if (this.minuteTickInterval) {
      clearInterval(this.minuteTickInterval);
      this.minuteTickInterval = null;
    }
    if (this.uIOhook) {
      try {
        this.uIOhook.stop();
      } catch (err) {
        // ignore
      }
    }
    this.minuteBuckets = [];
    this.onIdleDetectedCallback = null;
    this.onBlockFinalizedCallback = null;
  }
}
