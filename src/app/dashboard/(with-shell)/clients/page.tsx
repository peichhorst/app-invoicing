// src/app/dashboard/clients/page.tsx
import Link from 'next/link';
import { Download, Plus, Pencil, ArrowUpRight } from 'lucide-react';
import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { describePlan } from '@/lib/plan';
import ClientsCsvTools from './ClientsCsvTools';
import { DeleteClientButton } from './DeleteClientButton';
import { clientVisibilityWhere } from '@/lib/client-scope';
import { AssignClientSelect } from './AssignClientSelect';
import { ConvertLeadButton } from './ConvertLeadButton';

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

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const normalizedSearch = normalizeSearchParams(resolvedSearchParams);
  const requestedSort = Array.isArray(normalizedSearch.sort) ? normalizedSearch.sort[0] : normalizedSearch.sort;
  const requestedSortBy = Array.isArray(normalizedSearch.sortBy) ? normalizedSearch.sortBy[0] : normalizedSearch.sortBy;
  const scopeParam = Array.isArray(normalizedSearch.scope) ? normalizedSearch.scope[0] : normalizedSearch.scope;
  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const isAdmin = user.role === 'ADMIN';
  const companyId = user.companyId ?? user.company?.id ?? null;
  const hasCompany = Boolean(companyId);
  // Admins fall back to global view if no company is attached
  const scope: 'all' | 'my' =
    isOwnerOrAdmin && hasCompany ? (scopeParam === 'my' ? 'my' : 'all') : isOwnerOrAdmin ? 'all' : 'my';

  const plan = describePlan(user);
  const isPro = plan.effectiveTier === 'PRO';

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
  if (scope === 'my') {
    baseParams.set('scope', 'my');
  } else {
    baseParams.delete('scope');
  }

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

  const listWhere =
    scope === 'my'
      ? { companyId: companyId ?? undefined, assignedToId: user.id, archived: false }
      : isOwnerOrAdmin && !hasCompany
      ? { archived: false }
      : { companyId: companyId ?? undefined, archived: false };

  const clients = await prisma.client.findMany({
    where: listWhere,
    orderBy: [
      { company: { name: sortOrder } },
      orderClause,
      { assignedTo: { name: 'asc' } },
    ],
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      company: { select: { name: true } },
      _count: { select: { invoices: true } },
    },
  });

  let limitCount: number | null = null;
  if (hasCompany) {
    limitCount = await prisma.client.count({
      where: { ...clientVisibilityWhere(user), archived: false },
    });
  }
  const limitCap = isPro ? null : 3;
  const slotsRemaining =
    limitCap === null ? null : Math.max(limitCap - (limitCount ?? clients.length), 0);
  const canCreateMore = isPro || (slotsRemaining ?? 0) > 0 || !hasCompany;
  const canImportCsv = isPro || (slotsRemaining ?? 0) > 0 || !hasCompany;

  const assignableUsers = isOwnerOrAdmin
    ? await prisma.user.findMany({
        where: { companyId },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-10 sm:px-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold text-gray-900">Clients</h1>
            <p className="text-sm text-gray-500">View and manage all clients in one place.</p>
          </div>
          {isOwnerOrAdmin && (
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-600">
              <Link
                href="/dashboard/clients"
                className={`rounded-full px-3 py-1 ${scope === 'all' ? 'bg-purple-100 text-purple-700' : 'hover:text-purple-700'}`}
              >
                All Clients
              </Link>
              <Link
                href="/dashboard/clients?scope=my"
                className={`rounded-full px-3 py-1 ${scope === 'my' ? 'bg-purple-100 text-purple-700' : 'hover:text-purple-700'}`}
              >
                My Clients
              </Link>
            </div>
          )}
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
          <>
            <div className="overflow-x-auto rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <table className="w-full table-auto text-sm">
                <thead className="text-xs uppercase tracking-[0.3em] text-zinc-500">
                  <tr>
                    <th className="py-2 text-left">
                      <div className="flex items-center gap-2">
                        Name
                        <div className="flex items-center text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-zinc-400">
                          {renderArrow('company', 'asc')}
                          {renderArrow('company', 'desc')}
                        </div>
                      </div>
                    </th>
                    <th className="py-2 text-left">Email</th>
                    <th className="py-2 text-left">Phone</th>
                    <th className="py-2 text-left">Status</th>
                    <th className="py-2 text-left">Invoices</th>
                    <th className="py-2 text-right pr-2">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {clients.map((client) => (
                    <tr key={client.id} className="hover:bg-zinc-50">
                      <td className="py-3 pr-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-semibold text-zinc-900">
                            {isAdmin ? client.contactName || client.companyName : client.companyName}
                          </span>
                          {!isAdmin && client.contactName && (
                            <span className="text-xs text-zinc-500">{client.contactName}</span>
                          )}
                          {isOwnerOrAdmin && (
                            <div className="mt-2 space-y-1">
                              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-zinc-400">
                                Assigned to
                              </p>
                              <AssignClientSelect
                                clientId={client.id}
                                currentAssigneeId={client.assignedTo?.id ?? ''}
                                options={assignableUsers}
                              />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 pr-3 text-zinc-700">
                        {client.email ? (
                          <a className="text-purple-600 hover:underline" href={`mailto:${client.email}`}>
                            {client.email}
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-3 pr-3 text-zinc-700">{client.phone || '-'}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.15em] ${
                            client.isLead
                              ? 'border border-amber-200 bg-amber-50 text-amber-700'
                              : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {client.isLead ? 'Lead' : 'Client'}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-zinc-700">{client._count.invoices}</td>
                      <td className="py-3 text-right text-zinc-700">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {client.isLead && isOwnerOrAdmin && <ConvertLeadButton clientId={client.id} />}
                          {isAdmin && (
                            <Link
                              href={`/portal?clientId=${client.id}&impersonate=1`}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                              title="Log into client portal"
                            >
                              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                              <span className="sr-only">Portal</span>
                            </Link>
                          )}
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
            <div className="mt-0 flex flex-wrap items-center justify-between gap-3">
              <a
                href="/api/exports/clients"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-800 shadow-sm transition hover:border-gray-300 hover:bg-white"
              >
                <Download className="h-4 w-4" />
                Export clients
              </a>
              {canCreateMore ? (
                <Link
                  href="/dashboard/clients/new"
                  className="ml-auto inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                >
                  <Plus className="h-4 w-4" />
                  New Client
                </Link>
              ) : (
                <Link
                  href="/dashboard/profile"
                  className="ml-auto inline-flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
                >
                  Upgrade to Add More Clients
                </Link>
              )}
            </div>
          </>
        )}
        <ClientsCsvTools slotsRemaining={slotsRemaining} canImport={canImportCsv} />
      </div>
    </div>
  );
}
