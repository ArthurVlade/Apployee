'use client';

import React, { useState, useTransition } from 'react';
import { generateInvoice, type InvoiceActionResult } from '@/actions/invoices';
import {
  FileText,
  Calendar,
  DollarSign,
  User,
  Folder,
  Percent,
  X,
  Loader2,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface ClientOption {
  id: string;
  name: string;
  currency: string;
}

interface ProjectOption {
  id: string;
  name: string;
  clientId?: string | null;
  billingRate?: number | null;
}

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientOption[];
  projects: ProjectOption[];
}

export function CreateInvoiceModal({
  isOpen,
  onClose,
  clients,
  projects,
}: CreateInvoiceModalProps) {
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id || '');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  
  const today = new Date().toISOString().split('T')[0];
  const firstOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
    .toISOString()
    .split('T')[0];

  const [startDate, setStartDate] = useState<string>(firstOfMonth);
  const [endDate, setEndDate] = useState<string>(today);
  const [taxPercent, setTaxPercent] = useState<string>('8.0');

  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<InvoiceActionResult | null>(null);

  if (!isOpen) return null;

  const filteredProjects = selectedClientId
    ? projects.filter((p) => !p.clientId || p.clientId === selectedClientId)
    : projects;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResult(null);

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await generateInvoice(null, formData);
      setResult(res);
      if (res.success) {
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Generate Client Invoice</h2>
              <p className="text-xs text-slate-400">
                Aggregate approved billable time entries into an itemized invoice
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        {result?.error && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{result.error}</span>
          </div>
        )}

        {result?.success && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{result.message || 'Invoice generated successfully!'}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Client Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Client <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <select
                name="clientId"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                {clients.length === 0 ? (
                  <option value="">No clients found - Add a client first</option>
                ) : (
                  clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.currency || 'USD'})
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          {/* Project Select */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Project Filter
            </label>
            <div className="relative">
              <Folder className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <select
                name="projectId"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-indigo-500"
              >
                <option value="all">All Billable Projects for Client</option>
                {filteredProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} {p.billingRate ? `($${p.billingRate}/hr)` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Start Date <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  name="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                End Date <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  name="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Tax Percentage */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tax Rate (%)
            </label>
            <div className="relative">
              <Percent className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                name="taxPercent"
                value={taxPercent}
                onChange={(e) => setTaxPercent(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs font-mono focus:outline-none focus:border-indigo-500"
              />
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              Applicable sales tax or VAT applied to subtotal
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || clients.length === 0}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Calculating Hours...</span>
                </>
              ) : (
                <>
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>Generate Invoice</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
