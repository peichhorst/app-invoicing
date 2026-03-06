import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import prisma from '@lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { MarkInvoicePaidButton } from '../MarkInvoicePaidButton';
import { RefundInvoiceButton } from '../RefundInvoiceButton';
import PayNowButton from './PayNowButton';
import { InvoiceStatus } from '@prisma/client';
import { ArrowUpRight } from 'lucide-react';

type PageProps = {
  params: Promise<{ id: string }>;
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const formatCurrency = (value: number) => currencyFormatter.format(Number.isFinite(value) ? value : 0);

export default async function InvoiceDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/');
  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const companyId = user.companyId ?? user.company?.id ?? null;

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: isOwnerOrAdmin
      ? { id, user: { companyId: companyId ?? undefined } }
      : { id, userId: user.id },
    include: {
      client: true,
      items: true,
      payments: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  const totals = invoice.items.reduce(
    (acc, item) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unitPrice) || 0;
      const rate = Number(item.taxRate) || 0;
      const lineSubtotal = quantity * unitPrice;
      const lineTax = lineSubtotal * (rate / 100);

      acc.subtotal += lineSubtotal;
      acc.tax += lineTax;
      acc.total += lineSubtotal + lineTax;

      return acc;
    },
    { subtotal: 0, tax: 0, total: 0 }
  );

  const statusLabelMap: Record<InvoiceStatus, string> = {
    DRAFT: 'Draft',
    OPEN: 'Unpaid',
    SENT: 'Sent',
    PARTIALLY_PAID: 'Partially paid',
    UNPAID: 'Unpaid',
    VIEWED: 'Viewed',
    SIGNED: 'Signed',
    COMPLETED: 'Completed',
    OVERDUE: 'Overdue',
    PAID: 'Paid',
    PARTIALLY_REFUNDED: 'Partially refunded',
    REFUNDED: 'Refunded',
    VOID: 'Voided',
  };

  const badgeClassMap: Record<InvoiceStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-800',
    OPEN: 'bg-brand-primary-100 text-brand-primary-800',
    SENT: 'bg-blue-100 text-blue-800',
    PARTIALLY_PAID: 'bg-amber-100 text-amber-800',
    UNPAID: 'bg-brand-primary-100 text-brand-primary-800',
    VIEWED: 'bg-brand-primary-100 text-brand-primary-800',
    SIGNED: 'bg-teal-100 text-teal-800',
    COMPLETED: 'bg-teal-100 text-teal-800',
    OVERDUE: 'bg-red-100 text-red-800',
    PAID: 'bg-green-100 text-green-800',
    PARTIALLY_REFUNDED: 'bg-purple-100 text-purple-800',
    REFUNDED: 'bg-purple-100 text-purple-800',
    VOID: 'bg-gray-100 text-gray-800',
  };

  const isPaid = invoice.status === InvoiceStatus.PAID;
  const statusLabel = statusLabelMap[invoice.status] ?? invoice.status;
  const statusBadgeClass = badgeClassMap[invoice.status] ?? 'bg-gray-100 text-gray-800';

  const paidOnLabel =
    invoice.status === 'PAID' && invoice.paidAt
      ? new Date(invoice.paidAt).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : null;
  const amountDueValue = Math.max(
    0,
    (invoice.total ?? totals.total) - (invoice.amountPaid ?? 0),
  );
  const isPayable = amountDueValue > 0 && invoice.status !== InvoiceStatus.PAID;
  const canIssueRefund =
    invoice.status === InvoiceStatus.PAID || invoice.status === InvoiceStatus.PARTIALLY_REFUNDED;

  const amountDueLabel = formatCurrency(amountDueValue);

  const paymentRecords = invoice.payments || [];

  const issuedOn = invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : '—';
  const dueOn = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'No due date';

  const client = invoice.client;

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
              <span>Invoice #{invoice.invoiceNumber}</span>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass}`}>
                {statusLabel}
              </span>
              {!isPaid && (
                <MarkInvoicePaidButton
                  invoiceId={invoice.id}
                  invoiceNumber={invoice.invoiceNumber || undefined}
                  clientName={invoice.client?.companyName || invoice.client?.contactName || undefined}
                  status={invoice.status}
                />
              )}
            </div>
            <h1 className="text-3xl font-semibold text-gray-900">Invoice Details</h1>
            <p className="text-sm text-gray-500">
              Issued on {issuedOn} - Due {dueOn}
            </p>
            {paidOnLabel ? (
              <p className="text-sm text-green-700">{paidOnLabel}</p>
            ) : (
              <p className="text-sm text-gray-500">Invoice not paid yet.</p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              {canIssueRefund && <RefundInvoiceButton invoiceId={invoice.id} />}
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-400">Amount due</p>
                <p className="text-2xl font-semibold text-gray-900">{amountDueLabel}</p>
              </div>
              {isPayable && (
                <PayNowButton
                  sellerId={invoice.userId}
                  invoiceId={invoice.id}
                  amountDue={amountDueValue}
                  currency={invoice.currency ?? 'USD'}
                />
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/dashboard/invoices"
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-white cursor-pointer"
            >
              &larr; Back to Invoices
            </Link>
            <Link
              href={`/dashboard/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 cursor-pointer"
            >
              Download PDF
            </Link>
            {invoice.shortCode && (
              <Link
                href={`/p/${invoice.shortCode}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-400 hover:bg-emerald-100 cursor-pointer"
              >
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                View Public Invoice
              </Link>
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700">Bill To</h2>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              {client ? (
                <>
                  <p className="font-medium text-gray-900">{client.companyName || 'Unnamed Client'}</p>
                  {client.contactName && <p>{client.contactName}</p>}
                  {client.email && <p>{client.email}</p>}
                  {client.phone && <p>{client.phone}</p>}
                  {[client.addressLine1, client.addressLine2].filter(Boolean).join(', ')}
                  <p>
                    {[client.city, client.state, client.postalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                  {client.country && <p>{client.country}</p>}
                </>
              ) : (
                <p className="font-medium text-gray-900">Client record unavailable</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700">Summary</h2>
            <dl className="mt-3 space-y-3 text-sm text-gray-700">
              <div className="flex items-center justify-between">
                <dt>Subtotal</dt>
                <dd className="font-medium text-gray-900">{formatCurrency(totals.subtotal)}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt>Tax</dt>
                <dd className="font-medium text-gray-900">{formatCurrency(totals.tax)}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3">
                <dt className="font-semibold text-gray-900">Total</dt>
                <dd className="text-lg font-semibold text-gray-900">{formatCurrency(totals.total)}</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Description
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Qty
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Unit Price
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Tax %
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                  Line Total
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {invoice.items.map((item) => {
                const quantity = Number(item.quantity) || 0;
                const unitPrice = Number(item.unitPrice) || 0;
                const rate = Number(item.taxRate) || 0;
                const lineSubtotal = quantity * unitPrice;
                const lineTax = lineSubtotal * (rate / 100);
                const lineTotal = lineSubtotal + lineTax;

                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-900">{item.description || item.name}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700">{quantity}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700">{formatCurrency(unitPrice)}</td>
                    <td className="px-6 py-4 text-right text-sm text-gray-700">{rate}%</td>
                    <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(lineTotal)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {invoice.notes && (
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700">Notes</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-700">{invoice.notes}</p>
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold text-gray-700">Payments</h2>
          <div className="mt-3 space-y-4 text-sm text-gray-600">
            {!paymentRecords.length ? (
              <p className="text-gray-500">No payment attempts yet.</p>
            ) : (
              <div className="overflow-hidden rounded-lg border border-gray-100">
                <table className="min-w-full divide-y divide-gray-200 text-left text-xs uppercase tracking-wider text-gray-500">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Amount</th>
                      <th className="px-4 py-3">Paid at</th>
                      <th className="px-4 py-3">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white text-xs text-gray-700">
                    {paymentRecords.map((payment) => {
                      const createdAtLabel = new Date(payment.createdAt).toLocaleString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: 'numeric',
                        minute: 'numeric',
                      });
                      const paidAtLabel = payment.paidAt
                        ? new Date(payment.paidAt).toLocaleDateString()
                        : '-';
                      return (
                        <tr key={payment.id}>
                          <td className="px-4 py-3">{createdAtLabel}</td>
                          <td className="px-4 py-3 font-semibold uppercase tracking-wide text-gray-800">
                            {payment.status}
                          </td>
                          <td className="px-4 py-3 text-right font-mono">
                            {formatCurrency(Number(payment.amount ?? 0))}
                          </td>
                          <td className="px-4 py-3">{paidAtLabel}</td>
                          <td className="px-4 py-3 text-xs text-red-700">
                            {payment.lastError ?? '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

