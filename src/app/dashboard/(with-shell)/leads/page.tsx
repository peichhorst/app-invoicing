import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import Link from 'next/link';
import { Fragment } from 'react';
import { Users, Plus, Eye } from 'lucide-react';
import { LeadCsvTools } from './LeadCsvTools';
import { AssignLeadSelect } from './AssignLeadSelect';
import { DeleteLeadButton } from './DeleteLeadButton';
import { formatSourceLabel } from '@/lib/format-source';

// Ensure this page is always rendered dynamically so searchParams update correctly
export const dynamic = 'force-dynamic';

type PageProps = {
  searchParams?: any;
};

export default async function LeadsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  const isAdmin = user.role === 'ADMIN';
  const isOwner = user.role === 'OWNER';
  const isOwnerOrAdmin = isOwner || isAdmin;
  const companyId = user.companyId ?? undefined;

  // Read from searchParams
  const resolvedSearchParams = searchParams ? await Promise.resolve(searchParams) : undefined;
  const scopeValue = isOwnerOrAdmin
    ? resolvedSearchParams?.scope === 'my'
      ? 'my'
      : 'all'
    : 'my';
  const showAllLeads = scopeValue === 'all';
  // Always show all leads for the user's company, regardless of assignment or ownership

  // Only show scope toggle if there are other users besides current user
  const assignableUsers = isOwnerOrAdmin
      ? await prisma.user.findMany({
          where: { companyId },
          select: { id: true, name: true, email: true },
          orderBy: { name: 'asc' },
        })
      : [];
  const hasOtherUsers = assignableUsers.length > 1;

  // Filtering logic: only show assigned leads to regular users
  const leadsWhere = showAllLeads
    ? { companyId: companyId ? { equals: companyId } : undefined, archived: false }
    : { companyId: companyId ? { equals: companyId } : undefined, assignedToId: user.id, archived: false };

  let leads = await prisma.lead.findMany({
    where: leadsWhere,
    orderBy: [
      { companyName: 'asc' },
      { name: 'asc' },
      { assignedTo: { name: 'asc' } },
    ],
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
    },
  });

  const myLeads = leads.filter((lead: any) => lead.assignedToId === user.id);
  const otherLeads = scopeValue === 'all' ? leads.filter((lead: any) => lead.assignedToId !== user.id) : [];
  const groupedLeads =
    scopeValue === 'all'
      ? [
          { label: 'My Leads', leads: myLeads, highlight: true },
          { label: 'Team Leads', leads: otherLeads, highlight: false },
        ].filter((section) => section.leads.length > 0)
      : [{ label: 'My Leads', leads, highlight: true }];
  const columnCount = isOwnerOrAdmin ? 8 : 7;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900">Leads</h1>
          <p className="mt-1 text-sm text-zinc-500">Manage your prospects and potential clients</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Link
            href="/dashboard/leads/new"
            className="inline-flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add New Lead
          </Link>
          {isOwnerOrAdmin && hasOtherUsers && (
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-600">
              <Link
                href="/dashboard/leads?scope=all"
                className={`rounded-full px-3 py-1 border transition ${scopeValue === 'all'
                  ? 'bg-brand-primary-600 border-brand-primary-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:text-brand-primary-700'}`}
              >
                All Leads
              </Link>
              <Link
                href="/dashboard/leads?scope=my"
                className={`rounded-full px-3 py-1 border transition ${scopeValue === 'my'
                  ? 'bg-brand-primary-600 border-brand-primary-600 text-white'
                  : 'bg-white border-gray-200 text-gray-600 hover:text-brand-primary-700'}`}
              >
                My Leads
              </Link>
            </div>
          )}
        </div>
      </div>


      {/* Mobile Card View */}
      {leads.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-zinc-200 bg-white p-12 text-center mt-8">
          <Users className="mx-auto h-12 w-12 text-zinc-400" />
          <h3 className="mt-4 text-lg font-medium text-zinc-900">No leads yet</h3>
          <p className="mt-2 text-sm text-zinc-500">Create your first lead to get started.</p>
          <Link
            href="/dashboard/leads/new"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-primary-700"
          >
            <Plus className="h-4 w-4" />
            Add Your First Lead
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-6 md:hidden mt-8">
            {groupedLeads.map((group) => (
              <div key={group.label}>
                <p className="text-xs font-semibold uppercase tracking-[0.4em] text-zinc-500 mb-2">{group.label}</p>
                <div className="space-y-4">
                  {group.leads.map((lead: any) => (
                    <div
                      key={`${group.label}-${lead.id}`}
                      className={`rounded-lg border p-4 shadow-sm ${group.highlight ? 'border-zinc-200 bg-zinc-50' : 'border-zinc-200 bg-white'}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <p className="font-medium text-gray-900">{lead.companyName || lead.name || 'Unnamed Lead'}</p>
                          {lead.name && lead.companyName && (
                            <p className="text-sm text-gray-600">{lead.name}</p>
                          )}
                          {lead.email && (
                            <p className="text-sm text-gray-500">
                              <a href={`mailto:${lead.email}`} className="text-brand-primary-600 hover:underline">
                                {lead.email}
                              </a>
                            </p>
                          )}
                          {lead.website && (
                            <p className="text-sm text-gray-500 flex justify-center">
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-full border border-brand-primary-200 bg-white px-3 py-1 text-xs font-semibold text-brand-primary-600 transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                              >
                                View Link
                              </a>
                            </p>
                          )}
                              {lead.phone && (
                                <p className="text-sm text-gray-500">
                                  <a
                                    href={`tel:${lead.phone}`}
                                    className="text-brand-primary-600 hover:underline"
                                  >
                                    {lead.phone}
                                  </a>
                                </p>
                              )}
                        </div>
                        <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full border border-amber-200 bg-amber-50 text-amber-700">
                          Lead
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                        <span>{lead.status || 'new'}</span>
                        {isOwnerOrAdmin && lead.assignedTo && (
                          <span>Assigned to {lead.assignedTo?.name ?? ''}</span>
                        )}
                      </div>
                      {lead.source && (
                        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500 mb-3">
                          {formatSourceLabel(lead.source)}
                        </p>
                      )}
                      {isOwnerOrAdmin && (
                        <div className="mt-4">
                          <p className="text-xs font-semibold uppercase text-gray-500 mb-1">Reassign</p>
                          <AssignLeadSelect
                            leadId={lead.id}
                            currentAssigneeId={lead.assignedTo?.id ?? ''}
                            options={assignableUsers}
                          />
                        </div>
                      )}
                      <div className="flex gap-2 mt-4 flex-wrap">
                        <Link
                          href={`/dashboard/leads/${lead.id}`}
                          className="flex-1 inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white px-3 py-2 text-xs font-semibold text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                          title="View and manage this lead"
                          aria-label="View and manage this lead"
                        >
                          <Eye className="h-4 w-4" aria-hidden="true" />
                          <span className="ml-1">View</span>
                        </Link>
                        <DeleteLeadButton
                          leadId={lead.id}
                          leadName={lead.companyName || lead.name}
                          disabled={!!lead.clientId}
                        />
                        <form
                          action={`/api/leads/${lead.id}/convert-to-client`}
                          method="POST"
                          style={{ display: 'inline' }}
                        >
                          <input type="hidden" name="redirect" value="1" />
                          <button
                            type="submit"
                            disabled={!!lead.clientId}
                            className="flex-1 inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60"
                            title={lead.clientId ? 'Lead already converted' : 'Convert to client'}
                            aria-label="Convert to client"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            <span className="ml-1">Convert</span>
                          </button>
                        </form>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm mt-8">
            <div className="relative max-h-[70vh] overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[700px] divide-y divide-zinc-200">
                <thead className="sticky top-0 z-10 bg-zinc-50">
                    <tr className="divide-x divide-zinc-200">
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 w-[360px]">Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Website</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Phone</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Source</th>
                    {isOwnerOrAdmin && (
                      <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Assigned To</th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {groupedLeads.map((group) => (
                    <Fragment key={group.label}>
                      {group.label && (
                        <tr>
                          <td colSpan={columnCount} className="px-6 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500 bg-zinc-50">
                            {group.label}
                          </td>
                        </tr>
                      )}
                      {group.leads.map((lead: any) => (
                        <tr
                          key={lead.id}
                          className={`divide-x divide-gray-200 hover:bg-gray-50 ${group.highlight ? 'bg-zinc-50' : ''}`}
                        >
                          <td className="px-6 py-4 w-[360px]">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-zinc-900">{lead.companyName || lead.name || 'Unnamed Lead'}</span>
                              {lead.name && lead.companyName && (
                                <span className="text-xs text-zinc-500">{lead.name}</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-zinc-700">
                            {lead.email ? (
                              <a className="text-brand-primary-600 hover:underline" href={`mailto:${lead.email}`}>{lead.email}</a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-6 py-4 text-zinc-700">
                          {lead.website ? (
                            <div className="flex justify-center">
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex text-center items-center rounded-full border border-brand-primary-200 bg-white px-3 py-1 text-xs font-semibold text-brand-primary-600 transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                              >
                                View Link
                              </a>
                            </div>
                          ) : (
                            '—'
                          )}
                          </td>
                              <td className="px-6 py-4 text-zinc-700">
                                {lead.phone ? (
                                  <a
                                    className="text-brand-primary-600 hover:underline whitespace-nowrap"
                                    href={`tel:${lead.phone}`}
                                  >
                                    {lead.phone}
                                  </a>
                                ) : (
                                  '—'
                                )}
                              </td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.15em] border border-amber-200 bg-amber-50 text-amber-700`}>
                              {lead.status || 'new'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-900">
                            {lead.source ? formatSourceLabel(lead.source) : '-'}
                          </td>
                          {isOwnerOrAdmin && (
                            <td className="px-6 py-4">
                              <AssignLeadSelect
                                leadId={lead.id}
                                currentAssigneeId={lead.assignedTo?.id ?? ''}
                                options={assignableUsers}
                              />
                            </td>
                          )}
                          <td className="px-6 py-4 flex h-full items-center gap-2">
                            <Link
                              href={`/dashboard/leads/${lead.id}`}
                              className="inline-flex items-center gap-1 rounded-lg border border-brand-primary-200 bg-white px-3 py-2 text-xs font-semibold text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50"
                              title="View and manage this lead"
                            >
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </Link>
                            <DeleteLeadButton
                              leadId={lead.id}
                              leadName={lead.companyName || lead.name}
                              disabled={!!lead.clientId}
                            />
                            <form
                              action={`/api/leads/${lead.id}/convert-to-client`}
                              method="POST"
                              style={{ display: 'inline' }}
                            >
                              <input type="hidden" name="redirect" value="1" />
                              <button
                                type="submit"
                                disabled={!!lead.clientId}
                                className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm transition hover:border-emerald-300 hover:bg-emerald-50 disabled:opacity-60"
                                title={lead.clientId ? 'Lead already converted' : 'Convert to client'}
                                aria-label="Convert to client"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="h-4 w-4">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                                </svg>
                              </button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      <div className="mt-8">
        <LeadCsvTools />
      </div>
    </div>
  );
}
