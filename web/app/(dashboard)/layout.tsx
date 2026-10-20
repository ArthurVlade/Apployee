import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { OrgProvider, type OrganizationSummary } from '@/components/providers/org-provider';
import { DashboardSidebar } from '@/components/dashboard/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  // 1. Authenticate session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // 2. Fetch all active organizations for this user
  const { data: memberships, error } = await supabase
    .from('organization_members')
    .select(`
      role,
      organization:organizations (
        id,
        name,
        slug,
        logo_url
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true);

  if (error || !memberships || memberships.length === 0) {
    redirect('/onboarding');
  }

  // Normalize organizations list
  const userOrganizations: OrganizationSummary[] = memberships.map((m: any) => ({
    id: m.organization.id,
    name: m.organization.name,
    slug: m.organization.slug,
    logoUrl: m.organization.logo_url,
    role: m.role,
  }));

  // 3. Determine active organization from cookie or default to the first one
  const cookieStore = await cookies();
  const activeOrgCookieId = cookieStore.get('apploye_active_org_id')?.value;

  const currentOrg =
    userOrganizations.find((org) => org.id === activeOrgCookieId) ||
    userOrganizations[0];

  // 4. Fetch user profile record
  const { data: profile } = await supabase
    .from('users')
    .select('id, email, full_name, avatar_url')
    .eq('id', user.id)
    .single();

  const userProfile = {
    id: user.id,
    email: user.email ?? profile?.email ?? '',
    fullName: profile?.full_name ?? user.user_metadata?.full_name ?? 'Team Member',
    avatarUrl: profile?.avatar_url,
  };

  return (
    <OrgProvider initialOrg={currentOrg} userOrganizations={userOrganizations}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased selection:bg-indigo-500 selection:text-white">
        {/* Persistent Sidebar */}
        <DashboardSidebar user={userProfile} />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>
    </OrgProvider>
  );
}
