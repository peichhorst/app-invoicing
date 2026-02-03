// src/app/dashboard/invoices/page.tsx
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Download, Eye, Pencil, FileText, Plus } from 'lucide-react';
import { MarkInvoicePaidButton } from './MarkInvoicePaidButton';
import { DeleteInvoiceButton } from './DeleteInvoiceButton';
import { RefundInvoiceButton } from './RefundInvoiceButton';
import InvoiceReportsLiveSummary from '@/components/InvoiceReportsLiveSummary';
import { ResendButton } from '@/components/ResendButton';
import InvoiceFilterSelect from './InvoiceFilterSelect';
import { Suspense } from 'react';
import UserFilterSelect from './UserFilterSelect';
import { InvoiceStatus } from '@prisma/client';
import InvoicePaidDateEditor from '@/components/invoices/InvoicePaidDateEditor';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: Promise<{ filter?: string | string[], user?: string | string[] }>;
};

const FILTER_OPTIONS = [
  { key: 'all', label: 'All invoices' },
  { key: 'paid', label: 'Paid invoices' },
  { key: 'sent', label: 'Unpaid invoices' },
  { key: 'recurring', label: 'Recurring invoices' },
];

// Helper to fetch team members for the user
async function getTeamMembers(companyId: string) {
  return prisma.user.findMany({
    where: { companyId },
    select: { id: true, name: true, email: true },
    orderBy: { name: 'asc' },
  });
}

