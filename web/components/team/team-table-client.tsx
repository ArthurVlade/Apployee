'use client';

import React, { useState } from 'react';
import { updateMemberRole, removeMember } from '@/actions/team';
import { InviteMemberModal } from './invite-member-modal';
import {
  UserPlus,
  Shield,
  Trash2,
  MoreVertical,
  Check,
  DollarSign,
  Calendar,
  AlertCircle
} from 'lucide-react';

export interface TeamMemberRow {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  avatarUrl?: string | null;
  role: 'ORG_OWNER' | 'MANAGER' | 'MEMBER';
  jobTitle?: string | null;
  hourlyPayRate: number;
  isActive: boolean;
  joinedAt: string;
}

interface TeamTableClientProps {
  members: TeamMemberRow[];
  currentUserRole: string;
}

export function TeamTableClient({ members, currentUserRole }: TeamTableClientProps) {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const handleRoleChange = async (memberId: string, newRole: any) => {
    setUpdatingId(memberId);
    try {
      await updateMemberRole(memberId, newRole);
    } catch (err) {
      console.error('Failed to update role:', err);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (memberId: string) => {
    if (confirm('Are you sure you want to remove this member from the organization?')) {
      await removeMember(memberId);
    }
  };

  const canEdit = currentUserRole === 'ORG_OWNER';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Team Members & Permissions</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage your organization members, assign roles, and configure individual hourly rates.
          </p>
        </div>

        <button
          onClick={() => setIsInviteOpen(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite New Member</span>
        </button>
      </div>

      {/* Team Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-5">Member</th>
                <th className="py-3.5 px-5">Role</th>
                <th className="py-3.5 px-5">Job Title</th>
                <th className="py-3.5 px-5">Hourly Rate</th>
                <th className="py-3.5 px-5">Status</th>
                <th className="py-3.5 px-5">Joined</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-slate-800/40 transition-colors">
                  {/* Member Name and Email */}
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-3">
                      {member.avatarUrl ? (
                        <img
                          src={member.avatarUrl}
                          alt={member.fullName}
                          className="w-9 h-9 rounded-full object-cover border border-slate-700"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs">
                          {member.fullName.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-slate-200 block text-xs">
                          {member.fullName}
                        </span>
                        <span className="text-slate-400 text-[11px] font-mono">
                          {member.email}
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* Role Dropdown */}
                  <td className="py-4 px-5">
                    {canEdit ? (
                      <select
                        value={member.role}
                        disabled={updatingId === member.id}
                        onChange={(e) => handleRoleChange(member.id, e.target.value)}
                        className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
                      >
                        <option value="MEMBER">Member</option>
                        <option value="MANAGER">Manager</option>
                        <option value="ORG_OWNER">Org Owner</option>
                      </select>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono text-[10px] font-semibold border border-slate-700">
                        {member.role}
                      </span>
                    )}
                  </td>

                  {/* Job Title */}
                  <td className="py-4 px-5 text-slate-300">
                    {member.jobTitle || '—'}
                  </td>

                  {/* Hourly Pay Rate */}
                  <td className="py-4 px-5 font-mono text-slate-300">
                    ${member.hourlyPayRate.toFixed(2)}/hr
                  </td>

                  {/* Status Badge */}
                  <td className="py-4 px-5">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        member.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          member.isActive ? 'bg-emerald-400' : 'bg-slate-500'
                        }`}
                      />
                      <span>{member.isActive ? 'Active' : 'Archived'}</span>
                    </span>
                  </td>

                  {/* Joined Date */}
                  <td className="py-4 px-5 text-slate-400 text-[11px]">
                    {new Date(member.joinedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>

                  {/* Action buttons */}
                  <td className="py-4 px-5 text-right">
                    {canEdit && member.role !== 'ORG_OWNER' && (
                      <button
                        onClick={() => handleRemove(member.id)}
                        title="Remove member"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <InviteMemberModal isOpen={isInviteOpen} onClose={() => setIsInviteOpen(false)} />
    </div>
  );
}
