import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { RealtimeBoard, type LiveFeedMember } from '@/components/live-feed/realtime-board';

export const dynamic = 'force-dynamic';

export default async function LiveFeedPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get active organization from cookie or resolve user's primary org
  const cookieStore = await cookies();
  let activeOrgId = cookieStore.get('apploye_active_org_id')?.value;

  if (!activeOrgId) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!membership) {
      redirect('/onboarding');
    }
    activeOrgId = membership.organization_id;
  }

  // 1. Fetch organization members with joined user profiles
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select(`
      id,
      user_id,
      role,
      stealth_mode_override,
      user:users (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('organization_id', activeOrgId)
    .eq('is_active', true);

  if (membersError) {
    console.error('Error fetching organization members:', membersError);
  }

  // Compute start of day in UTC
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const startOfDayIso = today.toISOString();

  // 2. Query today's time entries and current active session
  const memberIds = (members || []).map((m: any) => m.id);

  const { data: todayEntries } = await supabase
    .from('time_entries')
    .select(`
      id,
      member_id,
      start_time,
      end_time,
      duration_seconds,
      note,
      project:projects (
        name
      ),
      task:tasks (
        title
      )
    `)
    .in('member_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'])
    .gte('start_time', startOfDayIso)
    .order('start_time', { ascending: false });

  // 3. Query latest activity log per member for today
  const { data: latestLogs } = await supabase
    .from('activity_logs')
    .select('member_id, productivity_percentage, block_start_time')
    .in('member_id', memberIds.length > 0 ? memberIds : ['00000000-0000-0000-0000-000000000000'])
    .gte('block_start_time', startOfDayIso)
    .order('block_start_time', { ascending: false });

  // Map into typed LiveFeedMember array
  const initialMembers: LiveFeedMember[] = (members || []).map((m: any) => {
    const userProfile = m.user;
    const memberEntries = (todayEntries || []).filter((e: any) => e.member_id === m.id);
    
    // Active session is an entry with no end_time
    const activeEntry = memberEntries.find((e: any) => !e.end_time);
    const latestCompletedEntry = memberEntries[0];

    // Compute total seconds today
    const totalSecondsToday = memberEntries.reduce(
      (acc: number, cur: any) => acc + (cur.duration_seconds || 0),
      0
    );

    // Productivity score from most recent 10-minute block
    const memberLog = (latestLogs || []).find((l: any) => l.member_id === m.id);
    const productivityScore = memberLog
      ? Math.round(Number(memberLog.productivity_percentage || 0))
      : 85; // Fallback baseline

    return {
      memberId: m.id,
      userId: m.user_id,
      fullName: userProfile?.full_name || 'Team Member',
      email: userProfile?.email || '',
      avatarUrl: userProfile?.avatar_url,
      role: m.role,
      isOnline: !!activeEntry,
      currentTaskTitle: activeEntry?.task?.title || activeEntry?.note || latestCompletedEntry?.task?.title || null,
      currentProjectName: activeEntry?.project?.name || latestCompletedEntry?.project?.name || null,
      currentEntryId: activeEntry?.id || null,
      secondsTrackedToday: totalSecondsToday,
      lastProductivityScore: productivityScore,
      stealthMode: !!m.stealth_mode_override,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Live Attendance & Activity Feed</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time multi-tenant dashboard monitor powered by Supabase WebSocket subscriptions.
          </p>
        </div>
      </div>

      <RealtimeBoard initialMembers={initialMembers} organizationId={activeOrgId} />
    </div>
  );
}
