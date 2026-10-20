// app/(super-admin)/organizations/page.tsx
import React from 'react';
import Link from 'next/link';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import {
  suspendTenant,
  overrideStripePlan,
  deleteTenant,
} from '@/actions/super-admin';
import {
  Building2,
  ShieldAlert,
  Users,
  CreditCard,
  Trash2,
  Ban,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  SlidersHorizontal,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export interface TenantRow {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  created_at: string;
  owner: {
    id: string;
    email: string;
    full_name: string;
  } | null;
  seat_count: number;
}

export default async function SuperAdminOrganizationsPage() {
  // Verify super admin authorization in server component
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/login?redirectedFrom=/organizations');
  }

  // Check super admin status
  const adminClient = createAdminClient();
  const { data: profile } = await adminClient
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_super_admin) {
    redirect('/dashboard');
  }

  // Fetch all organizations bypassing RLS using the service role adminClient
  const { data: rawOrgs, error: orgsError } = await adminClient
    .from('organizations')
    .select(`
      id,
      name,
      slug,
      plan,
      status,
      created_at,
      owner_id,
      users!organizations_owner_id_fkey (
        id,
        email,
        full_name
      ),
      organization_members (
        id,
        is_active
      )
    `)
    .order('created_at', { ascending: false });

  if (orgsError) {
    console.error('[SuperAdmin] Failed to query organizations:', orgsError);
  }

  const organizations: TenantRow[] = (rawOrgs || []).map((org: any) => ({
    id: org.id,
    name: org.name,
    slug: org.slug,
    plan: org.plan || 'Free',
    status: org.status || 'active',
    created_at: org.created_at,
    owner: org.users
      ? {
          id: org.users.id,
          email: org.users.email,
          full_name: org.users.full_name,
        }
      : null,
    seat_count: Array.isArray(org.organization_members)
      ? org.organization_members.length
      : 0,
  }));

  return (
    <div className="min-h-screen bg-[#f6f5f4] text-[#000000] font-sans p-6 sm:p-10 space-y-8">
      {/* Top Header */}
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.08] pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-red-600" />
            <span>God-Mode Administration &bull; RLS Bypassed</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-black">
            Global Tenant Manager
          </h1>
          <p className="text-xs text-[#615d59] mt-1">
            Platform-wide governance across all active, trial, and suspended organizations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="px-4 py-2 rounded-lg bg-white border border-black/[0.08] hover:border-black/[0.2] text-xs font-medium text-black transition-colors"
          >
            Exit to Standard Dashboard
          </Link>
        </div>
      </div>

      {/* Overview Metrics */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-black/[0.08] rounded-xl p-5 space-y-1">
          <span className="text-[11px] font-semibold uppercase text-[#757575]">Total Tenants</span>
          <div className="text-2xl font-bold text-black">{organizations.length}</div>
        </div>

        <div className="bg-white border border-black/[0.08] rounded-xl p-5 space-y-1">
          <span className="text-[11px] font-semibold uppercase text-[#757575]">Active Seats</span>
          <div className="text-2xl font-bold text-black">
            {organizations.reduce((acc, o) => acc + o.seat_count, 0)}
          </div>
        </div>

        <div className="bg-white border border-black/[0.08] rounded-xl p-5 space-y-1">
          <span className="text-[11px] font-semibold uppercase text-[#757575]">Enterprise Tenants</span>
          <div className="text-2xl font-bold text-black">
            {organizations.filter((o) => o.plan.toLowerCase() === 'enterprise').length}
          </div>
        </div>

        <div className="bg-white border border-black/[0.08] rounded-xl p-5 space-y-1">
          <span className="text-[11px] font-semibold uppercase text-[#757575]">Suspended Tenants</span>
          <div className="text-2xl font-bold text-red-600">
            {organizations.filter((o) => o.status.toLowerCase() === 'suspended').length}
          </div>
        </div>
      </div>

      {/* Tenant Table */}
      <div className="max-w-7xl mx-auto bg-white border border-black/[0.08] rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-black/[0.06] flex items-center justify-between">
          <h2 className="text-sm font-bold text-black">All Registered Organizations</h2>
          <span className="text-xs text-[#757575]">{organizations.length} organizations loaded</span>
        </div>

        {organizations.length === 0 ? (
          <div className="text-center py-16 text-xs text-[#757575]">
            No organizations registered in the platform yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#f6f5f4] text-[#757575] font-semibold border-b border-black/[0.06]">
                <tr>
                  <th className="py-3 px-4">Tenant Name</th>
                  <th className="py-3 px-4">Owner Email</th>
                  <th className="py-3 px-4">Active Seats</th>
                  <th className="py-3 px-4">Stripe Plan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Administrative Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.06]">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-[#f6f5f4]/50 transition-colors">
                    {/* Tenant Name */}
                    <td className="py-3.5 px-4 font-semibold text-black">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-[#0075de]" />
                        <div>
                          <div className="font-bold text-black">{org.name}</div>
                          <div className="text-[11px] text-[#757575] font-mono">{org.slug}</div>
                        </div>
                      </div>
                    </td>

                    {/* Owner */}
                    <td className="py-3.5 px-4">
                      {org.owner ? (
                        <div>
                          <div className="font-medium text-black">{org.owner.full_name || 'Owner'}</div>
                          <div className="text-[11px] text-[#615d59]">{org.owner.email}</div>
                        </div>
                      ) : (
                        <span className="text-[#757575] italic">Unassigned</span>
                      )}
                    </td>

                    {/* Seats */}
                    <td className="py-3.5 px-4 font-mono font-medium text-black">
                      {org.seat_count} {org.seat_count === 1 ? 'member' : 'members'}
                    </td>

                    {/* Stripe Plan */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-blue-100 text-blue-800">
                        {org.plan}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {org.status === 'suspended' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-100 text-red-800">
                          <Ban className="w-3 h-3 text-red-600" />
                          Suspended
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Active
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Override Plan Form */}
                        <form
                          action={async (formData: FormData) => {
                            'use server';
                            const targetPlan = formData.get('plan') as string;
                            await overrideStripePlan(org.id, targetPlan);
                          }}
                          className="inline-flex items-center gap-1"
                        >
                          <select
                            name="plan"
                            defaultValue={org.plan.toLowerCase()}
                            className="bg-[#f6f5f4] border border-black/[0.08] rounded px-2 py-1 text-[11px] text-black focus:outline-none"
                          >
                            <option value="free">Free</option>
                            <option value="standard">Standard</option>
                            <option value="enterprise">Enterprise</option>
                          </select>
                          <button
                            type="submit"
                            title="Override subscription tier"
                            className="p-1 rounded bg-[#f6f5f4] hover:bg-[#e6f3fe] text-[#0075de] border border-black/[0.08]"
                          >
                            <RefreshCw className="w-3 h-3" />
                          </button>
                        </form>

                        {/* Suspend Action */}
                        <form
                          action={async () => {
                            'use server';
                            await suspendTenant(org.id);
                          }}
                        >
                          <button
                            type="submit"
                            title="Suspend organization and lockout members"
                            className="p-1.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200"
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </button>
                        </form>

                        {/* Delete Action */}
                        <form
                          action={async () => {
                            'use server';
                            await deleteTenant(org.id);
                          }}
                        >
                          <button
                            type="submit"
                            title="Permanently wipe organization"
                            className="p-1.5 rounded bg-red-50 hover:bg-red-100 text-red-700 border border-red-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
