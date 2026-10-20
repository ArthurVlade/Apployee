import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { TimesheetTable, type TimesheetEntryRow } from '@/components/timesheets/timesheet-table';

export const dynamic = 'force-dynamic';

export default async function TimesheetsPage() {
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

  // 2. Fetch all members belonging to this organization to enforce tenant scoping
  const { data: orgMembers } = await supabase
    .from('organization_members')
    .select('id')
    .eq('organization_id', activeOrgId)
    .eq('is_active', true);

  const validMemberIds = (orgMembers || []).map((m: any) => m.id);

  if (validMemberIds.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">Timesheets & Approvals</h1>
        <TimesheetTable entries={[]} />
      </div>
    );
  }

  // 3. Query time entries strictly for members of this organization
  const { data: rawEntries, error } = await supabase
    .from('time_entries')
    .select(`
      id,
      start_time,
      end_time,
      duration_seconds,
      entry_type,
      is_manual,
      approval_status,
      manual_reason,
      note,
      member:organization_members (
        id,
        user:users (
          full_name,
          email,
          avatar_url
        )
      ),
      project:projects (
        name
      ),
      task:tasks (
        title
      )
    `)
    .in('member_id', validMemberIds)
    .order('start_time', { ascending: false })
    .limit(150);

  if (error) {
    console.error('Error querying timesheets:', error);
  }

  // 4. Format entries for DataTable
  const entries: TimesheetEntryRow[] = (rawEntries || []).map((e: any) => {
    const startDate = new Date(e.start_time);
    const endDate = e.end_time ? new Date(e.end_time) : null;
    const durationSec = e.duration_seconds || 0;

    const hours = Math.floor(durationSec / 3600);
    const minutes = Math.floor((durationSec % 3600) / 60);

    return {
      id: e.id,
      employeeName: e.member?.user?.full_name || 'Team Member',
      employeeEmail: e.member?.user?.email || '',
      employeeAvatar: e.member?.user?.avatar_url,
      projectName: e.project?.name || 'General Workspace',
      taskTitle: e.task?.title || e.note || 'General Work Session',
      dateFormatted: startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      }),
      startTimeFormatted: startDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      endTimeFormatted: endDate
        ? endDate.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
          })
        : 'In Progress',
      totalDuration: `${hours}h ${minutes}m`,
      durationSeconds: durationSec,
      entryType: e.entry_type,
      status: e.approval_status || 'APPROVED',
      isManual: !!e.is_manual,
      manualReason: e.manual_reason,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-white">Timesheets & Approvals</h1>
        <p className="text-xs text-slate-400 mt-1">
          Review daily work durations, audit offline reasons, and approve or reject manual requests.
        </p>
      </div>

      <TimesheetTable entries={entries} />
    </div>
  );
}
