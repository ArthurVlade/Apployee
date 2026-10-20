'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export interface InvoiceActionResult {
  error?: string;
  success?: boolean;
  invoiceId?: string;
  message?: string;
}

/**
 * Automatically calculates billable hours and drafts a client invoice.
 */
export async function generateInvoice(
  prevState: InvoiceActionResult | null,
  formData: FormData
): Promise<InvoiceActionResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized.' };
  }

  const cookieStore = await cookies();
  const activeOrgId = cookieStore.get('apploye_active_org_id')?.value;

  if (!activeOrgId) {
    return { error: 'No active organization found.' };
  }

  const clientId = formData.get('clientId') as string;
  const projectId = (formData.get('projectId') as string) || null;
  const startDate = formData.get('startDate') as string;
  const endDate = formData.get('endDate') as string;
  const taxPercent = parseFloat((formData.get('taxPercent') as string) || '0.00');

  if (!clientId || !startDate || !endDate) {
    return { error: 'Please select a Client and valid date window.' };
  }

  // 1. Fetch Client info
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('id, name, currency')
    .eq('id', clientId)
    .eq('organization_id', activeOrgId)
    .single();

  if (clientErr || !client) {
    return { error: 'Selected client was not found.' };
  }

  // 2. Fetch projects matching this client
  let projectQuery = supabase
    .from('projects')
    .select('id, name, billing_rate, is_billable')
    .eq('organization_id', activeOrgId)
    .eq('client_id', clientId);

  if (projectId && projectId !== 'all') {
    projectQuery = projectQuery.eq('id', projectId);
  }

  const { data: clientProjects } = await projectQuery;
  const validProjectIds = (clientProjects || []).map((p) => p.id);

  if (validProjectIds.length === 0) {
    return { error: 'No projects found for the selected client.' };
  }

  // 3. Query unbilled approved time entries within the date window
  const startIso = new Date(`${startDate}T00:00:00.000Z`).toISOString();
  const endIso = new Date(`${endDate}T23:59:59.999Z`).toISOString();

  const { data: timeEntries, error: entriesErr } = await supabase
    .from('time_entries')
    .select(`
      id,
      project_id,
      task_id,
      duration_seconds,
      hourly_rate,
      note,
      project:projects (
        name,
        billing_rate
      ),
      task:tasks (
        title
      )
    `)
    .in('project_id', validProjectIds)
    .gte('start_time', startIso)
    .lte('start_time', endIso)
    .eq('approval_status', 'APPROVED');

  if (entriesErr) {
    return { error: `Failed to query time entries: ${entriesErr.message}` };
  }

  if (!timeEntries || timeEntries.length === 0) {
    return {
      error: 'No approved billable time entries found for this client and date range.',
    };
  }

  // 4. Safe monetary calculations (integer cents)
  // Aggregate items grouped by Project & Task
  const groupedItems: Record<
    string,
    {
      description: string;
      totalSeconds: number;
      rateCents: number;
      timeEntryIds: string[];
    }
  > = {};

  for (const entry of timeEntries) {
    const projName = (entry.project as any)?.name || 'Project';
    const taskName = (entry.task as any)?.title || entry.note || 'Work';
    const rate = Number((entry.project as any)?.billing_rate || entry.hourly_rate || 50.0);
    const rateCents = Math.round(rate * 100);

    const key = `${projName}:::${taskName}:::${rateCents}`;

    if (!groupedItems[key]) {
      groupedItems[key] = {
        description: `${projName} — ${taskName}`,
        totalSeconds: 0,
        rateCents,
        timeEntryIds: [],
      };
    }

    groupedItems[key].totalSeconds += entry.duration_seconds || 0;
    groupedItems[key].timeEntryIds.push(entry.id);
  }

  let subtotalCents = 0;
  const lineItemsToInsert: {
    description: string;
    quantity_hours: number;
    unit_price: number;
    total_amount: number;
  }[] = [];

  for (const key of Object.keys(groupedItems)) {
    const item = groupedItems[key];
    const hours = item.totalSeconds / 3600;
    const roundedHours = Math.round(hours * 100) / 100;
    const lineItemTotalCents = Math.round((item.rateCents * item.totalSeconds) / 3600);

    subtotalCents += lineItemTotalCents;

    lineItemsToInsert.push({
      description: item.description,
      quantity_hours: roundedHours,
      unit_price: item.rateCents / 100,
      total_amount: lineItemTotalCents / 100,
    });
  }

  const taxCents = Math.round((subtotalCents * taxPercent) / 100);
  const totalCents = subtotalCents + taxCents;

  const invoiceNumber = `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // 5. Insert Invoice record
  const { data: newInvoice, error: invError } = await supabase
    .from('invoices')
    .insert({
      organization_id: activeOrgId,
      client_id: clientId,
      invoice_number: invoiceNumber,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: dueDate,
      currency: client.currency || 'USD',
      subtotal: (subtotalCents / 100).toFixed(2),
      tax_rate_percent: taxPercent.toFixed(2),
      tax_amount: (taxCents / 100).toFixed(2),
      total_amount: (totalCents / 100).toFixed(2),
      status: 'SENT',
      notes: `Billing for period ${startDate} to ${endDate}.`,
    })
    .select('id')
    .single();

  if (invError) {
    console.error('Error inserting invoice:', invError);
    return { error: invError.message };
  }

  // 6. Insert Line Items
  const itemsWithInvoiceId = lineItemsToInsert.map((item) => ({
    ...item,
    invoice_id: newInvoice.id,
  }));

  const { error: itemsErr } = await supabase.from('invoice_items').insert(itemsWithInvoiceId);
  if (itemsErr) {
    console.error('Error inserting invoice items:', itemsErr);
  }

  revalidatePath('/dashboard/admin/invoices');
  return {
    success: true,
    invoiceId: newInvoice.id,
    message: `Invoice ${invoiceNumber} created successfully! Total: $${(totalCents / 100).toFixed(2)}`,
  };
}

/**
 * Updates status of an invoice.
 */
export async function updateInvoiceStatus(
  invoiceId: string,
  newStatus: 'DRAFT' | 'SENT' | 'PAID' | 'VOID'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  const { error } = await supabase
    .from('invoices')
    .update({
      status: newStatus,
      paid_at: newStatus === 'PAID' ? new Date().toISOString() : null,
    })
    .eq('id', invoiceId);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/dashboard/admin/invoices');
  return { success: true };
}
