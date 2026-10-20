"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotScheduler = void 0;
const electron_1 = require("electron");
const crypto_1 = __importDefault(require("crypto"));
class ScreenshotScheduler {
    frequencyPer10Min;
    currentBlockTimers = [];
    blockIntervalTimer = null;
    activeTimeEntryId = null;
    onCaptureCallback = null;
    getActivityScoreCallback = null;
    constructor(frequency = 3) {
        // Constrain frequency between 1 and 10 screenshots per 10 minutes
        this.frequencyPer10Min = Math.min(Math.max(frequency, 1), 10);
    }
    setFrequency(frequency) {
        this.frequencyPer10Min = Math.min(Math.max(frequency, 1), 10);
    }
    /**
     * Starts the randomized scheduling engine for the active time entry.
     */
    start(timeEntryId, onCapture, getActivityScore) {
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
    schedule10MinuteBlock() {
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
    async captureAllDisplays() {
        if (!this.activeTimeEntryId || !this.onCaptureCallback)
            return;
        try {
            const displays = electron_1.screen.getAllDisplays();
            // Request desktop sources with max screen resolution
            const sources = await electron_1.desktopCapturer.getSources({
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
                const captureResult = {
                    id: crypto_1.default.randomUUID(),
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
        }
        catch (err) {
            console.error('Failed to capture desktop displays:', err);
        }
    }
    clearPendingBlockTimers() {
        this.currentBlockTimers.forEach((t) => clearTimeout(t));
        this.currentBlockTimers = [];
    }
    stop() {
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
exports.ScreenshotScheduler = ScreenshotScheduler;
