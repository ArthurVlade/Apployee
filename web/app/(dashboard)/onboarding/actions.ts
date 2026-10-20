'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export interface OnboardingActionResult {
  error?: string;
  success?: boolean;
}

/**
 * Creates a new organization for the authenticated user,
 * assigns them the OrgOwner role in organization_members,
 * and sets the active organization cookie.
 */
export async function createOrganization(
  prevState: OnboardingActionResult | null,
  formData: FormData
): Promise<OnboardingActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const orgName = (formData.get('orgName') as string)?.trim();
  const timezone = (formData.get('timezone') as string) || 'UTC';
  const currency = (formData.get('currency') as string) || 'USD';

  if (!orgName || orgName.length < 2) {
    return { error: 'Please enter a valid Organization Name (at least 2 characters).' };
  }

  // Generate unique URL-friendly slug
  const baseSlug = orgName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
  const uniqueSuffix = Math.random().toString(36).substring(2, 7);
  const slug = `${baseSlug}-${uniqueSuffix}`;

  // 1. Insert new organization
  const { data: newOrg, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name: orgName,
      slug,
      owner_id: user.id,
      default_screenshot_frequency: 3,
      stealth_mode_enabled: false,
      idle_timeout_minutes: 5,
      blur_screenshots_by_default: false,
      allow_manual_time: true,
      track_apps_and_urls: true,
      timezone,
      currency,
      subscription_status: 'TRIALING',
      plan: 'STANDARD',
      seats_allocated: 5,
    })
    .select('id, name')
    .single();

  if (orgError) {
    console.error('Failed to insert organization:', orgError);
    return { error: `Failed to create organization: ${orgError.message}` };
  }

  // 2. Insert user into organization_members table with role OrgOwner
  const { error: memberError } = await supabase
    .from('organization_members')
    .insert({
      organization_id: newOrg.id,
      user_id: user.id,
      role: 'ORG_OWNER',
      job_title: 'Workspace Owner & Admin',
      hourly_pay_rate: 0.0,
      billable_hourly_rate: 0.0,
      weekly_capacity_hours: 40.0,
      is_active: true,
    });

  if (memberError) {
    console.error('Failed to link owner to organization:', memberError);
    return { error: `Failed to link member role: ${memberError.message}` };
  }

  // 3. Update user metadata for fast client-side session resolution
  await supabase.auth.updateUser({
    data: {
      active_organization_id: newOrg.id,
      active_organization_name: newOrg.name,
    },
  });

  // 4. Set persistent HTTP-only cookie for middleware tenancy resolution
  const cookieStore = await cookies();
  cookieStore.set('apploye_active_org_id', newOrg.id, {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  revalidatePath('/', 'layout');
  redirect('/dashboard/admin/live-feed');
}
