// app/page.tsx
import React from 'react';
import Link from 'next/link';
import {
  Clock,
  Camera,
  Activity,
  ShieldCheck,
  DollarSign,
  ArrowRight,
  Download,
  Check,
  Laptop,
  Monitor
} from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f6f5f4] text-[#000000] font-sans selection:bg-[#e6f3fe] selection:text-[#0075de]">
      {/* Fixed Navigation Bar */}
      <header className="border-b border-black/[0.08] bg-[#f6f5f4]/90 backdrop-blur-md sticky top-0 z-50 h-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-lg bg-[#0075de] flex items-center justify-center text-white">
                <Clock className="w-4 h-4" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-black">Apploye</span>
            </Link>

            <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-black/60">
              <a href="#features" className="hover:text-black transition-colors">Features</a>
              <a href="#proof-of-work" className="hover:text-black transition-colors">Proof of Work</a>
              <a href="#pricing" className="hover:text-black transition-colors">Pricing</a>
              <Link href="/download" className="hover:text-black transition-colors flex items-center gap-1">
                <Download className="w-3.5 h-3.5 text-[#0075de]" />
                <span>Desktop Tracker</span>
              </Link>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/auth/login"
              className="text-xs font-medium text-black/60 hover:text-black px-3 py-1.5 rounded-lg hover:bg-black/[0.04] transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/sign-up"
              className="text-xs font-medium bg-[#0075de] hover:bg-[#0066c0] text-white px-3.5 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <span>Get Started Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="pt-20 pb-20 px-4 sm:px-6 text-center max-w-4xl mx-auto space-y-8">
        {/* Row of Avatar Character Marks */}
        <div className="flex items-center justify-center -space-x-2 mb-2">
          <div className="w-10 h-10 rounded-full border-2 border-[#097fe8] bg-white overflow-hidden p-0.5">
            <img src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&auto=format&fit=crop&q=80" alt="Avatar" className="w-full h-full rounded-full object-cover" />
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-[#f64932] bg-white overflow-hidden p-0.5">
            <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&auto=format&fit=crop&q=80" alt="Avatar" className="w-full h-full rounded-full object-cover" />
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-[#ffb110] bg-white overflow-hidden p-0.5">
            <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&auto=format&fit=crop&q=80" alt="Avatar" className="w-full h-full rounded-full object-cover" />
          </div>
          <div className="w-10 h-10 rounded-full border-2 border-[#62aef0] bg-white overflow-hidden p-0.5">
            <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&auto=format&fit=crop&q=80" alt="Avatar" className="w-full h-full rounded-full object-cover" />
          </div>
        </div>

        {/* Hero Title with Highlight Pill */}
        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-black leading-[1.15]">
          Where teams and agents track{' '}
          <span className="inline-block bg-[#f6d5b8] text-black px-4 py-0.5 rounded-full font-medium">
            Proof of Work
          </span>{' '}
          together.
        </h1>

        {/* Editorial Serif Subhead */}
        <p className="font-serif italic text-lg sm:text-xl text-[#615d59] max-w-2xl mx-auto leading-relaxed">
          Tactile, quiet time tracking for high-output teams. Randomized screenshot captures, automatic idle detection, and transparent payroll without the administrative clutter.
        </p>

        {/* Two-Button CTA Row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <Link
            href="/auth/sign-up"
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#0075de] hover:bg-[#0066c0] text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>Start 14-Day Free Trial</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/download"
            className="w-full sm:w-auto px-5 py-2.5 rounded-lg bg-[#e6f3fe] hover:bg-[#d8ecfd] text-[#0075de] font-medium text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Desktop Tracker</span>
          </Link>
        </div>

        {/* Centered Product UI Mockup Card with Hairline Border & Subtle Elevation */}
        <div className="pt-8">
          <div className="bg-white border border-black/[0.08] rounded-xl p-4 sm:p-6 shadow-[0px_4px_12px_rgba(0,0,0,0.06)] text-left space-y-4">
            <div className="flex items-center justify-between border-b border-black/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                <span className="text-xs font-medium text-black/60 pl-2">Apploye Native Tracker &bull; Active Work Session</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="px-2 py-0.5 rounded-full bg-[#ffb110]/20 text-[#000000] font-medium text-[11px]">
                  Tracking Active
                </span>
                <span className="font-mono font-semibold text-black">01:42:18</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="p-4 rounded-lg bg-[#f6f5f4] border border-black/[0.04] space-y-1">
                <div className="text-[11px] font-semibold text-[#757575] uppercase">Current Project</div>
                <div className="text-sm font-semibold text-black">SaaS Core Architecture</div>
                <div className="text-xs text-[#615d59]">Refactoring RLS policies</div>
              </div>
              <div className="p-4 rounded-lg bg-[#f6f5f4] border border-black/[0.04] space-y-1">
                <div className="text-[11px] font-semibold text-[#757575] uppercase">Activity Rate</div>
                <div className="text-sm font-semibold text-black">88% Optimal</div>
                <div className="text-xs text-[#615d59]">412 keys &bull; 180 clicks</div>
              </div>
              <div className="p-4 rounded-lg bg-[#f6f5f4] border border-black/[0.04] space-y-1">
                <div className="text-[11px] font-semibold text-[#757575] uppercase">Proof of Work</div>
                <div className="text-sm font-semibold text-black">Randomized (3 / 10m)</div>
                <div className="text-xs text-[#615d59]">Captured at 10:24 AM</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Rotating Accent Feature Cards */}
      <section id="features" className="py-16 max-w-6xl mx-auto px-4 sm:px-6 space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#757575]">
            Engineered for Precision
          </h2>
          <p className="text-3xl font-bold tracking-tight text-black">
            Three principles of quiet accountability
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Marigold Accent Card */}
          <div className="bg-[#ffb110] rounded-xl p-8 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-lg bg-black text-white flex items-center justify-center">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-black leading-tight">
                Randomized Screenshots
              </h3>
              <p className="text-xs text-black/80 leading-relaxed">
                Takes 1 to 10 cryptographically random screen captures per 10-minute block. No predictable cadences means team members stay engaged without staging their screens.
              </p>
            </div>
            <span className="text-xs font-semibold text-black underline underline-offset-4">
              Inspect capture algorithm &rarr;
            </span>
          </div>

          {/* Card 2: White Feature Card */}
          <div className="bg-white border border-black/[0.08] rounded-xl p-8 space-y-4 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-lg bg-[#e6f3fe] text-[#0075de] flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-black leading-tight">
                Hardware Activity Rate
              </h3>
              <p className="text-xs text-[#615d59] leading-relaxed">
                Native system hooks measure keystroke and mouse event frequencies. No keylogging of passwords or customer messages — only high-level activity ratios.
              </p>
            </div>
            <span className="text-xs font-semibold text-[#0075de]">
              Privacy-first design &rarr;
            </span>
          </div>

          {/* Card 3: Sky Wash Accent Card */}
          <div className="bg-[#62aef0] rounded-xl p-8 space-y-4 flex flex-col justify-between text-black">
            <div className="space-y-3">
              <div className="h-10 w-10 rounded-lg bg-black text-white flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-bold text-black leading-tight">
                One-Click Payroll & Billing
              </h3>
              <p className="text-xs text-black/80 leading-relaxed">
                Desktop-verified hours automatically convert into gross employee payroll calculations and polished client invoices ready for Stripe.
              </p>
            </div>
            <span className="text-xs font-semibold text-black underline underline-offset-4">
              Explore billing workflows &rarr;
            </span>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-16 max-w-5xl mx-auto px-4 sm:px-6 space-y-12">
        <div className="text-center space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#757575]">
            Simple Pricing
          </h2>
          <p className="text-3xl font-bold tracking-tight text-black">
            Plans built like pages in a notebook
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-black/[0.08] rounded-xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <h3 className="font-bold text-base text-black">Solo</h3>
              <p className="text-xs text-[#615d59]">For independent contractors</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-black">$8</span>
                <span className="text-xs text-[#757575]">/ user / mo</span>
              </div>
              <ul className="space-y-2 text-xs text-[#615d59] pt-2">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#0075de]" /> Unlimited desktop tracking</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#0075de]" /> Up to 3 screenshots / 10m</li>
              </ul>
            </div>
            <Link href="/auth/sign-up" className="w-full py-2 rounded-lg bg-[#f6f5f4] hover:bg-[#e6f3fe] text-[#0075de] font-medium text-xs text-center border border-black/[0.08] transition-colors">
              Start Free Trial
            </Link>
          </div>

          <div className="bg-white border-2 border-[#0075de] rounded-xl p-6 flex flex-col justify-between space-y-6 relative">
            <div className="space-y-3">
              <span className="px-2 py-0.5 rounded-full bg-[#0075de] text-white text-[10px] font-bold uppercase tracking-wider inline-block">
                Most Popular
              </span>
              <h3 className="font-bold text-base text-black">Standard</h3>
              <p className="text-xs text-[#615d59]">For remote agencies & engineering teams</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-black">$14</span>
                <span className="text-xs text-[#757575]">/ user / mo</span>
              </div>
              <ul className="space-y-2 text-xs text-[#615d59] pt-2">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#0075de]" /> Randomized screenshots (up to 10/10m)</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#0075de]" /> Active app & URL recording</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#0075de]" /> Automated payroll & invoices</li>
              </ul>
            </div>
            <Link href="/auth/sign-up" className="w-full py-2 rounded-lg bg-[#0075de] hover:bg-[#0066c0] text-white font-medium text-xs text-center transition-colors">
              Start 14-Day Free Trial
            </Link>
          </div>

          <div className="bg-white border border-black/[0.08] rounded-xl p-6 flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <h3 className="font-bold text-base text-black">Enterprise</h3>
              <p className="text-xs text-[#615d59]">For organizations needing SSO & custom SLA</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-black">$24</span>
                <span className="text-xs text-[#757575]">/ user / mo</span>
              </div>
              <ul className="space-y-2 text-xs text-[#615d59] pt-2">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#0075de]" /> Everything in Standard</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#0075de]" /> SAML 2.0 & Okta SSO</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-[#0075de]" /> 99.99% uptime guarantee</li>
              </ul>
            </div>
            <Link href="/auth/sign-up" className="w-full py-2 rounded-lg bg-[#f6f5f4] hover:bg-[#e6f3fe] text-[#0075de] font-medium text-xs text-center border border-black/[0.08] transition-colors">
              Contact Sales
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/[0.08] py-12 text-center text-xs text-[#757575]">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#0075de]" />
            <span className="font-semibold text-black">Apploye Platform</span>
            <span>&copy; 2026 All rights reserved.</span>
          </div>

          <div className="flex items-center gap-6">
            <Link href="/download" className="hover:text-black">Download Tracker</Link>
            <Link href="/auth/login" className="hover:text-black">Sign In</Link>
            <Link href="/auth/sign-up" className="hover:text-black">Start Trial</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
