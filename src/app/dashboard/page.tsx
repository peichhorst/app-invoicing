// src/app/dashboard/page.tsx
import { prisma } from '@lib/prisma';
import Link from 'next/link';
import { ResendButton } from '@components/ResendButton';

export default async function Dashboard() {
  const invoices = await prisma.invoice.findMany({
    include: {
      client: true,
      items: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
          <Link
            href="/dashboard/invoices/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition cursor-pointer"
          >
            New Invoice
          </Link>
        </div>

      <Link
  href="/dashboard/clients/new"
  className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-green-700 transition"
>
  + New Client
</Link>


        {invoices.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 mb-4">No invoices yet.</p>
            <Link
              href="/dashboard/invoices/new"
              className="text-blue-600 hover:underline font-medium cursor-pointer"
            >
              Create your first invoice
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice #
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
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
