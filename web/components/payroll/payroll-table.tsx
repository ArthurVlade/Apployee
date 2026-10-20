'use client';

import React, { useState } from 'react';
import { markPayrollAsPaid } from '@/actions/payroll';
import {
  DollarSign,
  CheckCircle2,
  Clock,
  Loader2,
  Calendar,
  AlertCircle,
  Building,
  CreditCard
} from 'lucide-react';

export interface PayrollRow {
  memberId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  jobTitle?: string | null;
  hourlyRate: number;
  totalTrackedSeconds: number;
  totalHours: number;
  grossPayCents: number; // Integer cents to prevent IEEE-754 precision issues
  isPaid: boolean;
  transactionRef?: string | null;
  paidAt?: string | null;
}

interface PayrollTableProps {
  payrollRows: PayrollRow[];
  periodStart: string;
  periodEnd: string;
}

export function PayrollTable({
  payrollRows,
  periodStart,
  periodEnd,
}: PayrollTableProps) {
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null);

  const formatCurrency = (cents: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(cents / 100);
  };

  const totalPayrollCents = payrollRows.reduce((acc, r) => acc + r.grossPayCents, 0);
  const totalTrackedHours = payrollRows.reduce((acc, r) => acc + r.totalHours, 0);

  const handleMarkAsPaid = async (row: PayrollRow) => {
    if (
      !confirm(
        `Disburse payroll for ${row.fullName}? Total gross amount: ${formatCurrency(row.grossPayCents)}`
      )
    ) {
      return;
    }

    setLoadingMemberId(row.memberId);
    try {
      await markPayrollAsPaid(
        row.memberId,
        periodStart,
        periodEnd,
        row.totalHours,
        row.hourlyRate,
        row.grossPayCents
      );
    } finally {
      setLoadingMemberId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Stat Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold block uppercase">Total Period Payroll</span>
          <span className="text-2xl font-extrabold text-white font-mono mt-1 block">
            {formatCurrency(totalPayrollCents)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block font-mono">
            {periodStart} to {periodEnd}
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold block uppercase">Approved Work Hours</span>
          <span className="text-2xl font-extrabold text-indigo-400 font-mono mt-1 block">
            {totalTrackedHours.toFixed(1)} hrs
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Across {payrollRows.length} team members</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <span className="text-xs text-slate-400 font-semibold block uppercase">Disbursement Status</span>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 block">
            {payrollRows.filter((r) => r.isPaid).length} / {payrollRows.length} Paid
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">Audit trail logged</span>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Employee</th>
                <th className="py-3.5 px-4">Role / Title</th>
                <th className="py-3.5 px-4">Approved Hours</th>
                <th className="py-3.5 px-4">Hourly Rate</th>
                <th className="py-3.5 px-4">Total Gross Pay</th>
                <th className="py-3.5 px-4">Payment Status</th>
                <th className="py-3.5 px-4 text-right">Disbursement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {payrollRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No approved time entries found in this date window.
                  </td>
                </tr>
              ) : (
                payrollRows.map((row) => (
                  <tr key={row.memberId} className="hover:bg-slate-800/40 transition-colors">
                    {/* Employee Profile */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {row.avatarUrl ? (
                          <img
                            src={row.avatarUrl}
                            alt={row.fullName}
                            className="w-8 h-8 rounded-full object-cover border border-slate-700"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                            {row.fullName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <span className="font-semibold text-slate-200 block text-xs">
                            {row.fullName}
                          </span>
                          <span className="text-slate-400 text-[10px] font-mono">
                            {row.email}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Job Title */}
                    <td className="py-3.5 px-4 text-slate-300">
                      {row.jobTitle || 'Team Member'}
                    </td>

                    {/* Tracked Hours */}
                    <td className="py-3.5 px-4 font-mono font-bold text-slate-200">
                      {row.totalHours.toFixed(2)} hrs
                    </td>

                    {/* Hourly Pay Rate */}
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      ${row.hourlyRate.toFixed(2)}/hr
                    </td>

                    {/* Gross Pay */}
                    <td className="py-3.5 px-4 font-mono font-bold text-emerald-400 text-sm">
                      {formatCurrency(row.grossPayCents)}
                    </td>

                    {/* Status Badge */}
                    <td className="py-3.5 px-4">
                      {row.isPaid ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                          {row.transactionRef && (
                            <span className="block text-[9px] font-mono text-slate-500 truncate max-w-[120px]">
                              {row.transactionRef}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Unpaid
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {!row.isPaid ? (
                        <button
                          onClick={() => handleMarkAsPaid(row)}
                          disabled={loadingMemberId === row.memberId || row.grossPayCents === 0}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          {loadingMemberId === row.memberId ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Processing...</span>
                            </>
                          ) : (
                            <>
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Mark Paid</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 font-mono">Disbursed</span>
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
