// app/auth/forgot-password/page.tsx
'use client';

import React, { useActionState } from 'react';
import Link from 'next/link';
import { resetPasswordForEmailAction, type AuthActionResult } from '../actions';
import { Clock, ArrowRight, Loader2, KeyRound, ShieldCheck, CheckCircle2, ArrowLeft, Mail } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [state, formAction, isPending] = useActionState<AuthActionResult | null, FormData>(
    resetPasswordForEmailAction,
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
          Reset your password
        </h2>
        <p className="mt-2 text-xs text-slate-400">
          Enter your registered work email and we&apos;ll send you a secure recovery link.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-black/60 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

          {state?.success ? (
            <div className="text-center py-4 space-y-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                Recovery link sent
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                If an account exists with that email, we&apos;ve sent instructions to reset your password. Please check your inbox and spam folder.
              </p>
              <div className="pt-4">
                <Link
                  href="/auth/login"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs border border-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {state?.error && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-start gap-2.5">
                  <span className="font-semibold block leading-tight">{state.error}</span>
                </div>
              )}

              <form action={formAction} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Work Email Address
                  </label>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="alex@company.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                      <Mail className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2"
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending recovery link...</span>
                      </>
                    ) : (
                      <>
                        <span>Send Password Reset Link</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
                <Link
                  href="/auth/login"
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Encrypted with TLS 1.3 &bull; Supabase Auth Managed</span>
        </div>
      </div>
    </div>
  );
}
