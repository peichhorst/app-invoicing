// src/app/dashboard/invoices/page.tsx
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Download, Eye, Pencil, FileText, Plus, ArrowUpRight } from 'lucide-react';
import { MarkInvoicePaidButton } from './MarkInvoicePaidButton';
import { DeleteInvoiceButton } from './DeleteInvoiceButton';
import { RefundInvoiceButton } from './RefundInvoiceButton';
import { MarkInvoiceRefundedButton } from './MarkInvoiceRefundedButton';
import InvoiceReportsLiveSummary from '@/components/InvoiceReportsLiveSummary';
import { ResendButton } from '@/components/ResendButton';
import InvoiceFilterSelect from './InvoiceFilterSelect';
import { Suspense } from 'react';
import UserFilterSelect from './UserFilterSelect';
import { InvoiceStatus } from '@prisma/client';
import Image from 'next/image';

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
    return ['OPEN', 'UNPAID', 'VIEWED', 'SIGNED', 'COMPLETED', 'OVERDUE'] as InvoiceStatus[];
  return null;
};

const getPaymentProvider = (
  payments: Array<{ provider: string; status: string }>,
): 'stripe' | 'manual' | null => {
  const primary = payments.find((payment) =>
    ['succeeded', 'partially_refunded', 'refunded'].includes(payment.status),
  );
  if (!primary) return null;
  if (primary.provider === 'stripe') return 'stripe';
  if (primary.provider === 'manual') return 'manual';
  return null;
};

