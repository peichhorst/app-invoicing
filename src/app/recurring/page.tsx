import Link from 'next/link';
import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const badgeStyles = {
  ACTIVE: 'bg-purple-50 text-purple-700',
  PAUSED: 'bg-yellow-50 text-yellow-800',
  CANCELLED: 'bg-rose-50 text-rose-700',
} as const;

const frequencyLabels: Record<string, string> = {
  week: 'Weekly',
  month: 'Monthly',
  quarter: 'Quarterly',
  year: 'Yearly',
};

const formatCurrency = (value: string | number) => {
  const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
  return formatter.format(Number(value));
};

export default async function RecurringPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="p-6 text-sm text-red-600">Unauthorized</div>;
  }

  const recurringInvoices = await prisma.recurringInvoice.findMany({
    where: { userId: user.id },
    include: { client: true },
    orderBy: { nextSendDate: 'asc' },
  });

  const actionButton =
    'inline-flex items-center justify-center gap-1 rounded-full border border-purple-500 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-purple-700 transition hover:bg-purple-50';

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
         
            <h1 className="text-3xl font-semibold text-gray-900">Recurring Invoices</h1>
            <p className="text-sm text-gray-500">Schedule repeat billing for your clients.</p>
          </div>
          
          <Link href="/dashboard/invoices/new?recurring=true" className="inline-flex items-center rounded-2xl bg-purple-700 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:bg-purple-600">
            + New recurring invoice
          </Link>
        </div>

        {recurringInvoices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-purple-200 bg-white/60 p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-900">No recurring invoices yet</p>
            <p className="mt-2 text-sm text-gray-500">Create a recurring invoice to automatically bill your clients.</p>
            <div className="mt-6">
              <Link href="/dashboard/invoices/new?recurring=true" className="inline-flex items-center rounded-full border border-purple-500 bg-white px-4 py-2 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50">
                + New recurring invoice
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Title / Client
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
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {recurringInvoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="text-sm font-semibold text-gray-900">{invoice.title}</div>
                        <div className="text-xs text-zinc-500">{invoice.client?.companyName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.amount.toString())}
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
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Link href="/dashboard/invoices/new?recurring=true" className="text-xs font-semibold text-purple-600 underline hover:text-purple-500">
                            Edit
                          </Link>
                          <button type="button" className="text-xs font-semibold text-zinc-600 hover:text-zinc-900">
                            Pause
                          </button>
                          <button type="button" className="text-xs font-semibold text-zinc-600 hover:text-zinc-900">
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
