import React from 'react';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';
import { InvoiceDetailView } from '@/components/invoices/invoice-detail-view';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function InvoiceDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('apploye_active_org_id')?.value;

  // 1. Fetch Invoice with Client and Organization
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      id,
      organization_id,
      invoice_number,
      issue_date,
      due_date,
      currency,
      subtotal,
      tax_rate_percent,
      tax_amount,
      total_amount,
      status,
      notes,
      paid_at,
      organization:organizations (
        id,
        name,
        slug,
        currency
      ),
      client:clients (
        id,
        name,
        email,
        address,
        currency
      ),
      items:invoice_items (
        id,
        description,
        quantity_hours,
        unit_price,
        total_amount
      )
    `)
    .eq('id', id)
    .single();

  if (error || !invoice) {
    notFound();
  }

  // Security check: must belong to the active org
  if (activeOrgId && invoice.organization_id !== activeOrgId) {
    redirect('/dashboard/admin/invoices');
  }

  return <InvoiceDetailView invoice={invoice as any} />;
}
