import Link from 'next/link';
import { notFound } from 'next/navigation';
import { MessageSquare, Pencil, PlusCircle, Receipt } from 'lucide-react';
import prisma from '@/lib/prisma';
import { parseRecipientList } from '@/lib/messageRecipients';
import { getCurrentUser } from '@/lib/auth';
import { clientVisibilityWhere } from '@/lib/client-scope';
import { AssignClientSelect } from '../AssignClientSelect';
import { NewMessageForm } from '../../messaging/NewMessageForm';
import { formatSourceLabel } from '@/lib/format-source';

export const dynamic = 'force-dynamic';

type PageProps = {
  params: Promise<{ id: string }>;
};

type ClientMessage = {
  id: string;
  text: string;
  sentAt: Date;
  fromId: string;
  from: { name?: string | null; email?: string | null } | null;
  readBy: { id: string }[];
  participants?: string[];
};

const invoiceBillableStatuses = new Set([
  'UNPAID',
  'VIEWED',
  'SIGNED',
  'COMPLETED',
  'PAID',
  'OVERDUE',
]);

const formatCurrency = (value: number, currency = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);

const formatDate = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const getInitials = (value: string) =>
  value
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');

const getDisplayName = (client: {
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
}) => {
  const company = client.companyName?.trim();
  const contact = client.contactName?.trim();
  const email = client.email?.trim();
  if (company) {
    return company;
  }
  return contact || email || 'Unnamed Client';
};

const getSubLine = (client: {
  companyName?: string | null;
  contactName?: string | null;
  email?: string | null;
}) => {
  const company = client.companyName?.trim();
  const contact = client.contactName?.trim();
  const email = client.email?.trim();
  if (!company) return '';
  return contact || email || '';
};

const getMessagePreview = (text: string) => {
  const firstLine = text.split('\n').find((line) => line.trim()) || '';
  return firstLine.length > 100 ? `${firstLine.slice(0, 100)}...` : firstLine;
};

