import type { PaymentProvider, PaymentStatus } from '@prisma/client';

type PaymentActivityRow = {
  id: string;
  provider: PaymentProvider;
  status: PaymentStatus;
  amount: number;
  refundedAmount: number;
  currency: string;
  paidAt: Date | null;
  updatedAt: Date;
  createdAt: Date;
  stripePaymentIntentId: string | null;
  stripeChargeId: string | null;
  metadata: unknown;
  invoice: {
    id: string;
    invoiceNumber: string;
    client: {
      companyName: string | null;
      contactName: string | null;
    } | null;
  };
};

const formatCurrency = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: (currency || 'USD').toUpperCase(),
  }).format(Number.isFinite(value) ? value : 0);

const formatWhen = (value: Date | null) => {
  if (!value) return '-';
  return value.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const toSafeObject = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const toTitle = (value: string) =>
  value
    .replace(/_/g, ' ')
    .split(' ')
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(' ');

const getMethodLabel = (row: PaymentActivityRow) => {
  const metadata = toSafeObject(row.metadata);
  if (row.provider === 'manual') {
    const method = typeof metadata.manualPaymentMethod === 'string' ? metadata.manualPaymentMethod : '';
    const other =
      method === 'other' && typeof metadata.manualPaymentMethodOther === 'string'
        ? metadata.manualPaymentMethodOther.trim()
        : '';
    if (method === 'other' && other) return `Other (${other})`;
    if (method) return toTitle(method);
    return 'Manual';
  }

  const requested = typeof metadata.requestedPaymentMethod === 'string' ? metadata.requestedPaymentMethod : '';
  if (requested === 'us_bank_account') return 'Bank (ACH)';
  if (requested === 'card') return 'Card';
  return 'Stripe';
};

const getEventLabel = (row: PaymentActivityRow) => {
  if (row.status === 'refunded') return 'Refunded';
  if (row.status === 'partially_refunded') return 'Partially Refunded';
  if (row.status === 'succeeded') {
    return row.provider === 'manual' ? 'Marked Paid' : 'Paid Online';
  }
  if (row.status === 'failed') return 'Failed';
  if (row.status === 'canceled') return 'Canceled';
  if (row.status === 'processing') return 'Processing';
  return 'Initiated';
};

const getEventStyles = (row: PaymentActivityRow) => {
  if (row.status === 'refunded') return 'bg-rose-100 text-rose-700';
  if (row.status === 'partially_refunded') return 'bg-purple-100 text-purple-700';
  if (row.status === 'succeeded') return 'bg-emerald-100 text-emerald-700';
  if (row.status === 'failed') return 'bg-rose-100 text-rose-700';
  if (row.status === 'processing') return 'bg-amber-100 text-amber-700';
  return 'bg-zinc-100 text-zinc-700';
};

const getAmountImpact = (row: PaymentActivityRow) => {
  if (row.status === 'refunded') {
    return -Math.max(row.refundedAmount || row.amount, 0);
  }
  if (row.status === 'partially_refunded') {
    return -Math.max(row.refundedAmount, 0);
  }
  if (row.status === 'succeeded') {
    return Math.max(row.amount, 0);
  }
  return 0;
};

const getReference = (row: PaymentActivityRow) =>
  row.stripePaymentIntentId || row.stripeChargeId || row.id;

export default function PaymentsActivityTable({ rows }: { rows: PaymentActivityRow[] }) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold text-gray-900">Payments Activity</h2>
        <p className="text-sm text-zinc-500">
          Consolidated history of paid and refunded activity across Stripe and manual payments.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
            <thead className="bg-zinc-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">When</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Invoice</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Client</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Event</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Source</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Method</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Amount Impact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {rows.map((row) => {
                const impact = getAmountImpact(row);
                const when = row.paidAt ?? row.updatedAt ?? row.createdAt;
                const clientLabel =
                  row.invoice.client?.companyName || row.invoice.client?.contactName || 'No client';
                return (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-sm text-zinc-700">{formatWhen(when)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-zinc-900">#{row.invoice.invoiceNumber}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{clientLabel}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getEventStyles(row)}`}>
                        {getEventLabel(row)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{row.provider === 'stripe' ? 'Stripe' : 'Manual'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-700">{getMethodLabel(row)}</td>
                    <td
                      className={`px-4 py-3 text-right text-sm font-semibold ${
                        impact > 0 ? 'text-emerald-700' : impact < 0 ? 'text-rose-700' : 'text-zinc-500'
                      }`}
                    >
                      {impact === 0
                        ? '-'
                        : `${impact > 0 ? '+' : '-'}${formatCurrency(Math.abs(impact), row.currency)}`}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">{getReference(row)}</td>
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-zinc-500">
                    No payment activity yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
