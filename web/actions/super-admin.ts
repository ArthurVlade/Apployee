// actions/super-admin.ts
'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

export interface SuperAdminActionResult {
  success?: boolean;
  error?: string;
  message?: string;
}

/**
 * Verifies that the active authenticated session possesses Super Admin rights.
 * Evaluates both JWT metadata and the persistent is_super_admin flag in public.users.
 */
async function assertSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('Unauthorized: Valid platform session required.');
  }

  // Check JWT metadata first
  if (
    user.app_metadata?.is_super_admin === true ||
    user.user_metadata?.is_super_admin === true
  ) {
    return user;
  }

  // Verify database record using the service role bypass client
  const adminClient = createAdminClient();
  const { data: profile, error: profileError } = await adminClient
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.is_super_admin) {
    throw new Error('Forbidden: Access denied. User lacks is_super_admin privileges.');
  }

  return user;
}

/**
 * Suspends an organization, immediately revoking access for all managers and employees.
 */
export async function suspendTenant(orgId: string): Promise<SuperAdminActionResult> {
  try {
    await assertSuperAdmin();
    const admin = createAdminClient();

    // Update organization status to 'suspended'
    const { error: orgError } = await admin
      .from('organizations')
      .update({
        status: 'suspended',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId);

    if (orgError) {
      return { success: false, error: orgError.message };
    }

    // Optionally mark all organization members as deactivated
    await admin
      .from('organization_members')
      .update({ is_active: false })
      .eq('organization_id', orgId);

    revalidatePath('/(super-admin)/organizations');
    return {
      success: true,
      message: `Organization ${orgId} has been suspended. All tenant access revoked.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to suspend tenant.' };
  }
}

/**
 * Manually overrides a tenant's subscription plan tier (Free, Premium, Enterprise).
 */
export async function overrideStripePlan(
  orgId: string,
  planName: string
): Promise<SuperAdminActionResult> {
  try {
    await assertSuperAdmin();
    const admin = createAdminClient();

    const normalizedPlan = planName.toLowerCase();
    const { error } = await admin
      .from('organizations')
      .update({
        plan: normalizedPlan,
        subscription_status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orgId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/(super-admin)/organizations');
    return {
      success: true,
      message: `Organization subscription plan successfully overridden to ${planName}.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to override subscription plan.' };
  }
}

/**
 * Permanently deletes an organization and all cascading records across the SaaS.
 */
export async function deleteTenant(orgId: string): Promise<SuperAdminActionResult> {
  try {
    await assertSuperAdmin();
    const admin = createAdminClient();

    // Delete organization (cascades to members, projects, time_entries, screenshots)
    const { error } = await admin
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/(super-admin)/organizations');
    return {
      success: true,
      message: `Tenant ${orgId} permanently deleted from platform.`,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete tenant.' };
  }
}
