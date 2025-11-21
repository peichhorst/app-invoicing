import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@/lib/auth';

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

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, userId: user.id },
    include: {
      client: true,
      items: true,
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

  const issuedOn = invoice.issueDate ? new Date(invoice.issueDate).toLocaleDateString() : '—';
  const dueOn = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'No due date';

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <p className="text-sm text-gray-500">
              Invoice #{invoice.invoiceNumber} - {invoice.status}
            </p>
            <h1 className="text-3xl font-semibold text-gray-900">Invoice Details</h1>
            <p className="text-sm text-gray-500">
              Issued on {issuedOn} - Due {dueOn}
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition hover:border-gray-300 hover:bg-white cursor-pointer"
            >
              Back to Dashboard
            </Link>
            <Link
              href={`/dashboard/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-gray-800 cursor-pointer"
            >
              Download PDF
            </Link>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-gray-700">Bill To</h2>
            <div className="mt-2 space-y-1 text-sm text-gray-600">
              <p className="font-medium text-gray-900">{invoice.client.companyName}</p>
              {invoice.client.contactName && <p>{invoice.client.contactName}</p>}
              {invoice.client.email && <p>{invoice.client.email}</p>}
              {invoice.client.phone && <p>{invoice.client.phone}</p>}
              {[invoice.client.addressLine1, invoice.client.addressLine2].filter(Boolean).join(', ')}
              <p>
                {[invoice.client.city, invoice.client.state, invoice.client.postalCode]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              {invoice.client.country && <p>{invoice.client.country}</p>}
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
      </div>
    </div>
  );
}
