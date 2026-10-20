'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export interface PayrollActionResult {
  error?: string;
  success?: boolean;
  message?: string;
}

/**
 * Marks a member's payroll period as PAID, saving the transaction reference.
 */
export async function markPayrollAsPaid(
  memberId: string,
  periodStart: string,
  periodEnd: string,
  totalHours: number,
  hourlyRate: number,
  grossPayCents: number,
  paymentMethod: string = 'Direct Deposit'
): Promise<PayrollActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('apploye_active_org_id')?.value;

  if (!activeOrgId) {
    return { error: 'No active organization found.' };
  }

  // 1. Verify caller permissions (ORG_OWNER or MANAGER)
  const { data: caller } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', activeOrgId)
    .eq('user_id', user.id)
    .single();

  if (!caller || !['ORG_OWNER', 'MANAGER'].includes(caller.role)) {
    return { error: 'Only Organization Owners and Managers can disburse payroll.' };
  }

  const grossPayDecimal = (grossPayCents / 100).toFixed(2);
  const transactionRef = `PAY-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

  // 2. Upsert payroll record
  const { error } = await supabase.from('payrolls').upsert(
    {
      organization_id: activeOrgId,
      member_id: memberId,
      period_start_date: periodStart,
      period_end_date: periodEnd,
      total_hours: totalHours,
      hourly_rate: hourlyRate,
      gross_pay: grossPayDecimal,
      bonus_amount: 0.0,
      deduction_amount: 0.0,
      net_pay: grossPayDecimal,
      status: 'PAID',
      payment_method: paymentMethod,
      transaction_ref: transactionRef,
      paid_at: new Date().toISOString(),
    },
    {
      onConflict: 'organization_id,member_id,period_start_date,period_end_date',
    }
  );

  if (error) {
    console.error('Failed to record payroll payout:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/admin/payroll');
  return {
    success: true,
    message: `Payroll marked as paid. Ref: ${transactionRef}`,
  };
}
