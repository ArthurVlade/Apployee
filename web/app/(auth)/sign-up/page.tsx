'use client';

import React, { useActionState } from 'react';
import Link from 'next/link';
import { signUp, type AuthActionResult } from '../actions';
import { Clock, ArrowRight, Loader2, ShieldCheck, Check } from 'lucide-react';

export default function SignUpPage() {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    signUp,
    null
  );

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-white">Apploye</span>
        </Link>
        <h2 className="mt-5 text-2xl font-bold tracking-tight text-white">
          Create your organization account
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          Start your 14-day unlimited free trial. No credit card required.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative overflow-hidden">
          {/* Subtle glow effect */}
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {state?.error && (
            <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <span className="font-semibold block leading-tight">{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="fullName" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                autoComplete="name"
                required
                placeholder="Sarah Connor"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="sarah@company.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                placeholder="••••••••••••"
                minLength={8}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
              <span className="text-[10px] text-slate-500 mt-1 block">Must be at least 8 characters.</span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Creating your account...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to Organization Setup</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Value props */}
          <div className="mt-6 pt-5 border-t border-slate-800 space-y-2">
            {[
              'Randomized multi-screen captures with blur capability',
              'Native desktop keyboard & mouse activity tracking',
              'Timesheet approvals, shift scheduling & Stripe payroll',
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-2 text-[11px] text-slate-400">
                <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Already have an Apploye account?{' '}
              <Link href="/sign-in" className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>SOC2 Type II Certified • GDPR Compliant • 256-bit Encryption</span>
        </div>
      </div>
    </div>
  );
}
