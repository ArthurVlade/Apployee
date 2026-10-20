import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { ProjectGridClient, type ProjectCardData } from '@/components/projects/project-grid-client';
import { type ClientOption } from '@/components/projects/create-project-modal';

export const dynamic = 'force-dynamic';

export default async function ProjectsPage() {
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

  // 2. Fetch clients belonging to this organization
  const { data: rawClients } = await supabase
    .from('clients')
    .select('id, name, company_name')
    .eq('organization_id', activeOrgId)
    .order('name', { ascending: true });

  const clients: ClientOption[] = (rawClients || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    companyName: c.company_name,
  }));

  // 3. Fetch projects belonging to this organization
  const { data: rawProjects, error } = await supabase
    .from('projects')
    .select(`
      id,
      name,
      color,
      is_billable,
      billing_rate,
      budget_type,
      budget_amount,
      is_archived,
      client:clients (
        name
      )
    `)
    .eq('organization_id', activeOrgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
  }

  const projectIds = (rawProjects || []).map((p: any) => p.id);

  // 4. Aggregate tracked time per project
  let projectDurations: Record<string, number> = {};

  if (projectIds.length > 0) {
    const { data: timeEntries } = await supabase
      .from('time_entries')
      .select('project_id, duration_seconds')
      .in('project_id', projectIds);

    (timeEntries || []).forEach((t: any) => {
      projectDurations[t.project_id] = (projectDurations[t.project_id] || 0) + (t.duration_seconds || 0);
    });
  }

  // 5. Map to ProjectCardData
  const projects: ProjectCardData[] = (rawProjects || []).map((p: any) => {
    const totalSeconds = projectDurations[p.id] || 0;
    const totalHours = totalSeconds / 3600;
    const rate = Number(p.billing_rate || 0);
    const cost = totalHours * rate;

    return {
      id: p.id,
      name: p.name,
      color: p.color || '#6366F1',
      clientName: p.client?.name || null,
      budgetType: p.budget_type || 'NONE',
      budgetAmount: Number(p.budget_amount || 0),
      billingRate: rate,
      isBillable: !!p.is_billable,
      totalHoursTracked: totalHours,
      totalCostAccrued: cost,
      isArchived: !!p.is_archived,
    };
  });

  return (
    <ProjectGridClient projects={projects} clients={clients} />
  );
}
