'use client';

import React, { useActionState } from 'react';
import { createProject, type ProjectActionResult } from '@/actions/projects';
import {
  FolderPlus,
  Building,
  DollarSign,
  PieChart,
  Tag,
  X,
  Loader2,
  CheckCircle2
} from 'lucide-react';

export interface ClientOption {
  id: string;
  name: string;
  companyName?: string | null;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientOption[];
}

export function CreateProjectModal({
  isOpen,
  onClose,
  clients,
}: CreateProjectModalProps) {
  const [state, formAction, isPending] = useActionState<ProjectActionResult | null, FormData>(
    async (prevState, formData) => {
      const res = await createProject(prevState, formData);
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
              <FolderPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Create New Project</h3>
              <p className="text-xs text-slate-400">Set up project budgets, hourly billing, and client assignments</p>
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
            <span>{state.message || 'Project created successfully!'}</span>
          </div>
        )}

        {/* Form */}
        <form action={formAction} className="mt-5 space-y-4">
          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-slate-300 mb-1.5">
              Project Name *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="e.g. Next-Gen Mobile Banking"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="clientId" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Client Organization
              </label>
              <div className="relative">
                <select
                  id="clientId"
                  name="clientId"
                  defaultValue="none"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pl-10 appearance-none"
                >
                  <option value="none">Internal (No Client)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.companyName ? `(${c.companyName})` : ''}
                    </option>
                  ))}
                </select>
                <Building className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label htmlFor="color" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Theme Color
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="color"
                  name="color"
                  type="color"
                  defaultValue="#6366F1"
                  className="w-10 h-9 bg-slate-950 border border-slate-800 rounded-xl cursor-pointer p-1"
                />
                <span className="text-xs text-slate-400 font-mono">Accent Hex</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="budgetType" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Budget Type
              </label>
              <div className="relative">
                <select
                  id="budgetType"
                  name="budgetType"
                  defaultValue="TOTAL_COST"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pl-10 appearance-none"
                >
                  <option value="TOTAL_COST">Fixed Total Cost ($)</option>
                  <option value="TOTAL_HOURS">Total Hours Capacity</option>
                  <option value="MONTHLY_COST">Monthly Cost ($)</option>
                  <option value="NONE">No Budget Limit</option>
                </select>
                <PieChart className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>

            <div>
              <label htmlFor="budgetAmount" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Budget Target Value
              </label>
              <div className="relative">
                <input
                  id="budgetAmount"
                  name="budgetAmount"
                  type="number"
                  step="100"
                  defaultValue="5000"
                  placeholder="5000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pl-10 font-mono"
                />
                <DollarSign className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="billingRate" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Client Billing Rate ($ / hr)
              </label>
              <input
                id="billingRate"
                name="billingRate"
                type="number"
                step="5"
                defaultValue="65.00"
                placeholder="65.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Billable Status
              </label>
              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-200">
                  <input
                    type="radio"
                    name="isBillable"
                    value="true"
                    defaultChecked
                    className="accent-indigo-600"
                  />
                  <span>Billable Project</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400">
                  <input
                    type="radio"
                    name="isBillable"
                    value="false"
                    className="accent-indigo-600"
                  />
                  <span>Non-Billable</span>
                </label>
              </div>
            </div>
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
                  <span>Creating Project...</span>
                </>
              ) : (
                <>
                  <FolderPlus className="w-4 h-4" />
                  <span>Create Project</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
