'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export interface ProjectActionResult {
  error?: string;
  success?: boolean;
  message?: string;
}

/**
 * Creates a new project in the active organization.
 */
export async function createProject(
  prevState: ProjectActionResult | null,
  formData: FormData
): Promise<ProjectActionResult> {
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

  // Verify caller permissions
  const { data: callerMember } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', activeOrgId)
    .eq('user_id', user.id)
    .single();

  if (!callerMember || !['ORG_OWNER', 'MANAGER'].includes(callerMember.role)) {
    return { error: 'You do not have permission to create projects.' };
  }

  const name = (formData.get('name') as string)?.trim();
  const clientId = (formData.get('clientId') as string) || null;
  const budgetType = (formData.get('budgetType') as string) || 'NONE';
  const budgetAmount = parseFloat((formData.get('budgetAmount') as string) || '0.00');
  const billingRate = parseFloat((formData.get('billingRate') as string) || '0.00');
  const isBillable = formData.get('isBillable') === 'true';
  const color = (formData.get('color') as string) || '#6366F1';

  if (!name || name.length < 2) {
    return { error: 'Please enter a valid project name (at least 2 characters).' };
  }

  // Insert project
  const { error: insertError } = await supabase.from('projects').insert({
    organization_id: activeOrgId,
    client_id: clientId === 'none' ? null : clientId,
    name,
    budget_type: budgetType,
    budget_amount: budgetAmount,
    billing_rate: billingRate,
    is_billable: isBillable,
    color,
    is_archived: false,
  });

  if (insertError) {
    console.error('Failed to create project:', insertError);
    return { error: insertError.message };
  }

  revalidatePath('/dashboard/admin/projects');
  return { success: true, message: `Project "${name}" created successfully!` };
}

/**
 * Creates a new client in the active organization.
 */
export async function createClientRecord(
  prevState: ProjectActionResult | null,
  formData: FormData
): Promise<ProjectActionResult> {
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

  const name = (formData.get('name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const companyName = (formData.get('companyName') as string)?.trim();

  if (!name || !email) {
    return { error: 'Client name and email are required.' };
  }

  const { error } = await supabase.from('clients').insert({
    organization_id: activeOrgId,
    name,
    email,
    company_name: companyName,
    currency: 'USD',
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/dashboard/admin/projects');
  return { success: true, message: `Client "${name}" added successfully!` };
}
