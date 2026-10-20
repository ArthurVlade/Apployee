'use client';

import React, { useActionState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn, type AuthActionResult } from '../actions';
import { Clock, ArrowRight, Loader2, Lock } from 'lucide-react';

export default function SignInPage() {
  const searchParams = useSearchParams();
  const redirectedFrom = searchParams.get('redirectedFrom');
  const callbackError = searchParams.get('error');

  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    signIn,
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
          Sign in to your workspace
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          Enter your credentials to access your organization dashboard.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative overflow-hidden">
          {redirectedFrom && (
            <div className="mb-5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
              Please sign in to access your dashboard.
            </div>
          )}

          {callbackError && (
            <div className="mb-5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              Authentication session expired or failed. Please sign in again.
            </div>
          )}

          {state?.error && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
              <span className="font-semibold block leading-tight">{state.error}</span>
            </div>
          )}

          <form action={formAction} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="name@company.com"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-300">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
              />
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center pt-5 border-t border-slate-800">
            <p className="text-xs text-slate-400">
              Don&apos;t have an organization account yet?{' '}
              <Link href="/sign-up" className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline">
                Start 14-day free trial
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
