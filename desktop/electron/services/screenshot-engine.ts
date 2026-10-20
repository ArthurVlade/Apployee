import { desktopCapturer, screen } from 'electron';
import crypto from 'crypto';

export interface ScreenshotCaptureResult {
  id: string;
  timeEntryId: string;
  capturedAt: string;
  monitorIndex: number;
  resolution: string;
  imageBuffer: Buffer;
  mimeType: 'image/jpeg';
  fileSizeBytes: number;
  activityScoreAtCapture: number;
}

export class ScreenshotScheduler {
  private frequencyPer10Min: number;
  private currentBlockTimers: NodeJS.Timeout[] = [];
  private blockIntervalTimer: NodeJS.Timeout | null = null;
  private activeTimeEntryId: string | null = null;
  private onCaptureCallback: ((screenshot: ScreenshotCaptureResult) => Promise<void>) | null = null;
  private getActivityScoreCallback: (() => number) | null = null;

  constructor(frequency: number = 3) {
    // Constrain frequency between 1 and 10 screenshots per 10 minutes
    this.frequencyPer10Min = Math.min(Math.max(frequency, 1), 10);
  }

  public setFrequency(frequency: number): void {
    this.frequencyPer10Min = Math.min(Math.max(frequency, 1), 10);
  }

  /**
   * Starts the randomized scheduling engine for the active time entry.
   */
  public start(
    timeEntryId: string,
    onCapture: (screenshot: ScreenshotCaptureResult) => Promise<void>,
    getActivityScore: () => number
  ): void {
    this.stop();
    this.activeTimeEntryId = timeEntryId;
    this.onCaptureCallback = onCapture;
    this.getActivityScoreCallback = getActivityScore;

    // Immediately schedule the first 10-minute (600s) randomized block
    this.schedule10MinuteBlock();

    // Repeat schedule every 600 seconds (10 minutes)
    this.blockIntervalTimer = setInterval(() => {
      this.schedule10MinuteBlock();
    }, 600 * 1000);
  }

  /**
   * Mathematical randomizer:
   * Divides the 600-second block into N equal windows of (600 / N) seconds.
   * Schedules a capture at a pseudo-random second within each window.
   */
  private schedule10MinuteBlock(): void {
    this.clearPendingBlockTimers();

    const totalSeconds = 600;
    const windowSizeSeconds = totalSeconds / this.frequencyPer10Min;

    for (let i = 0; i < this.frequencyPer10Min; i++) {
      const windowStartSeconds = i * windowSizeSeconds;
      
      // Pick a random offset within [2, windowSizeSeconds - 2] to avoid boundary overlaps
      const randomOffset = 2 + Math.floor(Math.random() * Math.max(windowSizeSeconds - 4, 1));
      const scheduledExecutionSecond = windowStartSeconds + randomOffset;
      const scheduledExecutionMs = scheduledExecutionSecond * 1000;

      const timer = setTimeout(async () => {
        if (this.activeTimeEntryId) {
          await this.captureAllDisplays();
        }
      }, scheduledExecutionMs);

      this.currentBlockTimers.push(timer);
    }
  }

  /**
   * Captures high-definition frames across all connected monitors.
   */
  public async captureAllDisplays(): Promise<void> {
    if (!this.activeTimeEntryId || !this.onCaptureCallback) return;

    try {
      const displays = screen.getAllDisplays();
      
      // Request desktop sources with max screen resolution
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: 1920,
          height: 1080,
        },
      });

      const currentScore = this.getActivityScoreCallback
        ? this.getActivityScoreCallback()
        : 85;

      for (let index = 0; index < sources.length; index++) {
        const source = sources[index];
        const display = displays[index] || displays[0];

        // Compress frame to JPEG buffer at 80% quality to optimize network and storage bandwidth
        const compressedJpegBuffer = source.thumbnail.toJPEG(80);

        const captureResult: ScreenshotCaptureResult = {
          id: crypto.randomUUID(),
          timeEntryId: this.activeTimeEntryId,
          capturedAt: new Date().toISOString(),
          monitorIndex: index + 1,
          resolution: `${display.size.width}x${display.size.height}`,
          imageBuffer: compressedJpegBuffer,
          mimeType: 'image/jpeg',
          fileSizeBytes: compressedJpegBuffer.length,
          activityScoreAtCapture: currentScore,
        };

        await this.onCaptureCallback(captureResult);
      }
    } catch (err) {
      console.error('Failed to capture desktop displays:', err);
    }
  }

  private clearPendingBlockTimers(): void {
    this.currentBlockTimers.forEach((t) => clearTimeout(t));
    this.currentBlockTimers = [];
  }

  public stop(): void {
    this.clearPendingBlockTimers();
    if (this.blockIntervalTimer) {
      clearInterval(this.blockIntervalTimer);
      this.blockIntervalTimer = null;
    }
    this.activeTimeEntryId = null;
    this.onCaptureCallback = null;
    this.getActivityScoreCallback = null;
  }
}