export default async function ClientViewPage({ params }: PageProps) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return <div className="p-8 text-center text-red-600">Not authenticated</div>;
  }
  const currentUser = user;

  const client = await prisma.client.findFirst({
    where: { ...clientVisibilityWhere(user), id },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      company: { select: { name: true } },
    },
  });

  if (!client) {
    notFound();
  }
  const clientData = client!;

  const invoices = await prisma.invoice.findMany({
    where: { clientId: clientData.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      invoiceNumber: true,
      status: true,
      total: true,
      currency: true,
      issueDate: true,
      createdAt: true,
    },
  });

  const proposals = await prisma.proposal.findMany({
    where: { clientId: clientData.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      status: true,
      total: true,
      currency: true,
      type: true,
      createdAt: true,
      signedAt: true,
    },
  });

  const clientMessages = (await prisma.message.findMany({
    where: {
      companyId: user.companyId ?? undefined,
      contextType: 'CLIENT',
      contextId: clientData.id,
    },
    orderBy: { sentAt: 'desc' },
    select: {
      id: true,
      text: true,
      sentAt: true,
      fromId: true,
      from: { select: { name: true, email: true } },
      readBy: { select: { id: true } },
      participants: true,
    },
  })).map((message) => ({
    ...message,
    participants: parseRecipientList(message.participants),
  })) as ClientMessage[];

  const fallbackMessages = clientMessages.length
    ? []
    : ((await prisma.message.findMany({
        where: {
          companyId: user.companyId ?? undefined,
          OR: [{ contextType: null }, { contextType: 'GENERAL' }],
        },
        orderBy: { sentAt: 'desc' },
        take: 12,
        select: {
          id: true,
          text: true,
          sentAt: true,
          fromId: true,
          from: { select: { name: true, email: true } },
          readBy: { select: { id: true } },
          participants: true,
        },
      })).map((message) => ({
        ...message,
        participants: parseRecipientList(message.participants),
      })) as ClientMessage[]);

  const threadMessages = clientMessages.length ? clientMessages : fallbackMessages;
  const showingFallbackMessages = !clientMessages.length && fallbackMessages.length > 0;
  const replyAuthorId = threadMessages[0]?.fromId ?? null;
  const replyParticipantIds = Array.from(
    new Set(
      threadMessages.flatMap((msg) =>
        msg.participants && msg.participants.length ? msg.participants : [msg.fromId],
      ),
    ),
  );

  const totalInvoiced = invoices.reduce(
    (sum, invoice) =>
      sum + (invoiceBillableStatuses.has(invoice.status) ? Number(invoice.total) : 0),
    0
  );
  const totalPaid = invoices.reduce(
    (sum, invoice) => sum + (invoice.status === 'PAID' ? Number(invoice.total) : 0),
    0
  );
  const totalOutstanding = Math.max(totalInvoiced - totalPaid, 0);
  const invoicesSent = invoices.filter((invoice) => invoice.status !== 'DRAFT' && invoice.status !== 'VOID').length;

  const activity = [
    ...invoices.map((invoice) => ({
      date: invoice.issueDate ?? invoice.createdAt,
      label: `Invoice #${invoice.invoiceNumber} ${invoice.status.toLowerCase()}`,
    })),
    ...proposals.map((proposal) => {
      const labelType = proposal.type === 'CONTRACT' ? 'Contract' : 'Proposal';
      const statusText = proposal.status.toLowerCase();
      const eventDate = proposal.signedAt ?? proposal.createdAt;
      return {
        date: eventDate,
        label: `${labelType} ${statusText}`,
      };
    }),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 8);

  const displayName = getDisplayName(clientData);
  const subLine = getSubLine(clientData);
  const initialsSource =
    clientData.companyName?.trim() || clientData.contactName?.trim() || clientData.email?.trim() || 'Client';
  const initials = getInitials(initialsSource);
  const isOwnerOrAdmin = currentUser.role === 'OWNER' || currentUser.role === 'ADMIN';

  const assignableUsers = isOwnerOrAdmin
    ? await prisma.user.findMany({
        where: { companyId: currentUser.companyId ?? undefined },
        select: { id: true, name: true, email: true },
        orderBy: { name: 'asc' },
      })
    : [];

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-10 sm:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full border border-brand-primary-700 bg-brand-primary-100 text-xl font-semibold text-brand-primary-700">
                {initials}
              </div>
              <div className="flex-1 space-y-2 min-w-0">
                <div className="flex w-full items-center gap-3">
                  <h1 className="text-3xl font-semibold text-gray-900">{displayName}</h1>
                  {(() => {
                    const label = clientData.isLead
                      ? 'Lead'
                      : clientData.status || 'Client';
                    const classes = clientData.isLead
                      ? 'border border-amber-200 bg-amber-50 text-amber-700'
                      : label === 'Converted From Lead'
                        ? 'border border-blue-200 bg-blue-50 text-blue-700'
                        : 'border border-emerald-200 bg-emerald-50 text-emerald-700';
                    return (
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ml-auto ${classes}`}
                      >
                        {label}
                      </span>
                    );
                  })()}
                </div>
                {subLine && (
                  <p className="text-sm text-gray-500">{subLine}</p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href={`/dashboard/clients/${clientData.id}/edit`}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <Pencil className="h-4 w-4" />
                Edit
              </Link>
              <Link
                href="/dashboard/invoices/new"
                className="inline-flex items-center gap-2 rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700"
              >
                <Receipt className="h-4 w-4" />
                New invoice
              </Link>
              <Link
                href="/dashboard/proposals/new?type=PROPOSAL"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <PlusCircle className="h-4 w-4" />
                New proposal
              </Link>
              <Link
                href="/dashboard/messaging"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50"
              >
                <MessageSquare className="h-4 w-4" />
                Message
              </Link>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Total invoiced</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">
                {formatCurrency(totalInvoiced, invoices[0]?.currency ?? 'USD')}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Paid</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">
                {formatCurrency(totalPaid, invoices[0]?.currency ?? 'USD')}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Outstanding</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">
                {formatCurrency(totalOutstanding, invoices[0]?.currency ?? 'USD')}
              </p>
            </div>
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Invoices sent</p>
              <p className="mt-2 text-xl font-semibold text-gray-900">{invoicesSent}</p>
            </div>
          </div>
        </div>

        <div className="hidden md:flex gap-3 border-b border-gray-200">
          {['details', 'activity', 'documents', 'messages', 'assignment'].map((tab) => (
            <a
              key={tab}
              href={`#${tab}`}
              className="border-b-2 border-transparent px-4 py-2 text-sm font-semibold text-gray-500 transition hover:border-brand-primary-300 hover:text-gray-900"
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </a>
          ))}
        </div>

        <div className="space-y-4 md:hidden">
          <details className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm" open>
            <summary className="cursor-pointer text-sm font-semibold text-gray-900">Details</summary>
            <div className="mt-4">{renderDetails()}</div>
          </details>
          <details className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-gray-900">Activity</summary>
            <div className="mt-4">{renderActivity(activity)}</div>
          </details>
          <details className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-gray-900">Documents</summary>
            <div className="mt-4">{renderDocuments(invoices, proposals)}</div>
          </details>
          <details className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-gray-900">Messages</summary>
            <div className="mt-4">{renderMessages()}</div>
          </details>
          {isOwnerOrAdmin && (
            <details className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
              <summary className="cursor-pointer text-sm font-semibold text-gray-900">Assignment</summary>
              <div className="mt-4">{renderAssignment()}</div>
            </details>
          )}
        </div>

        <div className="hidden md:block space-y-6">
          <section id="details" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Details</h2>
            <div className="mt-6">{renderDetails()}</div>
          </section>
          <section id="activity" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Activity</h2>
            <div className="mt-6">{renderActivity(activity)}</div>
          </section>
          <section id="documents" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Documents</h2>
            <div className="mt-6">{renderDocuments(invoices, proposals)}</div>
          </section>
          <section id="messages" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Messages</h2>
            <div className="mt-6">{renderMessages()}</div>
          </section>
          {isOwnerOrAdmin && (
            <section id="assignment" className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Team assignment</h2>
              <div className="mt-6">{renderAssignment()}</div>
            </section>
          )}
        </div>
      </div>
    </div>
  );

  function renderDetails() {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Contact name</p>
          <p className="text-sm font-semibold text-gray-900">{clientData.contactName || '—'}</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Email</p>
          {clientData.email ? (
            <a className="text-sm font-semibold text-brand-primary-700 hover:underline" href={`mailto:${clientData.email}`}>
              {clientData.email}
            </a>
          ) : (
            <p className="text-sm font-semibold text-gray-900">—</p>
          )}
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Phone</p>
          <p className="text-sm font-semibold text-gray-900">{clientData.phone || '—'}</p>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Website</p>
          <p className="text-sm font-semibold text-gray-900">—</p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Address</p>
          <p className="text-sm text-gray-700">
            {clientData.addressLine1 || '—'}
            {clientData.addressLine2 ? `, ${clientData.addressLine2}` : ''}
            <br />
            {[clientData.city, clientData.state, clientData.postalCode].filter(Boolean).join(', ') || '—'}
            <br />
            {clientData.country || 'USA'}
          </p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-line">{clientData.notes || '—'}</p>
        </div>
        <div className="space-y-2 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Source</p>
          <p className="text-sm text-gray-700">{formatSourceLabel(clientData.source)}</p>
        </div>
      </div>
    );
  }

  function renderActivity(items: { date: Date; label: string }[]) {
    if (!items.length) {
      return <p className="text-sm text-gray-500">No activity yet.</p>;
    }

    return (
      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex items-start gap-3">
            <div className="mt-1 h-2.5 w-2.5 rounded-full bg-brand-primary-500" />
            <div>
              <p className="text-sm font-semibold text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500">{formatDate(item.date)}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  function renderDocuments(
    invoiceRows: typeof invoices,
    proposalRows: typeof proposals
  ) {
    return (
      <div className="space-y-8">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Invoices</h3>
            <Link
              href="/dashboard/invoices/new"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600"
            >
              New invoice
            </Link>
          </div>
          {invoiceRows.length ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Number</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {invoiceRows.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3 font-semibold text-gray-900">
                        #{invoice.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {formatDate(invoice.issueDate ?? invoice.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-gray-900">
                        {formatCurrency(Number(invoice.total), invoice.currency)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{invoice.status}</td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/invoices/${invoice.id}`}
                          className="text-sm font-semibold text-brand-primary-700 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No invoices yet — create one!</p>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-gray-400">Proposals</h3>
            <Link
              href="/dashboard/proposals/new?type=PROPOSAL"
              className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600"
            >
              New proposal
            </Link>
          </div>
          {proposalRows.length ? (
            <div className="mt-4 overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {proposalRows.map((proposal) => (
                    <tr key={proposal.id}>
                      <td className="px-4 py-3 font-semibold text-gray-900">{proposal.title}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(proposal.createdAt)}</td>
                      <td className="px-4 py-3 text-gray-900">
                        {formatCurrency(Number(proposal.total), proposal.currency)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {proposal.type === 'CONTRACT' ? 'Contract' : 'Proposal'} {proposal.status}
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/dashboard/proposals/${proposal.id}`}
                          className="text-sm font-semibold text-brand-primary-700 hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No proposals yet — create one!</p>
          )}
        </div>
      </div>
    );
  }

  function renderMessages() {
    return (
      <div className="space-y-4">
        {showingFallbackMessages && (
          <p className="text-xs text-amber-600">
            No client-specific messages yet. Showing general team messages.
          </p>
        )}
        {!threadMessages.length ? (
          <p className="text-sm text-gray-500">No messages yet — start the thread below.</p>
        ) : (
          <div className="divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
            {threadMessages.map((msg) => {
              const fromLabel = msg.from?.name || msg.from?.email || 'Someone';
              const initials = getInitials(fromLabel || 'M');
              const preview = getMessagePreview(msg.text);
              const isRead =
                msg.readBy?.some((r) => r.id === currentUser.id) || msg.fromId === currentUser.id;

              return (
                <Link
                  key={msg.id}
                  href={`/dashboard/messaging?thread=${msg.id}`}
                  className="flex items-center gap-4 px-4 py-3 transition hover:bg-gray-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700">
                    {initials}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900">{fromLabel}</p>
                      {!isRead && (
                        <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                          Unread
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{preview}</p>
                  </div>
                  <div className="text-xs font-semibold text-gray-400">
                    {formatDate(msg.sentAt)}
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
            Message about this client
          </p>
          <NewMessageForm
            currentUserId={currentUser.id}
            contextType="CLIENT"
            contextId={clientData.id}
            placeholder="Message about this client..."
            replyAuthorId={replyAuthorId}
            replyParticipantIds={replyParticipantIds}
          />
        </div>
      </div>
    );
  }

  function renderAssignment() {
    return (
      <div className="max-w-sm">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">Assigned to</p>
        <AssignClientSelect
          clientId={clientData.id}
          currentAssigneeId={clientData.assignedToId ?? ''}
          options={assignableUsers}
        />
      </div>
    );
  }
}
