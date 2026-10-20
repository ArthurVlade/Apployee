'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export interface TeamActionResult {
  error?: string;
  success?: boolean;
  message?: string;
}

/**
 * Invites a new team member to the active organization.
 */
export async function inviteMember(
  prevState: TeamActionResult | null,
  formData: FormData
): Promise<TeamActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized. Please sign in.' };
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('apploye_active_org_id')?.value;

  if (!activeOrgId) {
    return { error: 'No active organization found.' };
  }

  // 1. Verify caller has permission (ORG_OWNER or MANAGER)
  const { data: callerMember } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', activeOrgId)
    .eq('user_id', user.id)
    .single();

  if (!callerMember || !['ORG_OWNER', 'MANAGER'].includes(callerMember.role)) {
    return { error: 'You do not have permission to invite members.' };
  }

  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const role = (formData.get('role') as string) || 'MEMBER';
  const jobTitle = (formData.get('jobTitle') as string)?.trim() || 'Software Engineer';
  const hourlyRate = parseFloat((formData.get('hourlyRate') as string) || '0.00');

  if (!email || !email.includes('@')) {
    return { error: 'Please enter a valid email address.' };
  }

  // 2. Check if user already exists in public.users
  let { data: existingUser } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email)
    .maybeSingle();

  let targetUserId = existingUser?.id;

  // 3. If user does not exist in the database, provision an invited user record
  if (!targetUserId) {
    // Generate new UUID for invited user profile
    const newUserId = crypto.randomUUID();
    const { error: insertUserError } = await supabase.from('users').insert({
      id: newUserId,
      email,
      full_name: email.split('@')[0],
      platform_role: 'USER',
    });

    if (insertUserError) {
      console.error('Error inserting placeholder user:', insertUserError);
      return { error: `Failed to create invite user profile: ${insertUserError.message}` };
    }
    targetUserId = newUserId;
  }

  // 4. Check if member already belongs to this organization
  const { data: existingMembership } = await supabase
    .from('organization_members')
    .select('id, is_active')
    .eq('organization_id', activeOrgId)
    .eq('user_id', targetUserId)
    .maybeSingle();

  if (existingMembership) {
    if (existingMembership.is_active) {
      return { error: 'This user is already an active member of this organization.' };
    } else {
      // Reactivate previously archived member
      await supabase
        .from('organization_members')
        .update({ is_active: true, role, job_title: jobTitle, hourly_pay_rate: hourlyRate })
        .eq('id', existingMembership.id);
      revalidatePath('/dashboard/admin/team');
      return { success: true, message: 'Member re-activated successfully.' };
    }
  }

  // 5. Insert into organization_members
  const { error: memberError } = await supabase.from('organization_members').insert({
    organization_id: activeOrgId,
    user_id: targetUserId,
    role,
    job_title: jobTitle,
    hourly_pay_rate: hourlyRate,
    billable_hourly_rate: hourlyRate * 1.3,
    weekly_capacity_hours: 40.0,
    is_active: true,
  });

  if (memberError) {
    return { error: `Failed to link member to organization: ${memberError.message}` };
  }

  revalidatePath('/dashboard/admin/team');
  return { success: true, message: `Invitation successfully sent to ${email}!` };
}

/**
 * Updates an organization member's role (ORG_OWNER, MANAGER, MEMBER).
 */
export async function updateMemberRole(
  memberId: string,
  newRole: 'ORG_OWNER' | 'MANAGER' | 'MEMBER'
): Promise<TeamActionResult> {
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
    return { error: 'No active organization found.' };
  }

  // Verify caller is ORG_OWNER
  const { data: caller } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', activeOrgId)
    .eq('user_id', user.id)
    .single();

  if (caller?.role !== 'ORG_OWNER') {
    return { error: 'Only Organization Owners can change member roles.' };
  }

  const { error } = await supabase
    .from('organization_members')
    .update({ role: newRole })
    .eq('id', memberId)
    .eq('organization_id', activeOrgId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/admin/team');
  return { success: true };
}

/**
 * Soft deletes / removes a member from the organization.
 */
export async function removeMember(memberId: string): Promise<TeamActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized' };
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('apploye_active_org_id')?.value;

  const { error } = await supabase
    .from('organization_members')
    .update({ is_active: false })
    .eq('id', memberId)
    .eq('organization_id', activeOrgId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/admin/team');
  return { success: true };
}
