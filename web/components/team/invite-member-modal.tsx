'use client';

import React, { useState, useActionState } from 'react';
import { inviteMember, type TeamActionResult } from '@/actions/team';
import {
  UserPlus,
  Mail,
  Shield,
  DollarSign,
  Briefcase,
  X,
  Loader2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
  const [state, formAction, isPending] = useActionState<TeamActionResult | null, FormData>(
    async (prevState, formData) => {
      const res = await inviteMember(prevState, formData);
      if (res.success) {
        setTimeout(() => onClose(), 1200);
      }
      return res;
    },
    null
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-700/80 rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-scaleUp">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Invite Team Member</h3>
              <p className="text-xs text-slate-400">Add an employee or manager to your active workspace</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status messages */}
        {state?.error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            {state.error}
          </div>
        )}

        {state?.success && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{state.message || 'Invitation sent successfully!'}</span>
          </div>
        )}

        {/* Invite Form */}
        <form action={formAction} className="mt-5 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Work Email Address *
            </label>
            <div className="relative">
              <input
                id="email"
                name="email"
                type="email"
                required
                placeholder="developer@company.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pl-10"
              />
              <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="role" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Workspace Role *
              </label>
              <div className="relative">
                <select
                  id="role"
                  name="role"
                  defaultValue="MEMBER"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pl-10 appearance-none"
                >
                  <option value="MEMBER">Member (Track Time)</option>
                  <option value="MANAGER">Manager (Audit & Approve)</option>
                  <option value="ORG_OWNER">Organization Owner</option>
                </select>
                <Shield className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label htmlFor="jobTitle" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Job Title
              </label>
              <div className="relative">
                <input
                  id="jobTitle"
                  name="jobTitle"
                  type="text"
                  placeholder="e.g. Senior Frontend Dev"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pl-10"
                />
                <Briefcase className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="hourlyRate" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Hourly Pay Rate ($ / hr)
            </label>
            <div className="relative">
              <input
                id="hourlyRate"
                name="hourlyRate"
                type="number"
                step="0.5"
                defaultValue="45.00"
                placeholder="45.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pl-10 font-mono"
              />
              <DollarSign className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Used automatically by the Payroll calculation engine to compute wages.
            </p>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Sending Invitation...</span>
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Send Workspace Invite</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
