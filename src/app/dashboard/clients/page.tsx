// src/app/dashboard/clients/page.tsx
import Link from 'next/link';
import { prisma } from '@lib/prisma';

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { companyName: 'asc' },
    include: {
      _count: { select: { invoices: true } },
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-gray-900">Clients</h1>
            <p className="text-sm text-gray-500">View and manage all clients in one place.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-white cursor-pointer"
            >
              ← Back to Dashboard
            </Link>
            <Link
              href="/dashboard/clients/new"
              className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
            >
              + New Client
            </Link>
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">No clients yet.</p>
            <Link
              href="/dashboard/clients/new"
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 cursor-pointer"
            >
              Add your first client
            </Link>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Company
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Phone
                  </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                  Location
                </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Invoices
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {clients.map((client) => {
                  const location = [client.city, client.state, client.country].filter(Boolean).join(', ');
                  return (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/dashboard/clients/${client.id}`}
                            className="text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
                            aria-label={`Edit ${client.companyName}`}
                            title="Edit client"
                          >
                            ✎
                          </Link>
                          <span>{client.companyName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {client.contactName || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {client.email ? (
                          <a className="text-blue-600 hover:underline" href={`mailto:${client.email}`}>
                            {client.email}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {client.phone || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {location || '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {client._count.invoices}
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
