import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { BillingClient } from '@/components/billing/billing-client';

export const dynamic = 'force-dynamic';

export default async function BillingPage() {
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

  // 1. Fetch organization details
  const { data: org, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      subscription_status,
      plan,
      seats_allocated,
      trial_ends_at,
      stripe_customer_id,
      owner_id
    `)
    .eq('id', activeOrgId)
    .single();

  if (error || !org) {
    redirect('/dashboard');
  }

  // 2. Count active team members to calculate seat utilization
  const { count: membersCount } = await supabase
    .from('organization_members')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', activeOrgId)
    .eq('is_active', true);

  return (
    <BillingClient
      organization={{
        id: org.id,
        name: org.name,
        subscriptionStatus: org.subscription_status || 'TRIALING',
        plan: org.plan || 'STANDARD',
        seatsAllocated: org.seats_allocated || 5,
        trialEndsAt: org.trial_ends_at,
        stripeCustomerId: org.stripe_customer_id,
      }}
      activeMembersCount={membersCount || 1}
    />
  );
}
