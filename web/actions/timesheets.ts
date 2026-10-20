'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export interface TimesheetActionResult {
  error?: string;
  success?: boolean;
}

/**
 * Approves a pending manual or automated time entry.
 */
export async function approveTimeEntry(entryId: string): Promise<TimesheetActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('apploye_active_org_id')?.value;

  if (!activeOrgId) {
    return { error: 'No active organization found' };
  }

  // Verify caller has Manager or Owner permissions
  const { data: callerMember } = await supabase
    .from('organization_members')
    .select('id, role')
    .eq('organization_id', activeOrgId)
    .eq('user_id', user.id)
    .single();

  if (!callerMember || !['ORG_OWNER', 'MANAGER'].includes(callerMember.role)) {
    return { error: 'You do not have permission to approve timesheets.' };
  }

  // Update time entry
  const { error } = await supabase
    .from('time_entries')
    .update({
      approval_status: 'APPROVED',
      approved_by_id: callerMember.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', entryId);

  if (error) {
    console.error('Failed to approve time entry:', error);
    return { error: error.message };
  }

  revalidatePath('/dashboard/admin/timesheets');
  return { success: true };
}

/**
 * Rejects a time entry with an audit reason.
 */
export async function rejectTimeEntry(
  entryId: string,
  rejectionReason?: string
): Promise<TimesheetActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('apploye_active_org_id')?.value;

  if (!activeOrgId) {
    return { error: 'No active organization found' };
  }

  const { data: callerMember } = await supabase
    .from('organization_members')
    .select('id, role')
    .eq('organization_id', activeOrgId)
    .eq('user_id', user.id)
    .single();

  if (!callerMember || !['ORG_OWNER', 'MANAGER'].includes(callerMember.role)) {
    return { error: 'You do not have permission to reject timesheets.' };
  }

  const { error } = await supabase
    .from('time_entries')
    .update({
      approval_status: 'REJECTED',
      note: rejectionReason ? `[REJECTED: ${rejectionReason}]` : '[REJECTED]',
    })
    .eq('id', entryId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/admin/timesheets');
  return { success: true };
}
