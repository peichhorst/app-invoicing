// src/app/dashboard/clients/page.tsx
import Link from 'next/link';
import { Plus, Pencil } from 'lucide-react';
import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { describePlan } from '@/lib/plan';
import ClientsCsvTools from './ClientsCsvTools';
import { DeleteClientButton } from './DeleteClientButton';

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined> | URLSearchParams>;
};

function normalizeSearchParams(params?: Awaited<PageProps['searchParams']>): Record<string, string | string[] | undefined> {
  if (!params) return {};
  if (params instanceof URLSearchParams) {
    const normalized: Record<string, string | string[] | undefined> = {};
    params.forEach((value, key) => {
      if (!value) return;
      if (normalized[key]) {
        const existing = normalized[key];
        if (Array.isArray(existing)) {
          existing.push(value);
        } else {
          normalized[key] = [existing, value];
        }
      } else {
        normalized[key] = value;
      }
    });
    return normalized;
  }
  return params;
}

export const dynamic = 'force-dynamic';

export default async function ClientsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="p-6 text-sm text-red-600">Unauthorized</div>;
  }

  const plan = describePlan(user);
  const isPro = plan.effectiveTier === 'PRO';

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const normalizedSearch = normalizeSearchParams(resolvedSearchParams);
  const requestedSort = Array.isArray(normalizedSearch.sort) ? normalizedSearch.sort[0] : normalizedSearch.sort;
  const requestedSortBy = Array.isArray(normalizedSearch.sortBy) ? normalizedSearch.sortBy[0] : normalizedSearch.sortBy;

  // Default to 'company' column and ascending order
  const sortBy = requestedSortBy === 'contact' ? 'contact' : 'company';
  const sortOrder: 'asc' | 'desc' = requestedSort === 'desc' ? 'desc' : 'asc';

  const baseParams = new URLSearchParams();
  Object.entries(normalizedSearch).forEach(([key, value]) => {
    if (!value || key === 'sort' || key === 'sortBy') return;
    if (Array.isArray(value)) {
      value.forEach((item) => item && baseParams.append(key, item));
    } else {
      baseParams.append(key, value);
    }
  });

  const buildSortUrl = (order: 'asc' | 'desc', column: 'company' | 'contact') => {
    const params = new URLSearchParams(baseParams);
    params.set('sort', order);
    params.set('sortBy', column);
    const query = params.toString();
    return query ? `/dashboard/clients?${query}` : '/dashboard/clients';
  };

  const renderArrow = (column: 'company' | 'contact', direction: 'asc' | 'desc') => {
    const symbol = direction === 'asc' ? '▲' : '▼';
    const isActive = sortBy === column && sortOrder === direction;
    const className = `px-1 text-[0.65rem] leading-none ${isActive ? 'text-zinc-400' : 'text-purple-600 hover:text-purple-700'}`;

    if (isActive) {
      return (
        <span className={className} aria-label={`Sorted ${direction === 'asc' ? 'ascending' : 'descending'}`}>
          {symbol}
        </span>
      );
    }

    return (
      <Link
        href={buildSortUrl(direction, column)}
        className={className}
        aria-label={`Sort ${direction === 'asc' ? 'ascending' : 'descending'}`}
      >
        {symbol}
      </Link>
    );
  };

  const orderClause =
    sortBy === 'contact'
      ? { contactName: sortOrder }
      : { companyName: sortOrder };

  const clients = await prisma.client.findMany({
    where: { userId: user.id, archived: false },
    orderBy: orderClause,
    include: {
      _count: { select: { invoices: true } },
    },
  });

  const canCreateMore = isPro || clients.length < 3;
  const slotsRemaining = isPro ? null : Math.max(3 - clients.length, 0);
  const canImportCsv = isPro || (slotsRemaining ?? 0) > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-gray-900">Clients</h1>
            <p className="text-sm text-gray-500">View and manage all clients in one place.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/api/exports/clients"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-white"
            >
              Export clients
            </a>
            {canCreateMore ? (
              <Link
                href="/dashboard/clients/new"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
              >
                <Plus className="h-4 w-4" />
                New Client
              </Link>
            ) : (
              <Link
                href="/dashboard/profile"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
              >
                Upgrade to Add More Clients
              </Link>
            )}
          </div>
        </div>

        {clients.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-10 text-center shadow-sm">
            <p className="text-gray-500">No clients yet.</p>
            <Link
              href="/dashboard/clients/new"
              className="mt-3 inline-flex items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
            >
              Add your first client
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto w-full max-w-full rounded-xl border border-gray-200 bg-white shadow-sm p-4 sm:p-6">
            <table className="w-full min-w-full table-auto divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr className="divide-x divide-gray-200">
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <div className="flex items-center gap-2">
                      Company
                      <div className="flex items-center text-xs font-semibold uppercase tracking-[0.3em]">
                        {renderArrow('company', 'asc')}
                        {renderArrow('company', 'desc')}
                      </div>
                    </div>
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <div className="flex items-center gap-2">
                      Contact
                      <div className="flex items-center text-xs font-semibold uppercase tracking-[0.3em]">
                        {renderArrow('contact', 'asc')}
                        {renderArrow('contact', 'desc')}
                      </div>
                    </div>
                  </th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
                  <th className="px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Invoices</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 divide-x divide-gray-200">
                    <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{client.companyName}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">{client.contactName || '—'}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">
                      {client.email ? (
                        <a className="text-purple-600 hover:underline" href={`mailto:${client.email}`}>
                          {client.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">{client.phone || '—'}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-sm text-gray-600">{client._count.invoices}</td>
                    <td className="px-5 py-4 whitespace-nowrap text-right text-sm text-gray-600">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/dashboard/clients/${client.id}`}
                          className="inline-flex items-center justify-center gap-1 rounded-lg border border-purple-200 px-3 py-1.5 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50"
                          title="Edit client"
                        >
                          <Pencil className="h-4 w-4" aria-hidden="true" />
                          <span className="sr-only">Edit</span>
                        </Link>
                        <DeleteClientButton clientId={client.id} companyName={client.companyName} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <ClientsCsvTools slotsRemaining={slotsRemaining} canImport={canImportCsv} />
      </div>
    </div>
  );
}
