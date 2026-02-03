// src/app/dashboard/clients/page.tsx
import Link from 'next/link';
import { Download, Eye, LogIn, Pencil, Plus, Users } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { describePlan } from '@/lib/plan';
import ClientsCsvTools from './ClientsCsvTools';
import { AssignClientSelect } from './AssignClientSelect';
import DeleteClientButton from './DeleteClientButton';
import { Fragment } from 'react';

export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: any;
};

export default async function Page({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="p-8 text-center text-red-600">Not authenticated</div>;
  }
  // Debug output for clients removed (console.log can break Next.js serverless/toggle logic)

  const isAdmin = user.role === 'ADMIN';
  const isOwner = user.role === 'OWNER';
  const isOwnerOrAdmin = isOwner || isAdmin;
  const companyId = user.companyId ?? undefined;
  const hasCompany = !!companyId;
  const plan = await describePlan(user);
  const isPro = plan.planTier === 'PRO' || plan.planTier === 'PRO_TRIAL';

  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : undefined;
  const scopeValue = isOwnerOrAdmin
    ? resolvedSearchParams?.scope === 'my'
      ? 'my'
      : 'all'
    : 'my';

  // Simple sorting - you can expand later
  const sortBy = 'company' as const;
  const sortOrder = 'asc' as const;

  // Show assigned clients when scope is 'my'; else show all
  const listWhere =
    scopeValue === 'my'
      ? { companyId: companyId ? { equals: companyId } : undefined, assignedToId: user.id, archived: false }
      : { companyId: companyId ? { equals: companyId } : undefined, archived: false };

  // If user is not owner/admin, filter leads to only those assigned to them
  const leadsWhere = isOwnerOrAdmin
    ? { companyId: companyId ? { equals: companyId } : undefined, archived: false, isLead: true }
    : { companyId: companyId ? { equals: companyId } : undefined, assignedToId: user.id, archived: false, isLead: true };

  // Fetch clients (isLead: false)
  const clients = await prisma.client.findMany({
    where: { ...listWhere, isLead: false },
    orderBy: [
      { companyName: sortOrder },
      { contactName: sortOrder },
      { assignedTo: { name: 'asc' } },
    ],
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      company: { select: { name: true } },
      _count: { select: { invoices: true } },
      lead: true,
    },
  });

  // Debug output removed

  // Fetch leads (isLead: true)
  const leads = await prisma.client.findMany({
    where: leadsWhere,
    orderBy: [
      { companyName: sortOrder },
      { contactName: sortOrder },
      { assignedTo: { name: 'asc' } },
    ],
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      company: { select: { name: true } },
      _count: { select: { invoices: true } },
    },
  });

  const myClients = clients.filter((client) => client.assignedToId === user.id);
  const teamClients = clients.filter((client) => client.assignedToId !== user.id);
  const groupedClients =
    scopeValue === 'all'
      ? [
          { label: 'My Clients', clients: myClients, highlight: true },
          { label: 'Team Clients', clients: teamClients, highlight: false },
        ].filter((section) => section.clients.length > 0)
      : [{ label: 'My Clients', clients, highlight: true }];
  const columnCount = isOwnerOrAdmin ? 8 : 7;

  const assignableUsers = isOwnerOrAdmin
    ? await prisma.user.findMany({
        where: { companyId },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      })
    : [];
  const hasOtherUsers = assignableUsers.length > 1;
  const showScopeToggle = isOwnerOrAdmin && hasOtherUsers;

  // ... rest of your limit logic

  const renderArrow = (column: string, direction: 'asc' | 'desc') => {
    const isActive = sortBy === column && sortOrder === direction;
    const symbol = direction === 'asc' ? '^' : 'v';
    return isActive ? <span className="ml-1 text-zinc-400">{symbol}</span> : null;
  };

  const getDisplayName = (client: any) => {
    const company = client.companyName?.trim();
    const contact = client.contactName?.trim();
    const email = client.email?.trim();
    if (company) {
      return company;
    }
    return contact || email || 'Unnamed Client';
  };

  const getSubLine = (client: any) => {
    const company = client.companyName?.trim();
    const contact = client.contactName?.trim();
    const email = client.email?.trim();
    if (!company) return '';
    return contact || email || '';
  };

  const getStatusBadge = (client: any) => {
    if (client.isLead) {
      return ['Lead', 'border border-amber-200 bg-amber-50 text-amber-700'] as const;
    }
    const label = client.status || 'Client';
    const isConverted = label === 'Converted From Lead';
    return [
      label,
      isConverted
        ? 'border border-blue-200 bg-blue-50 text-blue-700'
        : 'border border-amber-200 bg-amber-50 text-amber-700',
    ] as const;
  };

  // Helper to normalize and display the source
  const getSourceLabel = (client: any) => {
    const src = (client.source || '').toString().toLowerCase();
    if (src === 'converted_from_lead' || src === 'converted from lead') return 'Converted From Lead';
    if (!src || src === 'manually_entered' || src === 'manually entered') return 'Manually Entered';
    return client.source;
  };


  let limitCount: number | null = null;
  if (hasCompany) {
    limitCount = await prisma.client.count({
      where: { companyId: companyId ? { equals: companyId } : undefined, archived: false },
    });
  }

  const limitCap = isPro ? null : 3;
  const slotsRemaining = limitCap === null ? null : Math.max(limitCap - (limitCount ?? clients.length), 0);
  const canCreateMore = isPro || (slotsRemaining ?? 0) > 0 || !hasCompany;
  const canImportCsv = isPro || (slotsRemaining ?? 0) > 0 || !hasCompany;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Clients</h1>
          <p className="mt-1 text-sm text-zinc-500">View and manage clients.</p>
        </div>
        {showScopeToggle && (
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-600">
              <Link
                href="/dashboard/clients?scope=all"
                className={`rounded-full px-3 py-1 border transition ${scopeValue === 'all'
                  ? 'bg-brand-primary-600 border-brand-primary-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:text-brand-primary-700'}`}
                aria-current={scopeValue === 'all' ? 'page' : undefined}
                prefetch={false}
              >
              All Clients
              </Link>
              <Link
                href="/dashboard/clients?scope=my"
                className={`rounded-full px-3 py-1 border transition ${scopeValue === 'my'
                  ? 'bg-brand-primary-600 border-brand-primary-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:text-brand-primary-700'}`}
                aria-current={scopeValue === 'my' ? 'page' : undefined}
                prefetch={false}
              >
                My Clients
            </Link>
          </div>
        )}
        </div>

        {clients.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-white p-12 text-center">
            <Users className="mx-auto h-12 w-12 text-zinc-400" />
            <h3 className="mt-4 text-lg font-medium text-zinc-900">No clients yet</h3>
            <p className="mt-2 text-sm text-zinc-500">
              Create your first client to get started.
            </p>
            <Link
              href="/dashboard/clients/new"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700"
            >
              <Plus className="h-4 w-4" />
              Add Your First Client
            </Link>
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className="space-y-4 md:hidden">
              {groupedClients.map((group) => (
                <div key={group.label}>
                  <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500 mb-2">{group.label}</p>
                  <div className="space-y-4">
                    {group.clients.map((client) => {
                      const c = client as any;
                      return (
                        <div key={client.id} className="rounded-lg border bg-white p-4 shadow-sm">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-medium text-gray-900">{getDisplayName(client)}</p>
                              {getSubLine(client) && (
                                <p className="text-sm text-gray-600">{getSubLine(client)}</p>
                              )}
                              {client.email && (
                                <p className="text-sm text-gray-500">
                                  <a href={`mailto:${client.email}`} className="text-brand-primary-600 hover:underline">
                                    {client.email}
                                  </a>
                                </p>
                              )}
                              {client.phone && (
                                <p className="text-sm text-gray-500">
                                  <a
                                    href={`tel:${client.phone}`}
                                    className="text-brand-primary-600 hover:underline"
                                  >
                                    {client.phone}
                                  </a>
                                </p>
                              )}
                            </div>
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadge(client)[1]}`}>
                              {getStatusBadge(client)[0]}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                            <span>{c._count?.invoices ?? 0} invoices</span>
                            {isOwnerOrAdmin && c.assignedTo && (
                              <span>Assigned to {c.assignedTo?.name ?? ''}</span>
                            )}
                          </div>
                          {isOwnerOrAdmin && (
                            <div className="mt-4">
                              <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Reassign</p>
                              <AssignClientSelect
                                clientId={client.id}
                                currentAssigneeId={c.assignedTo?.id ?? ''}
                                options={assignableUsers}
                              />
                            </div>
                          )}
                          <div className="flex gap-2 mt-4 flex-wrap">
                            <Link
                              href={`/dashboard/clients/${client.id}`}
                              className="flex-1 inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white px-3 py-2 text-xs font-semibold text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                              title="Admin: View and manage this client profile"
                              aria-label="Admin: View and manage this client profile"
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                              <span className="ml-1">Admin View</span>
                            </Link>
                            {isOwner && (
                              <Link
                                href={`/portal?clientId=${client.id}&impersonate=1`}
                                className="flex-1 inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white px-3 py-2 text-xs font-semibold text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                                title="Client Portal: See what your client sees (impersonation mode)"
                                aria-label="Client Portal: See what your client sees (impersonation mode)"
                              >
                                <LogIn className="h-4 w-4" aria-hidden="true" />
                                <span className="ml-1">Client Portal</span>
                              </Link>
                            )}
                            <Link
                              href={`/dashboard/clients/${client.id}/edit`}
                              className="flex-1 inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white px-3 py-2 text-xs font-semibold text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                              title="Edit client"
                            >
                              <Pencil className="h-4 w-4" aria-hidden="true" />
                              <span className="ml-1">Edit</span>
                            </Link>
                            <DeleteClientButton
                              clientId={client.id}
                              clientName={client.companyName || client.contactName || 'this client'}
                              disabled={c._count?.invoices > 0}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm">
              <div className="relative max-h-[70vh] overflow-x-auto overflow-y-auto">
                <table className="w-full min-w-[700px] divide-y divide-zinc-200">
                  <thead className="sticky top-0 z-10 bg-zinc-50">
                    <tr className="divide-x divide-zinc-200">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                        <div className="flex items-center gap-2">
                          Name
                          <div className="flex items-center text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-zinc-400">
                            {renderArrow('company', 'asc')}
                            {renderArrow('company', 'desc')}
                          </div>
                        </div>
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Invoices</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Source</th>
                      {isOwnerOrAdmin && (
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Assigned To</th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {groupedClients.map((group) => (
                      <Fragment key={group.label}>
                        {group.label && (
                          <tr>
                            <td
                              colSpan={columnCount}
                              className="px-6 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500 bg-zinc-50"
                            >
                              {group.label}
                            </td>
                          </tr>
                        )}
                        {group.clients.map((client) => (
                          <tr key={client.id} className="hover:bg-gray-50 divide-x divide-gray-200">
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-zinc-900">{getDisplayName(client)}</span>
                                {getSubLine(client) && (
                                  <span className="text-xs text-zinc-500">{getSubLine(client)}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-zinc-700">
                              {client.email ? (
                                <a className="text-brand-primary-600 hover:underline" href={`mailto:${client.email}`}>
                                  {client.email}
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                              <td className="px-6 py-4 text-zinc-700">
                                {client.phone ? (
                                  <a
                                    className="text-brand-primary-600 hover:underline whitespace-nowrap"
                                    href={`tel:${client.phone}`}
                                  >
                                    {client.phone}
                                  </a>
                                ) : (
                                  '—'
                                )}
                              </td>
                            <td className="px-6 py-4">
                              {(() => {
                                const [statusLabel, statusClasses] = getStatusBadge(client);
                                return (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.15em] ${statusClasses}`}
                                  >
                                    {statusLabel}
                                  </span>
                                );
                              })()}
                            </td>
                            <td className="px-6 py-4 text-center text-zinc-700">{(client as any)._count?.invoices ?? 0}</td>
                            <td className="px-6 py-4 text-zinc-700">{getSourceLabel(client)}</td>
                            {isOwnerOrAdmin && (
                              <td className="px-6 py-4">
                                <AssignClientSelect
                                  clientId={client.id}
                                  currentAssigneeId={(client as any).assignedTo?.id ?? ''}
                                  options={assignableUsers}
                                />
                              </td>
                            )}
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex gap-2">
                                <Link
                                  href={`/dashboard/clients/${client.id}`}
                                  className="inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white p-2 text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                                  title="View client"
                                >
                                  <Eye className="h-4 w-4" aria-hidden="true" />
                                </Link>
                                {isOwner && (
                                  <Link
                                    href={`/portal?clientId=${client.id}&impersonate=1`}
                                    className="inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white p-2 text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                                    title="Login as client"
                                    aria-label="Login as client in portal"
                                  >
                                    <LogIn className="h-4 w-4" aria-hidden="true" />
                                  </Link>
                                )}
                                <Link
                                  href={`/dashboard/clients/${client.id}/edit`}
                                  className="inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white p-2 text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                                  title="Edit client"
                                >
                                  <Pencil className="h-4 w-4" aria-hidden="true" />
                                </Link>
                                <DeleteClientButton
                                  clientId={client.id}
                                  clientName={client.companyName || client.contactName || 'this client'}
                                  disabled={(client as any)._count?.invoices > 0}
                                />
                              </div>
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-4">
              <a
                href="/api/exports/clients"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-lg border border-brand-primary-300 bg-white px-4 py-3 text-sm font-semibold text-gray-900 shadow-sm transition hover:border-brand-primary-600 hover:bg-brand-primary-600 hover:text-[var(--color-brand-contrast)]"
              >
                <Download className="h-4 w-4" />
                Export clients
              </a>
              {canCreateMore ? (
                <Link
                  href="/dashboard/clients/new"
                  className="ml-auto inline-flex items-center gap-2 rounded-lg border border-brand-primary-300 bg-brand-primary-600 px-4 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:border-brand-primary-600 hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)]"
                >
                  <Plus className="h-4 w-4" />
                  New Client
                </Link>
              ) : (
                <Link
                  href="/dashboard/profile"
                  className="ml-auto inline-flex items-center justify-center gap-2 rounded-lg bg-brand-primary-600 px-6 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)]"
                >
                  Upgrade to Add More Clients
                </Link>
              )}
            </div>
          </>
        )}
        <ClientsCsvTools slotsRemaining={slotsRemaining} canImport={canImportCsv} />
      </div>
  );
}
