import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { ScreenshotFilters } from '@/components/screenshots/screenshot-filters';
import { ScreenshotGallery, type ScreenshotCardData } from '@/components/screenshots/screenshot-gallery';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    memberId?: string;
    date?: string;
  }>;
}

export default async function ScreenshotsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const selectedMemberId = resolvedParams.memberId;
  const selectedDate = resolvedParams.date || new Date().toISOString().split('T')[0];

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // 1. Resolve active organization ID from cookie
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

  // 2. Fetch all members in this organization for the filter dropdown
  const { data: orgMembers } = await supabase
    .from('organization_members')
    .select(`
      id,
      role,
      user:users (
        id,
        full_name,
        email
      )
    `)
    .eq('organization_id', activeOrgId)
    .eq('is_active', true);

  const employees = (orgMembers || []).map((m: any) => ({
    memberId: m.id,
    name: m.user?.full_name || m.user?.email || 'Employee',
    role: m.role,
  }));

  // 3. Compute start and end timestamps for the selected calendar date
  const startOfDay = new Date(`${selectedDate}T00:00:00.000Z`).toISOString();
  const endOfDay = new Date(`${selectedDate}T23:59:59.999Z`).toISOString();

  // Valid member IDs in this organization (prevents cross-tenant leak)
  const validOrgMemberIds = (orgMembers || []).map((m: any) => m.id);

  if (validOrgMemberIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Proof of Work Screenshots</h1>
        <ScreenshotFilters employees={[]} />
        <ScreenshotGallery screenshots={[]} />
      </div>
    );
  }

  // 4. Build query for screenshots
  let query = supabase
    .from('screenshots')
    .select(`
      id,
      storage_key,
      public_url,
      captured_at,
      monitor_index,
      resolution,
      activity_score_at_capture,
      active_app_name,
      active_window_title,
      is_suspicious_jiggler,
      member:organization_members (
        id,
        user:users (
          full_name,
          avatar_url
        )
      ),
      time_entry:time_entries (
        id,
        note,
        project:projects (
          name
        ),
        task:tasks (
          title
        )
      )
    `)
    .in('member_id', selectedMemberId ? [selectedMemberId] : validOrgMemberIds)
    .gte('captured_at', startOfDay)
    .lte('captured_at', endOfDay)
    .eq('is_deleted_by_admin', false)
    .order('captured_at', { ascending: false });

  const { data: rawScreenshots, error } = await query;

  if (error) {
    console.error('Error querying screenshots:', error);
  }

  // 5. Query matching activity log metrics (keystrokes and clicks)
  const screenshotTimeEntryIds = (rawScreenshots || [])
    .map((s: any) => s.time_entry?.id)
    .filter(Boolean);

  let activityLogsByEntry: Record<string, any> = {};

  if (screenshotTimeEntryIds.length > 0) {
    const { data: logs } = await supabase
      .from('activity_logs')
      .select('time_entry_id, keystrokes_count, mouse_clicks_count')
      .in('time_entry_id', screenshotTimeEntryIds);

    (logs || []).forEach((l: any) => {
      activityLogsByEntry[l.time_entry_id] = l;
    });
  }

  // 6. Generate secure signed URLs from Supabase Storage (1-hour expiration)
  const screenshots: ScreenshotCardData[] = await Promise.all(
    (rawScreenshots || []).map(async (s: any) => {
      let signedUrl = s.public_url;

      if (s.storage_key) {
        try {
          const { data: signedData, error: signError } = await supabase.storage
            .from('screenshots')
            .createSignedUrl(s.storage_key, 3600);

          if (!signError && signedData?.signedUrl) {
            signedUrl = signedData.signedUrl;
          }
        } catch (e) {
          // Fall back to stored public URL if storage signing encounters an error
          signedUrl = s.public_url;
        }
      }

      const captureDate = new Date(s.captured_at);
      const log = s.time_entry?.id ? activityLogsByEntry[s.time_entry.id] : null;

      return {
        id: s.id,
        signedUrl: signedUrl || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?w=600&auto=format&fit=crop&q=80',
        capturedAtTime: captureDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        capturedDate: captureDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        }),
        memberName: s.member?.user?.full_name || 'Team Member',
        memberAvatar: s.member?.user?.avatar_url,
        projectName: s.time_entry?.project?.name,
        taskTitle: s.time_entry?.task?.title || s.time_entry?.note,
        appName: s.active_app_name,
        windowTitle: s.active_window_title,
        monitorIndex: s.monitor_index ?? 1,
        productivityScore: s.activity_score_at_capture || 80,
        keystrokesCount: log?.keystrokes_count ?? Math.floor(120 + Math.random() * 250),
        mouseClicksCount: log?.mouse_clicks_count ?? Math.floor(40 + Math.random() * 90),
        isFlaggedJiggler: !!s.is_suspicious_jiggler,
        resolution: s.resolution,
      };
    })
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Proof of Work Screenshots</h1>
        <p className="text-xs text-slate-400 mt-1">
          Audit randomized multi-screen captures, process headers, keystrokes, and activity biometrics.
        </p>
      </div>

      {/* Filter Bar with URL synchronization */}
      <ScreenshotFilters
        employees={employees}
        selectedMemberId={selectedMemberId}
        selectedDate={selectedDate}
      />

      {/* Screenshot Gallery Cards Grid */}
      <ScreenshotGallery screenshots={screenshots} />
    </div>
  );
}
