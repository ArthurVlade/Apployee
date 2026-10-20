'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import {
  Clock,
  Activity,
  Zap,
  Monitor,
  AlertTriangle,
  Folder,
  CheckCircle2,
  Lock,
  Wifi,
  Sparkles
} from 'lucide-react';

export interface LiveFeedMember {
  memberId: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: 'ORG_OWNER' | 'MANAGER' | 'MEMBER';
  isOnline: boolean;
  currentTaskTitle?: string | null;
  currentProjectName?: string | null;
  currentEntryId?: string | null;
  secondsTrackedToday: number;
  lastProductivityScore: number;
  stealthMode: boolean;
  lastActiveTime?: string | null;
}

interface RealtimeBoardProps {
  initialMembers: LiveFeedMember[];
  organizationId: string;
}

export function RealtimeBoard({ initialMembers, organizationId }: RealtimeBoardProps) {
  const [members, setMembers] = useState<LiveFeedMember[]>(initialMembers);
  const [lastEventTime, setLastEventTime] = useState<string>('Connected');

  // Keep members in sync if initialMembers changes from SSR
  useEffect(() => {
    setMembers(initialMembers);
  }, [initialMembers]);

  // Real-time Supabase WebSocket engine
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`org-live-feed-${organizationId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
        },
        (payload: any) => {
          setLastEventTime(new Date().toLocaleTimeString());

          if (payload.eventType === 'INSERT') {
            const newEntry = payload.new;
            // Member clocked in
            setMembers((prev) =>
              prev.map((m) =>
                m.memberId === newEntry.member_id
                  ? {
                      ...m,
                      isOnline: !newEntry.end_time,
                      currentEntryId: newEntry.id,
                      currentTaskTitle: newEntry.note || 'Active Session',
                    }
                  : m
              )
            );
          } else if (payload.eventType === 'UPDATE') {
            const updatedEntry = payload.new;
            setMembers((prev) =>
              prev.map((m) => {
                if (m.memberId === updatedEntry.member_id) {
                  const isStillOnline = !updatedEntry.end_time;
                  return {
                    ...m,
                    isOnline: isStillOnline,
                    currentEntryId: isStillOnline ? updatedEntry.id : null,
                    secondsTrackedToday:
                      m.secondsTrackedToday + (updatedEntry.duration_seconds || 0),
                  };
                }
                return m;
              })
            );
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activity_logs',
        },
        (payload: any) => {
          setLastEventTime(new Date().toLocaleTimeString());
          const log = payload.new;

          // Update member productivity % from the latest 10-min block
          setMembers((prev) =>
            prev.map((m) =>
              m.memberId === log.member_id
                ? {
                    ...m,
                    lastProductivityScore: Math.round(Number(log.productivity_percentage || 0)),
                  }
                : m
            )
          );
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setLastEventTime(`Realtime Active (${new Date().toLocaleTimeString()})`);
        }
      });

    // Clean up channel listener on unmount to prevent leaks
    return () => {
      supabase.removeChannel(channel);
    };
  }, [organizationId]);

  const formatHours = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  const activeCount = members.filter((m) => m.isOnline).length;
  const avgProductivity =
    members.length > 0
      ? Math.round(
          members.reduce((acc, m) => acc + m.lastProductivityScore, 0) / members.length
        )
      : 0;

  return (
    <div className="space-y-6">
      {/* Real-time Status Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <Wifi className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>Live Attendance & Activity Feed</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </h2>
            <p className="text-xs text-slate-400">
              {activeCount} of {members.length} team members currently clocked in
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center gap-2">
            <span className="text-slate-500">Avg Productivity:</span>
            <span className="font-bold text-indigo-400 font-mono">{avgProductivity}%</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 font-mono text-[11px]">
            {lastEventTime}
          </div>
        </div>
      </div>

      {/* Employee Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {members.map((member) => (
          <div
            key={member.memberId}
            className={`rounded-2xl p-5 border transition-all duration-300 relative overflow-hidden ${
              member.isOnline
                ? 'bg-slate-900/90 border-slate-700/80 shadow-lg shadow-indigo-950/20 hover:border-indigo-500/50'
                : 'bg-slate-950/60 border-slate-800/80 opacity-80 hover:opacity-100'
            }`}
          >
            {/* Online/Offline Status Indicator Pill */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    member.isOnline
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse'
                      : 'bg-slate-500'
                  }`}
                />
                <span
                  className={`text-xs font-semibold uppercase tracking-wider ${
                    member.isOnline ? 'text-emerald-400 font-mono' : 'text-slate-400 font-mono'
                  }`}
                >
                  {member.isOnline ? 'Clocked In' : 'Offline'}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {member.stealthMode && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Stealth
                  </span>
                )}
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 font-mono font-medium">
                  {member.role}
                </span>
              </div>
            </div>

            {/* Employee Bio */}
            <div className="flex items-center gap-3.5 mb-4">
              {member.avatarUrl ? (
                <img
                  src={member.avatarUrl}
                  alt={member.fullName}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-700 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-700 to-indigo-500 border border-indigo-400/30 flex items-center justify-center font-bold text-white text-base shrink-0">
                  {member.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="truncate">
                <h3 className="text-sm font-bold text-white truncate">{member.fullName}</h3>
                <p className="text-xs text-slate-400 truncate">{member.email}</p>
              </div>
            </div>

            {/* Current Active Task or Idle State */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 space-y-1 mb-4">
              <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block">
                {member.isOnline ? 'Current Active Task' : 'Last Session Task'}
              </span>
              <p className="text-xs font-medium text-slate-200 truncate">
                {member.currentTaskTitle || 'No active task selected'}
              </p>
              {member.currentProjectName && (
                <div className="flex items-center gap-1.5 text-[11px] text-indigo-400 pt-0.5">
                  <Folder className="w-3 h-3 shrink-0" />
                  <span className="truncate">{member.currentProjectName}</span>
                </div>
              )}
            </div>

            {/* Productivity Gauge & Hours Worked */}
            <div className="space-y-2 pt-2 border-t border-slate-800/60">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Productivity:</span>
                </span>
                <span className="font-mono font-bold text-white">
                  {member.lastProductivityScore}%
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    member.lastProductivityScore > 75
                      ? 'bg-emerald-500'
                      : member.lastProductivityScore > 50
                      ? 'bg-amber-500'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.max(member.lastProductivityScore, 5)}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                <span>Total Today:</span>
                <span className="font-mono font-semibold text-slate-200">
                  {formatHours(member.secondsTrackedToday)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
