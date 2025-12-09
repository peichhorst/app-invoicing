// src/app/dashboard/invoices/page.tsx
import Link from 'next/link';
import { prisma } from '@lib/prisma';
import { ResendButton } from '@components/ResendButton';
import { getCurrentUser } from '@/lib/auth';
import { Eye, Pencil, FileText, Download } from 'lucide-react';
import { DeleteInvoiceButton } from './DeleteInvoiceButton';
import { MarkInvoicePaidButton } from './MarkInvoicePaidButton';
import InvoiceFilterSelect from './InvoiceFilterSelect';
import { InvoiceStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{ filter?: string | string[] }>;
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'All invoices' },
  { key: 'paid', label: 'Paid invoices' },
  { key: 'sent', label: 'Sent invoices' },
  { key: 'recurring', label: 'Recurring invoices' },
];

const getStatusesForFilter = (filter: string): InvoiceStatus[] | null => {
  if (filter === 'paid') return ['PAID'] as InvoiceStatus[];
  if (filter === 'sent') return ['SENT', 'VIEWED', 'OVERDUE'] as InvoiceStatus[];
  return null;
};

export default async function InvoicesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="px-4 py-10 text-sm text-red-600">Unauthorized</div>;
  }

  const params = await searchParams;
  const requestedFilter = Array.isArray(params?.filter)
    ? params.filter[0]
    : params?.filter;
  
  const appliedFilter = FILTER_OPTIONS.some((option) => option.key === requestedFilter)
    ? requestedFilter!
    : 'all';
  
  const statuses = getStatusesForFilter(appliedFilter);

  const invoices = await prisma.invoice.findMany({
    where: {
      userId: user.id,
      ...(appliedFilter === 'recurring'
        ? { recurring: true }
        : statuses
        ? { status: { in: statuses } }
        : {}),
    },
    include: { client: true, items: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500">Track, send, and download your invoices.</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-3">
            <InvoiceFilterSelect options={FILTER_OPTIONS} current={appliedFilter} />
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="mb-4 text-gray-500">No invoices yet.</p>
            <Link
              href="/dashboard/invoices/new"
              className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 cursor-pointer"
            >
              Create your first invoice
            </Link>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto w-full max-w-full rounded-lg border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="divide-x divide-gray-200">
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Invoice
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Client
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Amount
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Recurring
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Due Date
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {invoices.map((invoice) => {
                  const subtotal = invoice.items.reduce((sum: number, item: any) => {
                    const quantity = Number(item.quantity) || 0;
                    const unitPrice = Number(item.unitPrice) || 0;
                    return sum + unitPrice * quantity;
                  }, 0);
                  const taxRate = Number(invoice.taxRate) || 0;
                  const tax = subtotal * (taxRate / 100);
                  const total = subtotal + tax;
                  const dueDateLabel = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'No due date';
                  const isRecurring = Boolean(invoice.recurring);
                  const recurringBadgeClass = isRecurring
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-gray-100 text-gray-800';
                  const nextOccurrenceLabel = invoice.nextOccurrence
                    ? new Date(invoice.nextOccurrence).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    : null;

                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50 divide-x divide-gray-200">
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{invoice.invoiceNumber}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        {invoice.client?.companyName || invoice.client?.contactName || 'No client'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">${total.toFixed(2)}</td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            invoice.status === 'PAID'
                              ? 'bg-green-100 text-green-800'
                              : invoice.status === 'SENT'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {invoice.status === 'PAID'
                            ? 'Paid'
                            : invoice.status === 'SENT'
                            ? `Sent${invoice.sentCount ? ` (${invoice.sentCount})` : ''}`
                            : 'Not Sent'}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex max-w-max truncate px-2 py-1 text-xs font-semibold rounded-full ${recurringBadgeClass}`}
                          >
                            {isRecurring ? 'Recurring' : 'One-time'}
                          </span>
                          {nextOccurrenceLabel && (
                            <span className="text-xs text-gray-400">Next {nextOccurrenceLabel}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{dueDateLabel}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-2">
                          <Link
                            href={invoice.status === 'PAID' ? '#' : `/dashboard/invoices/new?edit=${invoice.id}`}
                            aria-disabled={invoice.status === 'PAID'}
                            className={`inline-flex items-center justify-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold shadow-sm transition ${
                              invoice.status === 'PAID'
                                ? 'cursor-not-allowed border-gray-200 text-gray-400 bg-gray-50'
                                : 'border-purple-200 text-purple-700 hover:bg-purple-50 cursor-pointer'
                            }`}
                            title={invoice.status === 'PAID' ? 'Editing disabled for paid invoices' : 'Edit invoice'}
                            tabIndex={invoice.status === 'PAID' ? -1 : 0}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">Edit</span>
                          </Link>
                          <Link
                            href={`/dashboard/invoices/${invoice.id}`}
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-purple-200 px-3 py-1.5 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50 cursor-pointer"
                            title="View invoice"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">View</span>
                          </Link>
                          <Link
                            href={`/dashboard/invoices/${invoice.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 cursor-pointer"
                            title="Download PDF"
                          >
                            <FileText className="h-4 w-4" aria-hidden="true" />
                            <span className="sr-only">PDF</span>
                          </Link>
                          <ResendButton invoiceId={invoice.id} />
                          <DeleteInvoiceButton invoiceId={invoice.id} />
                          <MarkInvoicePaidButton invoiceId={invoice.id} status={invoice.status} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <a
                href={`/api/exports/invoices${appliedFilter === 'all' ? '' : `?filter=${encodeURIComponent(appliedFilter)}`}`}
                className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-white cursor-pointer"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                Export invoices
              </a>
              <Link
                href="/dashboard/invoices/new"
                className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 cursor-pointer"
              >
                + New Invoice
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
