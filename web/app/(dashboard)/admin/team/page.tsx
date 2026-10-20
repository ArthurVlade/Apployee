import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { TeamTableClient, type TeamMemberRow } from '@/components/team/team-table-client';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

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

  // 1. Get current caller's role in this organization
  const { data: currentMember } = await supabase
    .from('organization_members')
    .select('role')
    .eq('organization_id', activeOrgId)
    .eq('user_id', user.id)
    .single();

  const currentUserRole = currentMember?.role || 'MEMBER';

  // 2. Query all organization members joined with user profile
  const { data: rawMembers, error } = await supabase
    .from('organization_members')
    .select(`
      id,
      user_id,
      role,
      job_title,
      hourly_pay_rate,
      is_active,
      joined_at,
      user:users (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('organization_id', activeOrgId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error querying team members:', error);
  }

  const members: TeamMemberRow[] = (rawMembers || []).map((m: any) => ({
    id: m.id,
    userId: m.user_id,
    fullName: m.user?.full_name || 'Team Member',
    email: m.user?.email || '',
    avatarUrl: m.user?.avatar_url,
    role: m.role,
    jobTitle: m.job_title,
    hourlyPayRate: Number(m.hourly_pay_rate || 0),
    isActive: m.is_active,
    joinedAt: m.joined_at,
  }));

  return (
    <TeamTableClient members={members} currentUserRole={currentUserRole} />
  );
}