const getPaymentSourceLabel = (
  payments: Array<{ provider: string; status: string }>,
): string | null => {
  const provider = getPaymentProvider(payments);
  if (provider === 'stripe') return 'Paid Online';
  if (provider === 'manual') return 'Marked Paid';
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
    include: {
      client: true,
      items: true,
      user: { include: { company: true } },
      payments: {
        select: {
          provider: true,
          status: true,
        },
        orderBy: { createdAt: 'desc' },
      },
    },
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
        <div className="sm:ml-auto">
          <Link
            href="/dashboard/invoices/new"
            className="inline-flex items-center gap-2 rounded-lg border border-brand-primary-300 bg-brand-primary-600 px-4 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:border-brand-primary-600 hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)]"
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </Link>
        </div>
      </div>

      {/* Live-updating invoice summary */}
      <InvoiceReportsLiveSummary />
      <div className="flex flex-wrap items-center gap-3">
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
                const canIssueRefund =
                  invoice.status === InvoiceStatus.PAID ||
                  invoice.status === InvoiceStatus.PARTIALLY_REFUNDED;
                const paymentSourceLabel = getPaymentSourceLabel(invoice.payments);
                const paymentProvider = getPaymentProvider(invoice.payments);
                const showIssueRefund = canIssueRefund && paymentProvider === 'stripe';
                const showMarkRefunded =
                  canIssueRefund && paymentProvider === 'manual' && invoice.status !== InvoiceStatus.REFUNDED;

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
                      <span>
                        {invoice.status === 'OPEN' || invoice.status === 'UNPAID'
                          ? 'Unpaid'
                          : invoice.status}
                        {invoice.status === 'PAID' && invoice.paidAt
                          ? ` • Paid on ${new Date(invoice.paidAt).toLocaleDateString()}${paymentSourceLabel ? ` • ${paymentSourceLabel}` : ''}`
                          : invoice.status === 'OPEN' || invoice.status === 'UNPAID'
                          ? ` • ${invoice.sentCount && invoice.sentCount > 0 ? `Sent: ${invoice.sentCount}` : 'Not Sent'}`
                          : ''}
                      </span>
                      {isRecurring && <span>â€¢ Recurring</span>}
                      <span>â€¢ Due {dueDateLabel}</span>
                    </div>
                    <div className="flex flex-col gap-3">
                      <MarkInvoicePaidButton
                        invoiceId={invoice.id}
                        invoiceNumber={invoice.invoiceNumber || undefined}
                        clientName={invoice.client?.companyName || invoice.client?.contactName || undefined}
                        status={invoice.status}
                        variant="button"
                      />
                      {showIssueRefund && <RefundInvoiceButton invoiceId={invoice.id} />}
                      {showMarkRefunded && (
                        <MarkInvoiceRefundedButton invoiceId={invoice.id} status={invoice.status} variant="button" />
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Link
                          href={`/dashboard/invoices/new?edit=${invoice.id}`}
                          className="inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white px-3 py-2 text-sm text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
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
                        {invoice.shortCode && (
                          <Link
                            href={`/p/${invoice.shortCode}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100"
                          >
                            <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                            <span>Public</span>
                          </Link>
                        )}
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
                    const paymentSourceLabel = getPaymentSourceLabel(invoice.payments);
                    const paymentProvider = getPaymentProvider(invoice.payments);
                    const canIssueRefund =
                      invoice.status === InvoiceStatus.PAID ||
                      invoice.status === InvoiceStatus.PARTIALLY_REFUNDED;
                    const showIssueRefund = canIssueRefund && paymentProvider === 'stripe';
                    const showMarkRefunded =
                      canIssueRefund && paymentProvider === 'manual' && invoice.status !== InvoiceStatus.REFUNDED;

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
                          <div className="flex flex-col items-center gap-1">
                            <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              invoice.status === 'PAID'
                                ? 'bg-green-100 text-green-800'
                                : invoice.status === 'REFUNDED'
                                ? 'bg-violet-100 text-violet-800'
                                : invoice.status === 'PARTIALLY_REFUNDED'
                                ? 'bg-purple-100 text-purple-800'
                                : invoice.status === 'PARTIALLY_PAID'
                                ? 'bg-amber-100 text-amber-800'
                                : invoice.status === 'OVERDUE'
                                ? 'bg-rose-100 text-rose-700'
                                : invoice.status === 'SIGNED' || invoice.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                              : invoice.status === 'OPEN' || invoice.status === 'UNPAID'
                                ? 'bg-rose-100 text-rose-700'
                                : invoice.status === 'VIEWED'
                                ? 'bg-brand-primary-100 text-brand-primary-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {invoice.status === 'PAID'
                              ? 'Paid'
                              : invoice.status === 'REFUNDED'
                              ? 'Refunded'
                              : invoice.status === 'PARTIALLY_REFUNDED'
                              ? 'Partially Refunded'
                              : invoice.status === 'PARTIALLY_PAID'
                              ? 'Partially Paid'
                              : invoice.status === 'OVERDUE'
                              ? 'Overdue'
                              : invoice.status === 'SIGNED' || invoice.status === 'COMPLETED'
                              ? 'Contract'
                              : invoice.status === 'OPEN' || invoice.status === 'UNPAID'
                                ? `Unpaid${invoice.sentCount ? ` (${invoice.sentCount})` : ''}`
                              : invoice.status === 'VIEWED'
                              ? 'Viewed'
                              : invoice.status === 'DRAFT'
                              ? 'Draft'
                              : invoice.status}
                            </span>
                            {invoice.status === 'PAID' && invoice.paidAt && (
                              <span className="text-xs text-zinc-500">
                                Paid on {new Date(invoice.paidAt).toLocaleDateString()}
                              </span>
                            )}
                            {invoice.status === 'PAID' && paymentSourceLabel && (
                              <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
                                {paymentProvider === 'stripe' && (
                                  <Image
                                    src="/stripe-logo.svg"
                                    alt="Stripe"
                                    width={12}
                                    height={12}
                                    className="h-3 w-3"
                                  />
                                )}
                                {paymentSourceLabel}
                              </span>
                            )}
                          </div>
                        </td>
                        {isOwnerOrAdmin && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                            {invoice.user?.name || invoice.user?.email || 'â€”'}
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
                            {showIssueRefund && (
                              <RefundInvoiceButton invoiceId={invoice.id} />
                            )}
                            {showMarkRefunded && (
                              <MarkInvoiceRefundedButton invoiceId={invoice.id} status={invoice.status} variant="link" />
                            )}
                            <div className="grid w-full max-w-[140px] grid-cols-2 gap-2 justify-items-center">
                              <Link
                                href={`/dashboard/invoices/new?edit=${invoice.id}`}
                                className="inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white p-2 text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                                title="Edit invoice"
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
                              {invoice.shortCode && (
                                <Link
                                  href={`/p/${invoice.shortCode}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="col-span-2 inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-2 text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100"
                                  title="View public invoice"
                                >
                                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                                  <span className="text-xs font-semibold">Public Invoice</span>
                                </Link>
                              )}
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
            </div>
            </>
          )}
    </div>
  );
}

