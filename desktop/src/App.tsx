// desktop/src/App.tsx
import React, { useState, useEffect } from 'react';
import {
  Clock,
  Play,
  Square,
  Minus,
  X,
  AlertTriangle,
  Folder,
  Wifi,
  CloudOff,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import type { TaskItem, TrackerStatus, IdlePayload } from './types/global';

export default function App() {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [status, setStatus] = useState<TrackerStatus>({
    isTracking: false,
    activeEntryId: null,
    activeTaskId: null,
    activeProjectId: null,
    startTime: null,
    elapsedSeconds: 0,
    todaySeconds: 0,
    currentProductivityScore: 85,
    isIdlePaused: false,
    isOnline: true,
    queuedSyncItems: 0,
  });

  const [idleModal, setIdleModal] = useState<IdlePayload | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize data and listeners with cleanup
  useEffect(() => {
    if (typeof window === 'undefined' || !window.api) return;

    // 1. Fetch available tasks
    window.api.getTasks().then((fetchedTasks) => {
      setTasks(fetchedTasks || []);
      if (fetchedTasks && fetchedTasks.length > 0) {
        setSelectedTaskId(fetchedTasks[0].id);
      }
    }).catch(console.error);

    // 2. Sync initial tracker status
    window.api.getStatus().then((initialStatus) => {
      if (initialStatus) {
        setStatus(initialStatus);
        if (initialStatus.activeTaskId) {
          setSelectedTaskId(initialStatus.activeTaskId);
        }
      }
    }).catch(console.error);

    // 3. Subscribe to 1-second ticks
    const unsubTick = window.api.onTrackerTick((newStatus) => {
      setStatus(newStatus);
    });

    // 4. Subscribe to idle detections
    const unsubIdle = window.api.onIdleDetected((payload) => {
      setIdleModal(payload);
    });

    // Cleanup listeners on unmount
    return () => {
      if (typeof unsubTick === 'function') unsubTick();
      if (typeof unsubIdle === 'function') unsubIdle();
    };
  }, []);

  // Timer formatter
  const formatTimer = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!window.api || isSubmitting) return;
    setIsSubmitting(true);
    try {
      const selectedTask = tasks.find((t) => t.id === selectedTaskId);
      const projectId = selectedTask?.projectId || 'proj_default';
      await window.api.startTracking(projectId, selectedTaskId || undefined);
    } catch (err) {
      console.error('Failed to start tracking:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStop = async () => {
    if (!window.api || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await window.api.stopTracking();
    } catch (err) {
      console.error('Failed to stop tracking:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIdleDecision = async (decision: 'KEEP' | 'DISCARD') => {
    if (!window.api) return;
    try {
      await window.api.handleIdleDecision(decision);
      setIdleModal(null);
    } catch (err) {
      console.error('Failed to resolve idle prompt:', err);
    }
  };

  // Productivity score styling
  const score = status.currentProductivityScore;
  const scoreBadgeColor =
    score > 70
      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
      : score > 40
      ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
      : 'bg-rose-500/10 text-rose-400 border-rose-500/30';

  return (
    <div className="h-screen w-full bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-hidden relative border border-slate-800">
      {/* 1. TOP BAR (Custom Draggable Header) */}
      <div
        className="h-9 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between px-3"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-xs font-semibold tracking-wide text-slate-200">Apploye Tracker</span>
          {status.isTracking && (
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
          )}
        </div>

        {/* Non-draggable control buttons */}
        <div
          className="flex items-center gap-1.5"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => window.api?.minimizeWindow()}
            className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Minimize to Tray"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => window.api?.quitApp()}
            className="p-1 rounded hover:bg-rose-900/40 text-slate-400 hover:text-rose-400 transition-colors"
            title="Quit Tracker"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. BODY CONTENT */}
      <div className="flex-1 p-4 flex flex-col justify-between">
        <div className="space-y-4">
          {/* Project & Task Dropdown */}
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Project & Task
            </label>
            <div className="relative">
              <select
                value={selectedTaskId}
                disabled={status.isTracking}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed appearance-none pr-8 cursor-pointer"
              >
                {tasks.length === 0 ? (
                  <option value="">No tasks assigned (General Work)</option>
                ) : (
                  tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.projectName} &bull; {task.taskTitle}
                    </option>
                  ))
                )}
              </select>
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </div>
          </div>

          {/* Digital Timer Display */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl py-6 px-4 text-center flex flex-col items-center justify-center">
            <span className="text-[11px] font-medium tracking-wider text-slate-400 uppercase mb-1">
              {status.isTracking ? 'Active Session' : 'Ready to Track'}
            </span>
            <div className="text-4xl font-mono font-bold tracking-tight text-white drop-shadow-sm">
              {formatTimer(status.elapsedSeconds)}
            </div>
          </div>
        </div>

        {/* 3. PRIMARY ACTION BUTTON */}
        <div className="space-y-3 pt-2">
          {!status.isTracking ? (
            <button
              onClick={handleStart}
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Start Tracking</span>
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={isSubmitting}
              className="w-full py-3 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>Stop & Save Work</span>
            </button>
          )}

          {/* 4. FOOTER METRICS */}
          <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-xs">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500">Today's Total</span>
              <span className="font-mono font-semibold text-slate-300">
                {formatTimer(status.todaySeconds)}
              </span>
            </div>

            <div className="flex flex-col items-end">
              <span className="text-[10px] text-slate-500 mb-0.5">Productivity</span>
              <span className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${scoreBadgeColor}`}>
                {status.currentProductivityScore}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 5. IDLE MODAL OVERLAY */}
      {idleModal && (
        <div className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-sm p-5 flex flex-col justify-center items-center text-center animate-in fade-in duration-200">
          <div className="h-10 w-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 border border-amber-500/30">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-bold text-white mb-1">Inactivity Detected</h3>
          <p className="text-xs text-slate-400 mb-5 max-w-[240px] leading-relaxed">
            You were away for {idleModal.idleMinutes} minutes. Do you want to keep this time or discard it?
          </p>

          <div className="w-full space-y-2">
            <button
              onClick={() => handleIdleDecision('KEEP')}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-colors"
            >
              Keep Time & Continue
            </button>
            <button
              onClick={() => handleIdleDecision('DISCARD')}
              className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 font-medium text-xs border border-slate-800 transition-colors"
            >
              Discard Idle Time
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