const getStatusesForFilter = (filter: string): InvoiceStatus[] | null => {
  if (filter === 'paid') return ['PAID'] as InvoiceStatus[];
  if (filter === 'sent')
    return ['UNPAID', 'VIEWED', 'SIGNED', 'COMPLETED', 'OVERDUE'] as InvoiceStatus[];
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
  const requestedUser = Array.isArray(params?.user)
    ? params.user[0]
    : params?.user;

  const appliedFilter = FILTER_OPTIONS.some((option) => option.key === requestedFilter)
    ? requestedFilter!
    : 'all';

  const statuses = getStatusesForFilter(appliedFilter);
  const isPlatformAdmin = user.role === 'SUPERADMIN';
  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const companyId = user.companyId ?? user.company?.id ?? null;

  // Fetch team members if owner/admin
  let teamMembers: { id: string; name: string | null; email: string }[] = [];
  if (isOwnerOrAdmin && companyId) {
    teamMembers = await getTeamMembers(companyId);
  }

  // Only show user filter if more than one team member
  const showUserFilter = isOwnerOrAdmin && teamMembers.length > 1;

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(isPlatformAdmin
        ? {}
        : isOwnerOrAdmin
        ? {
            user: { companyId: companyId ?? undefined },
            ...(showUserFilter && requestedUser && requestedUser !== 'all' ? { userId: requestedUser } : {}),
          }
        : { userId: user.id }),
      ...(appliedFilter === 'recurring'
        ? { recurring: true }
        : statuses
        ? { status: { in: statuses } }
        : {}),
    },
    include: { client: true, items: true, user: { include: { company: true } } },
    orderBy:
      isPlatformAdmin
        ? [{ user: { company: { name: 'asc' } } }, { createdAt: 'desc' }]
        : [{ createdAt: 'desc' }],
  });


  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500">Track, send, and download your invoices.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:ml-auto sm:justify-end w-full sm:w-auto">
          <InvoiceFilterSelect options={FILTER_OPTIONS} current={appliedFilter} />
          {showUserFilter && (
            <Suspense>
              <UserFilterSelect
                users={[{ id: 'all', name: 'All team members', email: '' }, ...teamMembers]}
                current={requestedUser || 'all'}
              />
            </Suspense>
          )}
        </div>
      </div>

      {/* Live-updating invoice summary */}
      <InvoiceReportsLiveSummary />


        {invoices.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-white p-12 text-center shadow-sm">
            <FileText className="mx-auto h-12 w-12 text-zinc-400" />
            <p className="mt-4 text-lg font-semibold text-gray-900">No invoices yet</p>
            <p className="mt-2 text-sm text-gray-500">Create an invoice to start billing your clients.</p>
            <Link
              href="/dashboard/invoices/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add Your First Invoice
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile card view */}
            <div className="space-y-4 md:hidden">
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
                const dueDateLabel = invoice.dueDate
                  ? new Date(invoice.dueDate).toLocaleDateString()
                  : 'No due date';
                const isRecurring = Boolean(invoice.recurring);

                return (
                  <div key={invoice.id} className="rounded-lg border bg-white p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <p className="font-medium">#{invoice.invoiceNumber}</p>
                        <p className="text-sm text-gray-600">
                          {invoice.client?.companyName || invoice.client?.contactName || 'No client'}
                        </p>
                      </div>
                      <span className="text-lg font-bold">${totalLabel}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-gray-500 mb-3">
                      <span>{invoice.status}</span>
                      {isRecurring && <span>• Recurring</span>}
                      <span>• Due {dueDateLabel}</span>
                    </div>
                    {invoice.status === 'PAID' && (
                      <div className="mb-2 text-xs text-zinc-500">
                        <InvoicePaidDateEditor
                          invoiceId={invoice.id}
                          initialPaidAt={invoice.updatedAt?.toISOString() ?? null}
                        />
                      </div>
                    )}
                    <div className="flex flex-col gap-3">
                      <MarkInvoicePaidButton
                        invoiceId={invoice.id}
                        invoiceNumber={invoice.invoiceNumber || undefined}
                        clientName={invoice.client?.companyName || invoice.client?.contactName || undefined}
                        status={invoice.status}
                        variant="button"
                      />
                      <RefundInvoiceButton invoiceId={invoice.id} />
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={invoice.status === 'PAID' ? '#' : `/dashboard/invoices/new?edit=${invoice.id}`}
                          aria-disabled={invoice.status === 'PAID'}
                          className={`inline-flex items-center justify-center rounded-lg border bg-white px-3 py-2 text-sm shadow-sm transition ${
                            invoice.status === 'PAID'
                              ? 'cursor-not-allowed border-gray-200 text-gray-400'
                              : 'border-brand-primary-200 text-brand-primary-700 hover:border-brand-primary-300 hover:bg-brand-primary-50'
                          }`}
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          <span className="ml-1">Edit</span>
                        </Link>
                        <Link
                          href={`/dashboard/invoices/${invoice.id}`}
                          className="inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white px-3 py-2 text-sm text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          <span className="ml-1">View</span>
                        </Link>
                        <Link
                          href={`/dashboard/invoices/${invoice.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white px-3 py-2 text-sm text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                        >
                          <FileText className="h-4 w-4" aria-hidden="true" />
                          <span className="ml-1">PDF</span>
                        </Link>
                        <ResendButton invoiceId={invoice.id} />
                        <DeleteInvoiceButton invoiceId={invoice.id} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop table view */}
            <div className="hidden md:block rounded-lg border border-gray-200 bg-white shadow-sm">
              <div className="relative max-h-[70vh] overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[720px] divide-y divide-gray-200">
                  <thead className="sticky top-0 z-10 bg-gray-50">
                    <tr className="divide-x divide-gray-200">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Client
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Paid Date
                    </th>
                    {isOwnerOrAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        User
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      Due Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
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
                    const dueDateLabel = invoice.dueDate
                      ? new Date(invoice.dueDate).toLocaleDateString()
                      : 'No due date';
                    const isRecurring = Boolean(invoice.recurring);

                    return (
                      <tr key={invoice.id} className="hover:bg-gray-50 divide-x divide-gray-200">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          #{invoice.invoiceNumber}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {invoice.client?.companyName || invoice.client?.contactName || 'No client'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${totalLabel}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
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
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-left">
                          {invoice.status === 'PAID' ? (
                            <InvoicePaidDateEditor
                              invoiceId={invoice.id}
                              initialPaidAt={invoice.updatedAt?.toISOString() ?? null}
                            />
                          ) : (
                            <span className="text-xs uppercase tracking-[0.3em] text-zinc-400">—</span>
                          )}
                        </td>
                        {isOwnerOrAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                            {invoice.user?.name || invoice.user?.email || '—'}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          {isRecurring ? 'Recurring' : 'One-time'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                          {dueDateLabel}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <div className="flex flex-col items-center gap-2">
                            <MarkInvoicePaidButton
                              invoiceId={invoice.id}
                              invoiceNumber={invoice.invoiceNumber || undefined}
                              clientName={invoice.client?.companyName || invoice.client?.contactName || undefined}
                              status={invoice.status}
                              variant="link"
                            />
                            <RefundInvoiceButton invoiceId={invoice.id} />
                            <div className="grid w-full max-w-[140px] grid-cols-2 gap-2 justify-items-center">
                              <Link
                                href={invoice.status === 'PAID' ? '#' : `/dashboard/invoices/new?edit=${invoice.id}`}
                                aria-disabled={invoice.status === 'PAID'}
                                className={`inline-flex items-center justify-center rounded-lg border bg-white p-2 shadow-sm transition ${
                                  invoice.status === 'PAID'
                                    ? 'cursor-not-allowed border-gray-200 text-gray-400'
                                    : 'border-brand-primary-200 text-brand-primary-700 hover:border-brand-primary-300 hover:bg-brand-primary-50'
                                }`}
                                title={invoice.status === 'PAID' ? 'Editing disabled for paid invoices' : 'Edit invoice'}
                                tabIndex={invoice.status === 'PAID' ? -1 : 0}
                              >
                                <Pencil className="h-4 w-4" aria-hidden="true" />
                              </Link>
                              <Link
                                href={`/dashboard/invoices/${invoice.id}`}
                                className="inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white p-2 text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                                title="View invoice"
                              >
                                <Eye className="h-4 w-4" aria-hidden="true" />
                              </Link>
                              <Link
                                href={`/dashboard/invoices/${invoice.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white p-2 text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                                title="Download PDF"
                              >
                                <FileText className="h-4 w-4" aria-hidden="true" />
                              </Link>
                              <div className="inline-flex items-center justify-center">
                                <ResendButton invoiceId={invoice.id} />
                              </div>
                              <div className="col-span-2 flex justify-center">
                                <DeleteInvoiceButton invoiceId={invoice.id} />
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <a
                href={`/api/exports/invoices${appliedFilter === 'all' ? '' : `?filter=${encodeURIComponent(appliedFilter)}`}`}
                className="inline-flex items-center gap-2 rounded-lg border border-brand-primary-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-brand-primary-600 hover:bg-brand-primary-600 hover:text-[var(--color-brand-contrast)]"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="h-4 w-4" />
                Export invoices
              </a>
                <Link
                  href="/dashboard/invoices/new"
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-primary-300 bg-brand-primary-600 px-4 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:border-brand-primary-600 hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)]"
                >
                  <Plus className="h-4 w-4" />
                  New Invoice
                </Link>
              </div>
            </>
          )}
    </div>
  );
}
