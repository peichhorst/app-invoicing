// src/app/dashboard/invoices/page.tsx
import Link from 'next/link';
import { prisma } from '@lib/prisma';
import { ResendButton } from '@components/ResendButton';

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    include: { client: true, items: true },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-gray-900">Invoices</h1>
            <p className="text-sm text-gray-500">Track, send, and download your invoices.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-white cursor-pointer"
            >
              ← Back to Dashboard
            </Link>
            <Link
              href="/dashboard/invoices/new"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
            >
              + New Invoice
            </Link>
          </div>
        </div>

        {invoices.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center shadow-sm">
            <p className="mb-4 text-gray-500">No invoices yet.</p>
            <Link
              href="/dashboard/invoices/new"
              className="text-blue-600 hover:underline font-medium cursor-pointer"
            >
              Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Invoice #
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
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {invoices.map((invoice) => {
                  const subtotal = invoice.items.reduce((sum, item) => {
                    const quantity = Number(item.quantity) || 0;
                    const unitPrice = Number(item.unitPrice) || 0;
                    return sum + unitPrice * quantity;
                  }, 0);
                  const taxRate = Number(invoice.taxRate) || 0;
                  const tax = subtotal * (taxRate / 100);
                  const total = subtotal + tax;
                  const dueDateLabel = invoice.dueDate
                    ? new Date(invoice.dueDate).toLocaleDateString()
                    : 'No due date';

                  return (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{invoice.invoiceNumber}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {invoice.client?.companyName || invoice.client?.contactName || 'No client'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            invoice.status === 'PAID'
                              ? 'bg-green-100 text-green-800'
                              : invoice.status === 'SENT'
                              ? 'bg-blue-100 text-blue-800'
                              : invoice.status === 'OVERDUE'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {dueDateLabel}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-3">
                          {invoice.status === 'DRAFT' ? (
                            <Link
                              href={`/dashboard/invoices/new?edit=${invoice.id}`}
                              className="text-blue-600 hover:underline font-medium cursor-pointer"
                            >
                              Edit
                            </Link>
                          ) : (
                            <>
                              <Link
                                href={`/dashboard/invoices/${invoice.id}`}
                                className="text-blue-600 hover:underline font-medium cursor-pointer"
                              >
                                View
                              </Link>
                              <Link
                                href={`/dashboard/invoices/${invoice.id}/pdf`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-gray-700 hover:underline font-medium cursor-pointer"
                              >
                                PDF
                              </Link>
                              <ResendButton invoiceId={invoice.id} />
                            </>
                          )}
                        </div>
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
  );
}
