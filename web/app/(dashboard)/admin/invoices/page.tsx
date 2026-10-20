import React from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { InvoicesClient, type InvoiceItemSummary } from '@/components/invoices/invoices-client';

export const dynamic = 'force-dynamic';

export default async function InvoicesPage() {
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

  // 1. Fetch Invoices for this organization
  const { data: rawInvoices, error: invErr } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      issue_date,
      due_date,
      currency,
      subtotal,
      tax_amount,
      total_amount,
      status,
      client:clients (
        id,
        name,
        currency
      ),
      items:invoice_items (
        id
      )
    `)
    .eq('organization_id', activeOrgId)
    .order('created_at', { ascending: false });

  if (invErr) {
    console.error('Error fetching invoices:', invErr);
  }

  // 2. Fetch Clients for creation modal
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, currency')
    .eq('organization_id', activeOrgId)
    .order('name');

  // 3. Fetch Projects for creation modal
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name, client_id, billing_rate')
    .eq('organization_id', activeOrgId)
    .eq('is_archived', false)
    .order('name');

  const invoices: InvoiceItemSummary[] = (rawInvoices || []).map((inv: any) => ({
    id: inv.id,
    invoiceNumber: inv.invoice_number,
    clientName: inv.client?.name || 'Unknown Client',
    issueDate: inv.issue_date,
    dueDate: inv.due_date,
    currency: inv.currency || 'USD',
    subtotal: Number(inv.subtotal || 0),
    taxAmount: Number(inv.tax_amount || 0),
    totalAmount: Number(inv.total_amount || 0),
    status: inv.status || 'DRAFT',
    itemsCount: inv.items?.length || 0,
  }));

  const clientOptions = (clients || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    currency: c.currency || 'USD',
  }));

  const projectOptions = (projects || []).map((p: any) => ({
    id: p.id,
    name: p.name,
    clientId: p.client_id,
    billingRate: p.billing_rate,
  }));

  return (
    <InvoicesClient
      invoices={invoices}
      clients={clientOptions}
      projects={projectOptions}
    />
  );
}
