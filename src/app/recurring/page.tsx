// src/app/dashboard/recurring/page.tsx
import Link from 'next/link';
import { Download, Plus, CreditCard, Repeat } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { RecurringActions, type RecurringStatus } from '@/components/RecurringActions';

const badgeStyles = {
  ACTIVE: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-zinc-50 text-zinc-600',
  PAUSED: 'bg-yellow-50 text-yellow-800',
  CANCELLED: 'bg-rose-50 text-rose-700',
} as const;

const frequencyLabels: Record<string, string> = {
  week: 'Weekly',
  month: 'Monthly',
  quarter: 'Quarterly',
  year: 'Yearly',
};

const formatCurrency = (value: string | number, currency = 'USD') => {
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency });
  return formatter.format(Number(value));
};

export default async function RecurringPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="p-6 text-sm text-red-600">Unauthorized</div>;
  }

  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const companyId = user.companyId ?? user.company?.id ?? null;

  const recurringInvoices = await prisma.recurringInvoice.findMany({
    where: isOwnerOrAdmin
      ? { user: { companyId: companyId ?? undefined } }
      : { userId: user.id },
    include: {
      client: true,
      invoices: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { invoiceNumber: true, id: true, status: true, issueDate: true },
      },
      _count: { select: { invoices: true } },
    },
    orderBy: { nextSendDate: 'asc' },
  });

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Recurring Invoices</h1>
            <p className="text-sm text-gray-500">Schedule repeat billing for your clients.</p>
          </div>
        </div>

        {recurringInvoices.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-white p-12 text-center shadow-sm">
            <Repeat className="mx-auto h-12 w-12 text-zinc-400" />
            <p className="mt-4 text-lg font-semibold text-gray-900">No recurring invoices yet</p>
            <p className="mt-2 text-sm text-gray-500">Create a recurring invoice to automatically bill your clients.</p>
            <Link
              href="/dashboard/invoices/recurring-new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add Your First Recurring Invoice
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="space-y-4 md:hidden">
              {recurringInvoices.map((invoice, index) => (
                <div key={invoice.id} className="rounded-lg border bg-white p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <p className="font-medium text-gray-900">{invoice.title}</p>
                      <p className="text-sm text-gray-600">{invoice.client?.companyName}</p>
                      {invoice.autoPayEnabled && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-xs text-emerald-600 font-medium">Auto-pay enabled</span>
                        </div>
                      )}
                    </div>
                    <span className="text-lg font-bold">
                      {formatCurrency(invoice.amount.toString(), invoice.currency ?? 'USD')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm text-gray-600 mb-4">
                    <div>
                      <p className="text-xs uppercase text-gray-500">Frequency</p>
                      <p>{frequencyLabels[invoice.interval] ?? invoice.interval}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Next send</p>
                      <p>
                        {invoice.nextSendDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Status</p>
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                          badgeStyles[invoice.status as keyof typeof badgeStyles] ?? badgeStyles.ACTIVE
                        }`}
                      >
                        {invoice.status}
                        {invoice.status === 'ACTIVE' && ` (${invoice._count.invoices})`}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs uppercase text-gray-500">Invoices sent</p>
                      <p>{invoice._count.invoices}</p>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <RecurringActions
                      recurringId={invoice.id}
                      status={invoice.status as RecurringStatus}
                      invoiceCount={invoice._count.invoices}
                      invoiceNumber={invoice.invoices[0]?.invoiceNumber ?? undefined}
                      latestInvoiceId={invoice.invoices[0]?.id ?? undefined}
                      latestInvoiceNumber={invoice.invoices[0]?.invoiceNumber ?? undefined}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="relative max-h-[70vh] overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[800px] divide-y divide-zinc-200">
                  <thead className="sticky top-0 z-10 bg-zinc-50">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Title / Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Frequency
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Next send
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Subscription
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Latest Invoice
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Actions
                    </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                  {recurringInvoices.map((invoice, index) => (
                    <tr key={invoice.id} className="hover:bg-zinc-50">
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{invoice.title}</div>
                        <div className="text-xs text-zinc-500">{invoice.client?.companyName}</div>
                        {invoice.autoPayEnabled && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <CreditCard className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="text-xs text-emerald-600 font-medium">Auto-pay</span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">#{index + 1}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.amount.toString(), invoice.currency ?? 'USD')}
                      </td>
                      <td className="px-6 py-4 text-sm uppercase tracking-[0.2em] text-zinc-500">
                        {frequencyLabels[invoice.interval] ?? invoice.interval}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-700">
                        {invoice.nextSendDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                            badgeStyles[invoice.status as keyof typeof badgeStyles] ?? badgeStyles.ACTIVE
                          }`}
                        >
                          {invoice.status}
                          {invoice.status === 'ACTIVE' && ` (${invoice._count.invoices})`}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {invoice.invoices[0] ? (
                          <div className="flex flex-col items-center gap-1">
                            <span
                              className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
                                invoice.invoices[0].status === 'PAID'
                                  ? 'bg-emerald-50 text-emerald-700'
                                : invoice.invoices[0].status === 'UNPAID'
                                  ? 'bg-brand-accent-50 text-brand-accent-700'
                                  : invoice.invoices[0].status === 'OVERDUE'
                                  ? 'bg-red-50 text-red-700'
                                  : 'bg-zinc-50 text-zinc-600'
                              }`}
                            >
                              {invoice.invoices[0].status}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {invoice.invoices[0].issueDate.toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-zinc-400">None</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <RecurringActions
                          recurringId={invoice.id}
                          status={invoice.status as RecurringStatus}
                          invoiceCount={invoice._count.invoices}
                          invoiceNumber={invoice.invoices[0]?.invoiceNumber ?? undefined}
                          latestInvoiceId={invoice.invoices[0]?.id ?? undefined}
                          latestInvoiceNumber={invoice.invoices[0]?.invoiceNumber ?? undefined}
                        />
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-4">
              <a
                href="/api/exports/recurring-invoices"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-white"
              >
                <Download className="h-4 w-4" />
                Export recurring invoices
              </a>
              <Link
                href="/dashboard/invoices/recurring-new"
                className="ml-auto rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-sm"
              >
                <span>+</span>
                New Recurring Invoice
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
