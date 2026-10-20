'use client';

import React, { useState, useTransition } from 'react';
import {
  createCheckoutSession,
  createCustomerPortalSession,
  updateSubscriptionSeats
} from '@/actions/billing';
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from '@/utils/stripe';
import {
  CreditCard,
  Check,
  Zap,
  ShieldCheck,
  Users,
  Calendar,
  ExternalLink,
  Loader2,
  AlertCircle,
  Building2,
  Sparkles,
  ArrowRight
} from 'lucide-react';

interface BillingClientProps {
  organization: {
    id: string;
    name: string;
    subscriptionStatus: string;
    plan: 'STARTER' | 'STANDARD' | 'ELITE';
    seatsAllocated: number;
    trialEndsAt?: string | null;
    stripeCustomerId?: string | null;
  };
  activeMembersCount: number;
}

export function BillingClient({ organization, activeMembersCount }: BillingClientProps) {
  const [selectedPlan, setSelectedPlan] = useState<'STARTER' | 'STANDARD' | 'ELITE'>(
    organization.plan || 'STANDARD'
  );
  const [seatCount, setSeatCount] = useState<number>(organization.seatsAllocated || 5);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const currentTier = SUBSCRIPTION_TIERS[selectedPlan];
  const monthlyTotal = currentTier.pricePerUserMonthly * seatCount;

  const handleCheckout = (tierId: 'STARTER' | 'STANDARD' | 'ELITE') => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await createCheckoutSession(tierId, seatCount);
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.url) {
        window.location.href = res.url;
      }
    });
  };

  const handleOpenPortal = () => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await createCustomerPortalSession();
      if (res.error) {
        setErrorMsg(res.error);
      } else if (res.url) {
        window.location.href = res.url;
      }
    });
  };

  const handleSaveSeats = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    startTransition(async () => {
      const res = await updateSubscriptionSeats(seatCount);
      if (res.error) {
        setErrorMsg(res.error);
      } else {
        setSuccessMsg(`Successfully allocated ${seatCount} user seats.`);
      }
    });
  };

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    TRIALING: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    PAST_DUE: 'bg-red-500/10 text-red-400 border-red-500/20',
    CANCELED: 'bg-slate-800 text-slate-400 border-slate-700',
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Subscription & Stripe Billing</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your organization&apos;s subscription plan, allocated user seats, and Stripe payment methods.
          </p>
        </div>

        {organization.stripeCustomerId && (
          <button
            onClick={handleOpenPortal}
            disabled={isPending}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-2 border border-slate-700 transition-all self-start sm:self-auto"
          >
            <CreditCard className="w-4 h-4 text-slate-400" />
            <span>Manage in Stripe Portal</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
          </button>
        )}
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 2. Current Subscription Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Current Plan</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                statusColors[organization.subscriptionStatus] || statusColors.TRIALING
              }`}
            >
              {organization.subscriptionStatus}
            </span>
          </div>
          <div className="text-2xl font-black text-white">
            {SUBSCRIPTION_TIERS[organization.plan]?.name || 'Standard Plan'}
          </div>
          <p className="text-[11px] text-slate-400">
            {organization.subscriptionStatus === 'TRIALING'
              ? 'Free 14-day enterprise trial active'
              : 'Active Stripe recurring billing'}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Seat Capacity</span>
            <Users className="w-4 h-4 text-slate-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-400 font-mono">
              {activeMembersCount}
            </span>
            <span className="text-xs text-slate-500">
              of {organization.seatsAllocated} seats utilized
            </span>
          </div>
          <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden border border-slate-800">
            <div
              className={`h-full ${
                activeMembersCount > organization.seatsAllocated
                  ? 'bg-red-500'
                  : 'bg-indigo-500'
              }`}
              style={{
                width: `${Math.min(
                  100,
                  (activeMembersCount / (organization.seatsAllocated || 1)) * 100
                )}%`,
              }}
            />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase">Estimated Monthly Cost</span>
            <Sparkles className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            ${(SUBSCRIPTION_TIERS[organization.plan]?.pricePerUserMonthly || 10) * organization.seatsAllocated}
            <span className="text-xs text-slate-500 font-normal"> /month</span>
          </div>
          <p className="text-[11px] text-slate-400">
            ${SUBSCRIPTION_TIERS[organization.plan]?.pricePerUserMonthly || 10}/seat x {organization.seatsAllocated} seats
          </p>
        </div>
      </div>

      {/* 3. Seat Allocation Adjuster */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <span>Team Seat Management</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Adjust the number of monitored team members in your organization. Seats are prorated immediately in Stripe.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setSeatCount(Math.max(1, seatCount - 1))}
                className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center transition-colors"
              >
                -
              </button>
              <input
                type="number"
                min="1"
                max="500"
                value={seatCount}
                onChange={(e) => setSeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 text-center bg-transparent text-sm font-bold font-mono text-white focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setSeatCount(seatCount + 1)}
                className="w-7 h-7 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm flex items-center justify-center transition-colors"
              >
                +
              </button>
            </div>

            <button
              onClick={handleSaveSeats}
              disabled={isPending || seatCount === organization.seatsAllocated}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 disabled:opacity-40 transition-all flex items-center gap-2"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Seats</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. Plan Selection Cards */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white">Available Subscription Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.values(SUBSCRIPTION_TIERS) as SubscriptionTier[]).map((tier) => {
            const isCurrent = organization.plan === tier.id;
            const isFeatured = tier.id === 'ELITE';

            return (
              <div
                key={tier.id}
                className={`relative rounded-2xl p-6 flex flex-col justify-between border transition-all ${
                  isFeatured
                    ? 'bg-gradient-to-b from-indigo-950/40 via-slate-900 to-slate-900 border-indigo-500/50 shadow-xl shadow-indigo-950/50'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                {isFeatured && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500 text-[10px] font-bold text-white tracking-wider uppercase shadow-md">
                    Most Popular & Complete
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-white">{tier.name}</h3>
                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase tracking-wider">
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-2 min-h-[36px]">
                    {tier.description}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-white font-mono">
                        ${tier.pricePerUserMonthly}
                      </span>
                      <span className="text-xs text-slate-400">/user/mo</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      ${tier.pricePerUserMonthly * seatCount}/mo for {seatCount} seats
                    </div>
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs text-slate-300">
                    {tier.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 pt-4 border-t border-slate-800">
                  <button
                    onClick={() => handleCheckout(tier.id)}
                    disabled={isPending}
                    className={`w-full py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      isCurrent
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : isFeatured
                        ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-800 hover:bg-indigo-600 text-white'
                    }`}
                  >
                    {isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>{isCurrent ? 'Modify Subscription' : `Upgrade to ${tier.name}`}</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. Trust & Security Banner */}
      <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Payments securely processed by Stripe with 256-bit encryption. PCI-DSS Level 1 compliant.</span>
        </div>
        <div className="text-slate-500 hidden sm:block">
          Need custom enterprise pricing for &gt;100 users? Contact sales@apploye.io
        </div>
      </div>
    </div>
  );
}
