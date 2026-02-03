"use client";
import React from 'react';
import { useReportingSummary } from '@/hooks/useReportingSummary';

type InvoiceReportsLiveSummaryProps = {
  year?: number;
  month?: number;
  status?: string;
  period?: string;
  includeCompany?: boolean;
};

export default function InvoiceReportsLiveSummary({ year, month, status = 'ALL', period = 'monthly', includeCompany = true }: InvoiceReportsLiveSummaryProps) {
  const { data, error, isLoading } = useReportingSummary({ year, month, status, period, includeCompany });

  if (isLoading) return <div className="py-4 text-sm text-gray-500">Loading summary…</div>;
  if (error) return <div className="py-4 text-sm text-rose-500">Failed to load summary.</div>;
  if (!data || !data.summary) return null;

  const summary = data.summary;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm mt-4">
      <h2 className="text-lg font-semibold text-brand-primary-700 mb-2">Live Invoice Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Total Invoices</p>
          <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.totalInvoiceCount ?? 0}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-green-600">Paid</p>
          <p className="mt-2 text-xl font-bold text-green-600">{summary.paidInvoiceCount ?? 0}</p>
          <span className="block text-base font-normal text-green-700">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summary.paidInvoiceTotal ?? 0)}
          </span>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-600">Unpaid</p>
          <p className="mt-2 text-xl font-bold text-red-600">{summary.unpaidInvoiceCount ?? 0}</p>
          <span className="block text-base font-normal text-red-700">
            {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(summary.unpaidInvoiceTotal ?? 0)}
          </span>
        </div>
      </div>
      <div className="mt-4 text-base font-semibold text-zinc-700">
        Expected Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((summary.paidInvoiceTotal ?? 0) + (summary.unpaidInvoiceTotal ?? 0))}
      </div>
    </div>
  );
}
