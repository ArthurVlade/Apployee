'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { updateInvoiceStatus } from '@/actions/invoices';
import { CreateInvoiceModal } from './create-invoice-modal';
import {
  FileText,
  Plus,
  DollarSign,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Send,
  Check,
  Search,
  Filter,
  ArrowUpRight,
  Printer
} from 'lucide-react';

export interface InvoiceItemSummary {
  id: string;
  invoiceNumber: string;
  clientName: string;
  issueDate: string;
  dueDate: string;
  currency: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'VOID' | 'OVERDUE';
  itemsCount: number;
}

interface InvoicesClientProps {
  invoices: InvoiceItemSummary[];
  clients: { id: string; name: string; currency: string }[];
  projects: { id: string; name: string; clientId?: string | null; billingRate?: number | null }[];
}

export function InvoicesClient({ invoices, clients, projects }: InvoicesClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const handleStatusChange = async (
    invoiceId: string,
    newStatus: 'DRAFT' | 'SENT' | 'PAID' | 'VOID'
  ) => {
    setUpdatingId(invoiceId);
    try {
      await updateInvoiceStatus(invoiceId, newStatus);
    } finally {
      setUpdatingId(null);
    }
  };

  // Metrics
  const totalBilled = invoices.reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalPaid = invoices
    .filter((inv) => inv.status === 'PAID')
    .reduce((acc, inv) => acc + inv.totalAmount, 0);
  const totalOutstanding = invoices
    .filter((inv) => inv.status === 'SENT' || inv.status === 'OVERDUE')
    .reduce((acc, inv) => acc + inv.totalAmount, 0);

  // Filtered invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      inv.clientName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Client Invoices</h1>
          <p className="text-xs text-slate-400 mt-1">
            Automate invoicing from tracked billable hours, review payment statuses, and bill clients.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 flex items-center gap-2 self-start sm:self-auto transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Invoice</span>
        </button>
      </div>

      {/* 2. Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase">Total Billed</span>
            <DollarSign className="w-4 h-4 text-slate-500" />
          </div>
          <span className="text-2xl font-extrabold text-white font-mono mt-1 block">
            {formatCurrency(totalBilled)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Across {invoices.length} total invoices
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-emerald-400">
            <span className="text-xs font-semibold uppercase">Paid Volume</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-extrabold text-emerald-400 font-mono mt-1 block">
            {formatCurrency(totalPaid)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {invoices.filter((i) => i.status === 'PAID').length} paid invoices
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between text-amber-400">
            <span className="text-xs font-semibold uppercase">Outstanding Due</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-extrabold text-amber-400 font-mono mt-1 block">
            {formatCurrency(totalOutstanding)}
          </span>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Awaiting client remittance
          </span>
        </div>
      </div>

      {/* 3. Search and Status Filtering */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by invoice number or client name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'DRAFT', 'SENT', 'PAID', 'OVERDUE'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Invoices Table */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-xl">
        {filteredInvoices.length === 0 ? (
          <div className="p-12 text-center">
            <div className="h-12 w-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500 mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-white">No invoices found</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Generate an invoice from approved team timesheets to begin billing clients.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Generate First Invoice</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-semibold">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Client</th>
                  <th className="py-3 px-4">Issue / Due Date</th>
                  <th className="py-3 px-4">Items</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {filteredInvoices.map((inv) => {
                  const statusColors: Record<string, string> = {
                    DRAFT: 'bg-slate-800 text-slate-300 border-slate-700',
                    SENT: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
                    PAID: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    OVERDUE: 'bg-red-500/10 text-red-400 border-red-500/20',
                    VOID: 'bg-slate-800 text-slate-500 border-slate-700',
                  };

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-semibold text-white">
                        <Link
                          href={`/dashboard/admin/invoices/${inv.id}`}
                          className="hover:text-indigo-400 transition-colors flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span>{inv.invoiceNumber}</span>
                        </Link>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-200">
                        {inv.clientName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 font-mono">
                        <div>{inv.issueDate}</div>
                        <div className="text-[10px] text-slate-500">Due: {inv.dueDate}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {inv.itemsCount} line {inv.itemsCount === 1 ? 'item' : 'items'}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-white text-sm">
                        {formatCurrency(inv.totalAmount, inv.currency)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider border ${
                            statusColors[inv.status] || statusColors.DRAFT
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {inv.status === 'DRAFT' && (
                            <button
                              onClick={() => handleStatusChange(inv.id, 'SENT')}
                              disabled={updatingId === inv.id}
                              title="Mark as Sent to Client"
                              className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition-colors"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {inv.status !== 'PAID' && (
                            <button
                              onClick={() => handleStatusChange(inv.id, 'PAID')}
                              disabled={updatingId === inv.id}
                              title="Mark as Paid"
                              className="p-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-colors"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <Link
                            href={`/dashboard/admin/invoices/${inv.id}`}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                            title="View Printable Invoice"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <CreateInvoiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        clients={clients}
        projects={projects}
      />
    </div>
  );
}
