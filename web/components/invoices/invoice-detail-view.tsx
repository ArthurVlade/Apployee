'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { updateInvoiceStatus } from '@/actions/invoices';
import {
  FileText,
  ArrowLeft,
  Printer,
  CheckCircle2,
  Send,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  User,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface InvoiceDetailViewProps {
  invoice: {
    id: string;
    organization_id: string;
    invoice_number: string;
    issue_date: string;
    due_date: string;
    currency: string;
    subtotal: string | number;
    tax_rate_percent: string | number;
    tax_amount: string | number;
    total_amount: string | number;
    status: 'DRAFT' | 'SENT' | 'PAID' | 'VOID' | 'OVERDUE';
    notes?: string | null;
    paid_at?: string | null;
    organization?: {
      name: string;
      slug: string;
    };
    client?: {
      name: string;
      email?: string | null;
      address?: string | null;
    };
    items?: {
      id: string;
      description: string;
      quantity_hours: number;
      unit_price: number;
      total_amount: number;
    }[];
  };
}

export function InvoiceDetailView({ invoice }: InvoiceDetailViewProps) {
  const [currentStatus, setCurrentStatus] = useState(invoice.status);
  const [isUpdating, setIsUpdating] = useState(false);

  const formatCurrency = (val: number | string) => {
    const num = typeof val === 'string' ? parseFloat(val) : val;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: invoice.currency || 'USD',
    }).format(num || 0);
  };

  const handleStatusChange = async (newStatus: 'DRAFT' | 'SENT' | 'PAID' | 'VOID') => {
    setIsUpdating(true);
    try {
      await updateInvoiceStatus(invoice.id, newStatus);
      setCurrentStatus(newStatus);
    } finally {
      setIsUpdating(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Action Bar (hidden in print) */}
      <div className="flex flex-wrap items-center justify-between gap-4 print:hidden">
        <Link
          href="/dashboard/admin/invoices"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Invoices</span>
        </Link>

        <div className="flex items-center gap-2">
          {currentStatus === 'DRAFT' && (
            <button
              onClick={() => handleStatusChange('SENT')}
              disabled={isUpdating}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Mark as Sent</span>
            </button>
          )}

          {currentStatus !== 'PAID' && (
            <button
              onClick={() => handleStatusChange('PAID')}
              disabled={isUpdating}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark as Paid</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {/* Printable Invoice Container */}
      <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-8 sm:p-12 text-slate-100 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 pb-8 border-b border-slate-800 print:border-gray-200">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold print:bg-black">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-xl font-extrabold tracking-tight text-white print:text-black">
                {invoice.organization?.name || 'Apploye Organization'}
              </span>
            </div>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-2">
              Time Tracking & Client Services
            </p>
          </div>

          <div className="sm:text-right">
            <h1 className="text-2xl font-black font-mono tracking-tight text-white print:text-black">
              INVOICE
            </h1>
            <div className="font-mono text-sm text-indigo-400 print:text-black font-bold mt-1">
              {invoice.invoice_number}
            </div>
            <div className="mt-2">
              <span
                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                  currentStatus === 'PAID'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 print:border-emerald-600 print:text-emerald-700'
                    : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30 print:border-gray-300 print:text-gray-700'
                }`}
              >
                STATUS: {currentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Bill To & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 py-8 border-b border-slate-800 print:border-gray-200 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 print:text-gray-500 block mb-1">
              Billed To
            </span>
            <div className="font-bold text-sm text-white print:text-black">
              {invoice.client?.name || 'Valued Client'}
            </div>
            {invoice.client?.email && (
              <div className="text-slate-400 print:text-gray-600 mt-0.5 font-mono">
                {invoice.client.email}
              </div>
            )}
            {invoice.client?.address && (
              <div className="text-slate-400 print:text-gray-600 mt-0.5 whitespace-pre-line">
                {invoice.client.address}
              </div>
            )}
          </div>

          <div className="sm:text-right space-y-1.5 font-mono">
            <div>
              <span className="text-slate-400 print:text-gray-500">Issue Date: </span>
              <span className="font-semibold text-white print:text-black">{invoice.issue_date}</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-gray-500">Due Date: </span>
              <span className="font-semibold text-white print:text-black">{invoice.due_date}</span>
            </div>
            <div>
              <span className="text-slate-400 print:text-gray-500">Currency: </span>
              <span className="font-semibold text-white print:text-black">{invoice.currency}</span>
            </div>
            {invoice.paid_at && (
              <div className="text-emerald-400 print:text-emerald-600 text-[11px] font-sans">
                Paid on: {new Date(invoice.paid_at).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="py-8">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 print:border-gray-300 text-slate-400 print:text-gray-500 uppercase text-[10px] tracking-wider font-semibold">
                <th className="py-2.5">Description</th>
                <th className="py-2.5 text-right">Hours</th>
                <th className="py-2.5 text-right">Hourly Rate</th>
                <th className="py-2.5 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50 print:divide-gray-200">
              {(invoice.items || []).map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="py-3 pr-4 font-medium text-slate-200 print:text-black">
                    {item.description}
                  </td>
                  <td className="py-3 text-right font-mono text-slate-300 print:text-black">
                    {Number(item.quantity_hours).toFixed(2)} hrs
                  </td>
                  <td className="py-3 text-right font-mono text-slate-300 print:text-black">
                    {formatCurrency(item.unit_price)}/hr
                  </td>
                  <td className="py-3 text-right font-mono font-bold text-white print:text-black">
                    {formatCurrency(item.total_amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals */}
        <div className="pt-4 border-t border-slate-800 print:border-gray-200 flex justify-end">
          <div className="w-full sm:w-64 space-y-2 text-xs">
            <div className="flex justify-between text-slate-400 print:text-gray-600">
              <span>Subtotal:</span>
              <span className="font-mono text-white print:text-black font-semibold">
                {formatCurrency(invoice.subtotal)}
              </span>
            </div>

            <div className="flex justify-between text-slate-400 print:text-gray-600">
              <span>Tax ({invoice.tax_rate_percent}%):</span>
              <span className="font-mono text-white print:text-black">
                {formatCurrency(invoice.tax_amount)}
              </span>
            </div>

            <div className="flex justify-between text-sm font-extrabold text-white print:text-black pt-2 border-t border-slate-800 print:border-gray-300">
              <span>Total Due:</span>
              <span className="font-mono text-indigo-400 print:text-black text-base">
                {formatCurrency(invoice.total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Notes & Terms */}
        {invoice.notes && (
          <div className="mt-8 pt-6 border-t border-slate-800 print:border-gray-200">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 print:text-gray-500 block mb-1">
              Notes & Payment Terms
            </span>
            <p className="text-xs text-slate-300 print:text-gray-600 leading-relaxed">
              {invoice.notes}
            </p>
          </div>
        )}

        <div className="mt-12 text-center text-[10px] text-slate-500 print:text-gray-400">
          Generated automatically by Apploye Proof of Work & Automated Invoicing Engine.
        </div>
      </div>
    </div>
  );
}
