'use client';

import React, { useState } from 'react';
import {
  Camera,
  Clock,
  Keyboard,
  MousePointer,
  AlertTriangle,
  Monitor,
  Maximize2,
  X,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export interface ScreenshotCardData {
  id: string;
  signedUrl: string;
  capturedAtTime: string;
  capturedDate: string;
  memberName: string;
  memberAvatar?: string | null;
  projectName?: string | null;
  taskTitle?: string | null;
  appName?: string | null;
  windowTitle?: string | null;
  monitorIndex: number;
  productivityScore: number; // 0-100%
  keystrokesCount: number;
  mouseClicksCount: number;
  isFlaggedJiggler: boolean;
  resolution?: string | null;
}

interface ScreenshotGalleryProps {
  screenshots: ScreenshotCardData[];
}

export function ScreenshotGallery({ screenshots }: ScreenshotGalleryProps) {
  const [selectedScreenshot, setSelectedScreenshot] = useState<ScreenshotCardData | null>(null);

  if (screenshots.length === 0) {
    return (
      <div className="p-12 rounded-2xl bg-slate-900 border border-slate-800 text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 mx-auto">
          <Camera className="w-6 h-6" />
        </div>
        <h3 className="text-base font-semibold text-white">No Proof of Work Screenshots Found</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          No automated screenshots were captured for the selected member and date range. Ensure the desktop tracker is actively running.
        </p>
      </div>
    );
  }

  const getProductivityColor = (score: number) => {
    if (score >= 70) return 'bg-emerald-500';
    if (score >= 40) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getProductivityTextColor = (score: number) => {
    if (score >= 70) return 'text-emerald-400';
    if (score >= 40) return 'text-amber-400';
    return 'text-rose-400';
  };

  return (
    <>
      {/* Responsive Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {screenshots.map((s) => (
          <div
            key={s.id}
            onClick={() => setSelectedScreenshot(s)}
            className="group rounded-2xl bg-slate-900 border border-slate-800 hover:border-indigo-500/50 shadow-md hover:shadow-xl hover:shadow-indigo-950/30 transition-all duration-300 flex flex-col overflow-hidden cursor-pointer relative"
          >
            {/* Screenshot Image Container */}
            <div className="aspect-video w-full bg-slate-950 relative overflow-hidden">
              <img
                src={s.signedUrl}
                alt={s.windowTitle || 'Proof of work screenshot'}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />

              {/* Timestamp Badge */}
              <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 z-10">
                <span className="px-2 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-[11px] font-mono text-white border border-slate-700/80 shadow-sm flex items-center gap-1">
                  <Clock className="w-3 h-3 text-indigo-400" />
                  <span>{s.capturedAtTime}</span>
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-slate-950/80 backdrop-blur-md text-[10px] font-mono text-cyan-300 border border-slate-700/80">
                  Disp {s.monitorIndex}
                </span>
              </div>

              {/* Flagged Jiggler Badge */}
              {s.isFlaggedJiggler && (
                <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded-md bg-rose-600/90 text-white text-[10px] font-bold flex items-center gap-1 shadow-md z-10 animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Suspicious</span>
                </div>
              )}

              {/* Hover Overlay with Biometrics */}
              <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-center items-center p-4 space-y-3 text-center">
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <Keyboard className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono font-semibold">{s.keystrokesCount}</span>
                    <span className="text-[10px] text-slate-400">keys</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-slate-200">
                    <MousePointer className="w-4 h-4 text-indigo-400" />
                    <span className="font-mono font-semibold">{s.mouseClicksCount}</span>
                    <span className="text-[10px] text-slate-400">clicks</span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-300 line-clamp-2 max-w-xs px-2">
                  <span className="font-semibold text-white">{s.appName || 'Active Window'}:</span>{' '}
                  <span className="text-slate-400">{s.windowTitle || 'No title recorded'}</span>
                </div>

                <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-400">
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>Click to expand full audit</span>
                </div>
              </div>
            </div>

            {/* Bottom Info Bar */}
            <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-white truncate max-w-[140px]">
                    {s.memberName}
                  </span>
                  <span className={`font-mono font-bold text-xs ${getProductivityTextColor(s.productivityScore)}`}>
                    {s.productivityScore}%
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate mt-0.5">
                  {s.projectName || 'General Work'} {s.taskTitle ? `• ${s.taskTitle}` : ''}
                </p>
              </div>

              {/* Colored 10-Minute Productivity Progress Bar */}
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800 mt-1">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${getProductivityColor(s.productivityScore)}`}
                  style={{ width: `${Math.max(s.productivityScore, 4)}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Full Resolution Modal Audit Viewer */}
      {selectedScreenshot && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-4xl w-full bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh] animate-scaleUp">
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">
                    {selectedScreenshot.memberName} — {selectedScreenshot.capturedDate} at {selectedScreenshot.capturedAtTime}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Display {selectedScreenshot.monitorIndex} • {selectedScreenshot.resolution || 'Native Display'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Image Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4">
              <div className="rounded-xl overflow-hidden border border-slate-800 bg-black flex items-center justify-center">
                <img
                  src={selectedScreenshot.signedUrl}
                  alt={selectedScreenshot.windowTitle || 'Proof of work screenshot'}
                  className="w-full max-h-[500px] object-contain"
                />
              </div>

              {/* Detailed Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">10-Min Productivity</span>
                  <span className={`text-base font-extrabold font-mono mt-0.5 block ${getProductivityTextColor(selectedScreenshot.productivityScore)}`}>
                    {selectedScreenshot.productivityScore}% Score
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Keyboard Activity</span>
                  <span className="text-base font-bold text-white font-mono mt-0.5 block">
                    {selectedScreenshot.keystrokesCount} strokes
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Mouse Clicks</span>
                  <span className="text-base font-bold text-white font-mono mt-0.5 block">
                    {selectedScreenshot.mouseClicksCount} clicks
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Jiggler Anomaly</span>
                  <span className={`text-base font-bold mt-0.5 block ${selectedScreenshot.isFlaggedJiggler ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selectedScreenshot.isFlaggedJiggler ? 'FLAGGED ANOMALY' : 'Clean (Normal)'}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">Active Process:</span>
                  <span className="font-mono text-indigo-300 font-medium">{selectedScreenshot.appName || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-semibold">Window Header:</span>
                  <span className="text-slate-200">{selectedScreenshot.windowTitle || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between">
              <a
                href={selectedScreenshot.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open Raw Image in New Tab</span>
              </a>
              <button
                onClick={() => setSelectedScreenshot(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold"
              >
                Close Audit View
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
