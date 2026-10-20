import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { PayrollTable, type PayrollRow } from '@/components/payroll/payroll-table';
import { Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    start?: string;
    end?: string;
  }>;
}

export default async function PayrollPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;

  const now = new Date();
  const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    .toISOString()
    .split('T')[0];
  const todayStr = now.toISOString().split('T')[0];

  const periodStart = resolvedParams.start || firstDayOfMonth;
  const periodEnd = resolvedParams.end || todayStr;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // 1. Resolve active organization ID
  const cookieStore = await cookies();
  let activeOrgId = cookieStore.get('apploye_active_org_id')?.value;

  if (!activeOrgId) {
    const { data: primaryMembership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!primaryMembership) {
      redirect('/onboarding');
    }
    activeOrgId = primaryMembership.organization_id;
  }

  // 2. Fetch all members belonging to this organization
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select(`
      id,
      user_id,
      job_title,
      hourly_pay_rate,
      user:users (
        id,
        full_name,
        email,
        avatar_url
      )
    `)
    .eq('organization_id', activeOrgId)
    .eq('is_active', true);

  if (membersError) {
    console.error('Error fetching members for payroll:', membersError);
  }

  const memberIds = (members || []).map((m: any) => m.id);

  // 3. Query approved time entries within the period range
  const startIso = new Date(`${periodStart}T00:00:00.000Z`).toISOString();
  const endIso = new Date(`${periodEnd}T23:59:59.999Z`).toISOString();

  let memberTrackedSeconds: Record<string, number> = {};

  if (memberIds.length > 0) {
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('member_id, duration_seconds')
      .in('member_id', memberIds)
      .gte('start_time', startIso)
      .lte('start_time', endIso)
      .eq('approval_status', 'APPROVED');

    (timeEntries || []).forEach((t: any) => {
      memberTrackedSeconds[t.member_id] =
        (memberTrackedSeconds[t.member_id] || 0) + (t.duration_seconds || 0);
    });
  }

  // 4. Query existing payroll payout records for this period
  const { data: existingPayrolls } = await supabase
    .from('payrolls')
    .select('member_id, status, transaction_ref, paid_at')
    .eq('organization_id', activeOrgId)
    .eq('period_start_date', periodStart)
    .eq('period_end_date', periodEnd);

  const payrollMap: Record<string, any> = {};
  (existingPayrolls || []).forEach((p: any) => {
    payrollMap[p.member_id] = p;
  });

  // 5. Aggregate calculations using integer cents arithmetic
  const payrollRows: PayrollRow[] = (members || []).map((m: any) => {
    const totalSec = memberTrackedSeconds[m.id] || 0;
    const totalHours = totalSec / 3600;
    const hourlyRate = Number(m.hourly_pay_rate || 0);

    // Safe monetary math: convert hourly rate to cents, multiply by seconds / 3600
    const rateInCents = Math.round(hourlyRate * 100);
    const grossPayCents = Math.round((rateInCents * totalSec) / 3600);

    const payoutRecord = payrollMap[m.id];
    const isPaid = payoutRecord?.status === 'PAID';

    return {
      memberId: m.id,
      fullName: m.user?.full_name || 'Team Member',
      email: m.user?.email || '',
      avatarUrl: m.user?.avatar_url,
      jobTitle: m.job_title,
      hourlyRate,
      totalTrackedSeconds: totalSec,
      totalHours,
      grossPayCents,
      isPaid,
      transactionRef: payoutRecord?.transaction_ref,
      paidAt: payoutRecord?.paid_at,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Payroll & Employee Compensation</h1>
          <p className="text-xs text-slate-400 mt-1">
            Calculate gross pay from approved time entries and disburse compensation based on custom hourly rates.
          </p>
        </div>

        {/* Date Filter Form */}
        <form className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-slate-400 ml-1.5 shrink-0" />
          <input
            type="date"
            name="start"
            defaultValue={periodStart}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
          />
          <span className="text-xs text-slate-500">to</span>
          <input
            type="date"
            name="end"
            defaultValue={periodEnd}
            className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white font-mono"
          />
          <button
            type="submit"
            className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            Filter
          </button>
        </form>
      </div>

      <PayrollTable
        payrollRows={payrollRows}
        periodStart={periodStart}
        periodEnd={periodEnd}
      />
    </div>
  );
}
