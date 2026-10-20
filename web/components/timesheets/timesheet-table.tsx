'use client';

import React, { useState } from 'react';
import { approveTimeEntry, rejectTimeEntry } from '@/actions/timesheets';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Laptop,
  Edit3,
  Loader2,
  Folder,
  Calendar,
  AlertCircle
} from 'lucide-react';

export interface TimesheetEntryRow {
  id: string;
  employeeName: string;
  employeeEmail: string;
  employeeAvatar?: string | null;
  projectName: string;
  taskTitle: string;
  dateFormatted: string;
  startTimeFormatted: string;
  endTimeFormatted: string;
  totalDuration: string;
  durationSeconds: number;
  entryType: 'AUTOMATIC_DESKTOP' | 'MANUAL_REQUEST';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  isManual: boolean;
  manualReason?: string | null;
}

interface TimesheetTableProps {
  entries: TimesheetEntryRow[];
}

export function TimesheetTable({ entries }: TimesheetTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');

  const filteredEntries = entries.filter((e) => {
    if (statusFilter === 'ALL') return true;
    return e.status === statusFilter;
  });

  const handleApprove = async (id: string) => {
    setLoadingId(id);
    try {
      await approveTimeEntry(id);
    } finally {
      setLoadingId(null);
    }
  };

  const handleReject = async (id: string) => {
    const reason = prompt('Enter a reason for rejecting this time entry (optional):');
    if (reason !== null) {
      setLoadingId(id);
      try {
        await rejectTimeEntry(id, reason);
      } finally {
        setLoadingId(null);
      }
    }
  };

  const pendingCount = entries.filter((e) => e.status === 'PENDING').length;

  return (
    <div className="space-y-4">
      {/* Top Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === 'ALL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Entries ({entries.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Pending Review</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-200 font-bold font-mono">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === 'REJECTED'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Rejected
          </button>
        </div>

        <div className="text-xs text-slate-400">
          Showing <strong className="text-white">{filteredEntries.length}</strong> timesheet records
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Project & Task</th>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Time Window</th>
                <th className="py-3.5 px-4">Duration</th>
                <th className="py-3.5 px-4">Tracking Type</th>
                <th className="py-3.5 px-4">Approval Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No timesheet entries found for this filter.
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-800/40 transition-colors">
                    {/* Employee */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        {entry.employeeAvatar ? (
                          <img
                            src={entry.employeeAvatar}
                            alt={entry.employeeName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                            {entry.employeeName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-slate-200 block">
                            {entry.employeeName}
                          </span>
                          <span className="text-slate-400 text-[10px] truncate max-w-[120px] block">
                            {entry.employeeEmail}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Project & Task */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-0.5">
                        <span className="font-medium text-slate-200 block truncate max-w-xs">
                          {entry.projectName}
                        </span>
                        <span className="text-slate-400 text-[11px] block truncate max-w-xs">
                          {entry.taskTitle}
                        </span>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="py-3.5 px-4 text-slate-300 font-mono">
                      {entry.dateFormatted}
                    </td>

                    {/* Start / End Time */}
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {entry.startTimeFormatted} – {entry.endTimeFormatted}
                    </td>

                    {/* Total Hours */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {entry.totalDuration}
                    </td>

                    {/* Type (Auto vs Manual) */}
                    <td className="py-3.5 px-4">
                      {entry.isManual ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">
                            <Edit3 className="w-2.5 h-2.5" />
                            <span>Manual Entry</span>
                          </span>
                          {entry.manualReason && (
                            <p className="text-[10px] text-slate-400 italic truncate max-w-[140px]" title={entry.manualReason}>
                              “{entry.manualReason}”
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <Laptop className="w-2.5 h-2.5" />
                          <span>Desktop Auto</span>
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          entry.status === 'APPROVED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : entry.status === 'PENDING'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {entry.status === 'PENDING' ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleApprove(entry.id)}
                            disabled={loadingId === entry.id}
                            title="Approve time entry"
                            className="p-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-400 hover:text-white border border-emerald-500/30 transition-colors"
                          >
                            {loadingId === entry.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => handleReject(entry.id)}
                            disabled={loadingId === entry.id}
                            title="Reject time entry"
                            className="p-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-400 hover:text-white border border-rose-500/30 transition-colors"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
