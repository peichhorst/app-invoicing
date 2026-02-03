import Link from 'next/link';
import { Download, Plus, Repeat } from 'lucide-react';
import prisma from '@lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { MarkInvoicePaidButton } from '@/app/dashboard/(with-shell)/invoices/MarkInvoicePaidButton';

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

export default async function RecurringNewPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="p-6 text-sm text-red-600">Unauthorized</div>;
  }
  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const companyId = user.companyId ?? user.company?.id ?? null;

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(user.role === 'ADMIN'
        ? {}
        : isOwnerOrAdmin
        ? { user: { companyId: companyId ?? undefined } }
        : { userId: user.id }),
    },
    include: { client: true, items: true, user: { include: { company: true } } },
    orderBy:
      user.role === 'ADMIN'
        ? [{ user: { company: { name: 'asc' } } }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }],
  });

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Recurring Invoices (New)</h1>
            <p className="text-sm text-gray-500">Schedule repeat billing for your clients.</p>
          </div>
        </div>



        {invoices.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-white p-12 text-center shadow-sm">
            <Repeat className="mx-auto h-12 w-12 text-zinc-400" />
            <p className="mt-4 text-lg font-semibold text-gray-900">No recurring invoices yet</p>
            <p className="mt-2 text-sm text-gray-500">Create a recurring invoice to automatically bill your clients.</p>
            <Link
              href="/dashboard/invoices/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add Your First Recurring Invoice
            </Link>
          </div>
        ) : (
          <>
            <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm min-w-0 overflow-x-auto">
              <div className="max-w-full">
                <table className="w-full min-w-[720px] table-auto divide-y divide-zinc-200 border border-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Invoice</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Status</th>
                      {isOwnerOrAdmin && (
                        <th className="hidden lg:table-cell px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">User</th>
                      )}
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Type</th>
                      <th className="hidden md:table-cell px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Due Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {invoices.map((invoice, index) => {
                      const subtotal = invoice.items.reduce((sum: number, item: any) => {
                        const quantity = Number(item.quantity) || 0;
                        const unitPrice = Number(item.unitPrice) || 0;
                        return sum + unitPrice * quantity;
                      }, 0);
                      const taxRate = Number(invoice.taxRate) || 0;
                      const tax = subtotal * (taxRate / 100);
                      const total = subtotal + tax;
                      const totalLabel = total.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });
                      const dueDateLabel = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'No due date';
                      const isRecurring = Boolean(invoice.recurring);
                      const nextOccurrenceLabel = invoice.nextOccurrence
                        ? new Date(invoice.nextOccurrence).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : null;
                      const paidOnLabel =
                        invoice.status === 'PAID'
                          ? new Date(invoice.updatedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : null;
                      const signedOnLabel =
                        (invoice.status === 'SIGNED' || invoice.status === 'COMPLETED') && invoice.updatedAt
                          ? new Date(invoice.updatedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })
                          : null;

                      return (
                      <tr key={invoice.id}>
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-semibold text-gray-900">#{invoice.invoiceNumber || index + 1}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {invoice.client?.companyName || invoice.client?.contactName || 'No client'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {formatCurrency(total, invoice.currency ?? 'USD')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                              invoice.status === 'PAID'
                                ? 'bg-green-100 text-green-800'
                                : invoice.status === 'SIGNED' || invoice.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : invoice.status === 'UNPAID'
                                ? 'bg-brand-primary-100 text-brand-primary-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {invoice.status === 'PAID'
                              ? 'Paid'
                              : invoice.status === 'SIGNED' || invoice.status === 'COMPLETED'
                              ? 'Contract'
                              : invoice.status === 'UNPAID'
                              ? `Unpaid${invoice.sentCount ? ` (${invoice.sentCount})` : ''}`
                              : invoice.status === 'VIEWED'
                              ? 'Viewed'
                              : 'Not Sent'}
                          </span>
                          {invoice.status === 'PAID' && paidOnLabel && (
                            <p className="text-xs text-green-700 mt-1">{paidOnLabel}</p>
                          )}
                          {(invoice.status === 'SIGNED' || invoice.status === 'COMPLETED') && signedOnLabel && (
                            <p className="text-xs text-emerald-600 mt-1">Signed {signedOnLabel}</p>
                          )}
                          <div className="mt-2 flex justify-start">
                            <MarkInvoicePaidButton
                              invoiceId={invoice.id}
                              invoiceNumber={invoice.invoiceNumber || undefined}
                              clientName={invoice.client?.companyName || invoice.client?.contactName || undefined}
                              status={invoice.status}
                              variant="link"
                            />
                          </div>
                        </td>
                        {isOwnerOrAdmin && (
                          <td className="hidden lg:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {invoice.user?.name || invoice.user?.email || '-'}
                          </td>
                        )}
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex flex-col items-start gap-1">
                            <span
                              className={`inline-flex max-w-max truncate px-2 py-1 text-xs font-semibold rounded-full ${
                                isRecurring ? 'bg-brand-primary-100 text-brand-primary-800' : 'bg-gray-100 text-gray-800'
                              }`}
                            >
                              {isRecurring ? 'Recurring' : 'One-time'}
                            </span>
                            {nextOccurrenceLabel && (
                              <span className="text-xs text-gray-400">Next {nextOccurrenceLabel}</span>
                            )}
                          </div>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {dueDateLabel}
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3 border-t border-zinc-100 pt-3">
              <a
                href="/api/exports/recurring-invoices"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-semibold text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-white"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Export recurring invoices
              </a>
              <Link
                href="/dashboard/invoices/new?recurring=true"
                className="ml-auto inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
              >
                <span>+</span>
                New recurring invoice
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
