'use client';

import React, { useActionState } from 'react';
import { createOrganization, type OnboardingActionResult } from './actions';
import { Clock, Building2, Globe, DollarSign, ArrowRight, Loader2, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function OnboardingPage() {
  const [state, formAction, isPending] = useActionState<OnboardingActionResult | null, FormData>(
    createOrganization,
    null
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center">
        <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 shadow-xl shadow-indigo-500/20 mb-4">
          <Building2 className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          Set up your Organization
        </h1>
        <p className="mt-2 text-sm text-slate-400 max-w-md mx-auto">
          Welcome to Apploye. To begin tracking time, monitoring desktop activity, and managing payroll, define your workspace.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-10 shadow-2xl shadow-black/70 relative overflow-hidden">
          {/* Subtle decoration */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Stepper badge */}
          <div className="mb-6 flex items-center justify-between pb-5 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold font-mono">
                1
              </span>
              <span className="text-xs font-semibold text-white">Workspace Tenancy Provisioning</span>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
              Step 1 of 1
            </span>
          </div>

          {state?.error && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <span className="font-semibold block leading-tight">{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-5">
            <div>
              <label htmlFor="orgName" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Organization / Company Name <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  id="orgName"
                  name="orgName"
                  type="text"
                  required
                  placeholder="e.g. Acme Technologies Inc."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pl-10"
                />
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                This will be displayed on client invoices, reports, and your desktop app instances.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="timezone" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Default Timezone
                </label>
                <div className="relative">
                  <select
                    id="timezone"
                    name="timezone"
                    defaultValue="America/New_York"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pl-10 appearance-none"
                  >
                    <option value="America/New_York">Eastern Time (US & Canada)</option>
                    <option value="America/Chicago">Central Time (US & Canada)</option>
                    <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                    <option value="Europe/London">London / GMT</option>
                    <option value="Europe/Berlin">Berlin / Central European</option>
                    <option value="Asia/Dubai">Dubai (GST)</option>
                    <option value="Asia/Singapore">Singapore (SGT)</option>
                    <option value="UTC">UTC (Universal)</option>
                  </select>
                  <Globe className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

              <div>
                <label htmlFor="currency" className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Default Currency
                </label>
                <div className="relative">
                  <select
                    id="currency"
                    name="currency"
                    defaultValue="USD"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all pl-10 appearance-none"
                  >
                    <option value="USD">USD ($) - United States Dollar</option>
                    <option value="EUR">EUR (€) - Euro</option>
                    <option value="GBP">GBP (£) - British Pound</option>
                    <option value="CAD">CAD ($) - Canadian Dollar</option>
                    <option value="AUD">AUD ($) - Australian Dollar</option>
                  </select>
                  <DollarSign className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>
            </div>

            {/* Default policies enabled by default */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
              <span className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider block">
                Automatic Workspace Policies Initialized:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>3 random screenshots / 10 min</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>5-min idle pause threshold</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Apps & URL productivity scoring</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Role: OrgOwner assigned</span>
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Creating workspace and provisioning roles...</span>
                  </>
                ) : (
                  <>
                    <span>Initialize Organization & Enter Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Multi-tenant isolated PostgreSQL row security enforced.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
