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
  if (filter === 'sent') return ['SENT', 'VIEWED', 'SIGNED', 'COMPLETED', 'OVERDUE'] as InvoiceStatus[];
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
  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const companyId = user.companyId ?? user.company?.id ?? null;

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(user.role === 'ADMIN'
        ? {}
        : isOwnerOrAdmin
        ? { user: { companyId: companyId ?? undefined } }
        : { userId: user.id }),
      ...(appliedFilter === 'recurring'
        ? { recurring: true }
        : statuses
        ? { status: { in: statuses } }
        : {}),
    },
    include: { client: true, items: true, user: { include: { company: true } } },
    orderBy:
      user.role === 'ADMIN'
        ? [{ user: { company: { name: 'asc' } } }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }],
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
            <div className="-mx-4 sm:mx-0 overflow-x-auto rounded-lg border-y sm:border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="divide-x divide-gray-200">
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Invoice
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Client
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Amount
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  {isOwnerOrAdmin && (
                    <th className="hidden lg:table-cell px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                      User
                    </th>
                  )}
                  <th className="hidden md:table-cell px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Type
                  </th>
                  <th className="hidden md:table-cell px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                    Due Date
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
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
                    <tr key={invoice.id} className="hover:bg-gray-50 divide-x divide-gray-200">
                      <td className="px-3 py-3 whitespace-nowrap text-sm font-medium text-gray-900 text-center">
                        #{invoice.invoiceNumber}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                        {invoice.client?.companyName || invoice.client?.contactName || 'No client'}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500 text-center">${totalLabel}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-center">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            invoice.status === 'PAID'
                              ? 'bg-green-100 text-green-800'
                              : invoice.status === 'SIGNED' || invoice.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : invoice.status === 'SENT'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {invoice.status === 'PAID'
                        ? 'Paid'
                        : invoice.status === 'SIGNED' || invoice.status === 'COMPLETED'
                        ? 'Contract'
                        : invoice.status === 'SENT'
                        ? `Sent${invoice.sentCount ? ` (${invoice.sentCount})` : ''}`
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
                    <div className="mt-2 flex justify-center">
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
                        <td className="hidden lg:table-cell px-3 py-3 whitespace-nowrap text-sm text-center text-gray-500">
                          {invoice.user?.name || invoice.user?.email || '—'}
                        </td>
                      )}
                      <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap text-sm text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span
                            className={`inline-flex max-w-max truncate px-2 py-1 text-xs font-semibold rounded-full ${
                              isRecurring ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {isRecurring ? 'Recurring' : 'One-time'}
                          </span>
                          {nextOccurrenceLabel && (
                            <span className="text-xs text-gray-400">Next {nextOccurrenceLabel}</span>
                          )}
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-3 py-3 whitespace-nowrap text-sm text-gray-500 text-center">{dueDateLabel}</td>
                      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex flex-wrap justify-center gap-2">
                          <Link
                            href={invoice.status === 'PAID' ? '#' : `/dashboard/invoices/new?edit=${invoice.id}`}
                            aria-disabled={invoice.status === 'PAID'}
                            className={`inline-flex items-center justify-center rounded-lg border bg-white p-2 shadow-sm transition ${
                              invoice.status === 'PAID'
                                ? 'cursor-not-allowed border-gray-200 text-gray-400'
                                : 'border-zinc-200 text-zinc-600 hover:border-purple-300 hover:text-purple-700 cursor-pointer'
                            }`}
                            title={invoice.status === 'PAID' ? 'Editing disabled for paid invoices' : 'Edit invoice'}
                            tabIndex={invoice.status === 'PAID' ? -1 : 0}
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          <Link
                            href={`/dashboard/invoices/${invoice.id}`}
                            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 shadow-sm transition hover:border-purple-300 hover:text-purple-700 cursor-pointer"
                            title="View invoice"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          {['SIGNED', 'COMPLETED'].includes(invoice.status) && (
                            <Link
                              href={`/dashboard/invoices/${invoice.id}/pdf`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white p-2 text-emerald-600 shadow-sm transition hover:bg-emerald-50 cursor-pointer"
                              title="Download Signed Contract"
                            >
                              <FileText className="h-4 w-4" aria-hidden="true" />
                            </Link>
                          )}
                          <Link
                            href={`/dashboard/invoices/${invoice.id}/pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-lg border border-zinc-200 bg-white p-2 text-zinc-600 shadow-sm transition hover:border-purple-300 hover:text-purple-700 cursor-pointer"
                            title="Download PDF"
                          >
                            <FileText className="h-4 w-4" aria-hidden="true" />
                          </Link>
                          <ResendButton invoiceId={invoice.id} />
                          <DeleteInvoiceButton invoiceId={invoice.id} />
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
