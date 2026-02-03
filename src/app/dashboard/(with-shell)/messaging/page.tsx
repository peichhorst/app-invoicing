import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { buildListContainsFilter, parseRecipientList } from '@/lib/messageRecipients';
import { NewMessageForm } from './NewMessageForm';
import InboxList from './InboxList';

type PageProps = {
  searchParams?: Promise<{ tab?: string | string[]; thread?: string | string[] }>;
};

type MessageRow = {
  id: string;
  text: string;
  sentAt: Date;
  fromId: string;
  from: { name?: string | null; email?: string | null } | null;
  readBy: { id: string }[];
  toAll?: boolean;
  toPositions?: string[];
  toUserIds?: string[];
  recipientLabel?: string;
  contextType?: string | null;
  contextId?: string | null;
  participants?: string[];
  parentId?: string | null;
};

export default async function MessagesPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) redirect('/');
  if (!user.companyId) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
        <div className="mx-auto max-w-5xl rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-sm text-zinc-500">
          No company found for this account.
        </div>
      </div>
    );
  }

  const params = await searchParams;
  const activeTab = typeof params?.tab === 'string' ? params.tab : 'unread';
  const activeThreadId = typeof params?.thread === 'string' ? params.thread : null;

  const rawMessages = await prisma.message.findMany({
    where: {
      companyId: user.companyId,
      OR: [
        { fromId: user.id },
        { toAll: true },
        { toRoles: buildListContainsFilter(user.role) },
        ...(user.positionId ? [{ toPositions: buildListContainsFilter(user.positionId) }] : []),
        { toUserIds: buildListContainsFilter(user.id) },
      ],
    },
    orderBy: { sentAt: 'desc' },
    select: {
      id: true,
      text: true,
      sentAt: true,
      fromId: true,
      parentId: true,
      from: { select: { name: true, email: true } },
      readBy: { select: { id: true } },
      toAll: true,
      toPositions: true,
      toUserIds: true,
      contextType: true,
      contextId: true,
      participants: true,
    },
  });

  const messages = rawMessages.map((msg) => ({
    ...msg,
    toPositions: parseRecipientList(msg.toPositions),
    toUserIds: parseRecipientList(msg.toUserIds),
    participants: parseRecipientList(msg.participants),
  })) as MessageRow[];

  const recipientUserIds = new Set<string>();
  const recipientPositionIds = new Set<string>();
  for (const msg of messages) {
    msg.toUserIds?.forEach((id) => recipientUserIds.add(id));
    msg.toPositions?.forEach((id) => recipientPositionIds.add(id));
    msg.readBy?.forEach((reader) => recipientUserIds.add(reader.id));
  }

  const [recipientUsers, recipientPositions] = await Promise.all([
    recipientUserIds.size
      ? prisma.user.findMany({
          where: { id: { in: Array.from(recipientUserIds) } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
    recipientPositionIds.size
      ? prisma.position.findMany({
          where: { id: { in: Array.from(recipientPositionIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const recipientUsersById = new Map(
    recipientUsers.map((member) => [
      member.id,
      member.name || member.email || 'Team member',
    ]),
  );
  const recipientPositionsById = new Map(
    recipientPositions.map((position) => [position.id, position.name]),
  );

  const labeledMessages = messages.map((msg) => {
    if (msg.toAll) {
      return { ...msg, recipientLabel: 'All Team Members' };
    }
    const positionNames = (msg.toPositions ?? [])
      .map((id) => recipientPositionsById.get(id))
      .filter(Boolean) as string[];
    const userNames = (msg.toUserIds ?? [])
      .map((id) => (id === user.id ? 'You' : recipientUsersById.get(id)))
      .filter(Boolean) as string[];
    if (!positionNames.length && !userNames.length) {
      return { ...msg, recipientLabel: 'General' };
    }
    const recipientLabel = [...positionNames, ...userNames].join(', ');
    return { ...msg, recipientLabel };
  });

  const clientIds = new Set<string>();
  const invoiceIds = new Set<string>();
  const proposalIds = new Set<string>();
  for (const msg of messages) {
    if (!msg.contextType || !msg.contextId) continue;
    if (msg.contextType === 'CLIENT') clientIds.add(msg.contextId);
    if (msg.contextType === 'INVOICE') invoiceIds.add(msg.contextId);
    if (msg.contextType === 'PROPOSAL') proposalIds.add(msg.contextId);
  }

  const [clients, invoices, proposals] = await Promise.all([
    clientIds.size
      ? prisma.client.findMany({
          where: { id: { in: Array.from(clientIds) } },
          select: { id: true, companyName: true, contactName: true, email: true },
        })
      : Promise.resolve([]),
    invoiceIds.size
      ? prisma.invoice.findMany({
          where: { id: { in: Array.from(invoiceIds) } },
          select: { id: true, invoiceNumber: true },
        })
      : Promise.resolve([]),
    proposalIds.size
      ? prisma.proposal.findMany({
          where: { id: { in: Array.from(proposalIds) } },
          select: { id: true, title: true },
        })
      : Promise.resolve([]),
  ]);

  const clientsById = new Map(
    clients.map((client) => [
      client.id,
      client.companyName || client.contactName || client.email || 'Client',
    ]),
  );
  const invoicesById = new Map(invoices.map((inv) => [inv.id, `Invoice #${inv.invoiceNumber}`]));
  const proposalsById = new Map(
    proposals.map((proposal) => [proposal.id, proposal.title || 'Proposal']),
  );

  const mentionTokens = [
    user.name ? `@${user.name.toLowerCase()}` : null,
    user.email ? `@${user.email.toLowerCase()}` : null,
    user.email ? `@${user.email.split('@')[0].toLowerCase()}` : null,
  ].filter(Boolean) as string[];

  const filteredMessages = labeledMessages.filter((msg) => {
    if (activeTab === 'unread') {
      const isRead = msg.readBy?.some((r) => r.id === user.id) || msg.fromId === user.id;
      return !isRead;
    }
    if (activeTab === 'mentions') {
      const content = msg.text.toLowerCase();
      return mentionTokens.some((token) => content.includes(token));
    }
    return true;
  });

  const activeThreadMessage =
    (activeThreadId ? filteredMessages.find((msg) => msg.id === activeThreadId) : null) ||
    filteredMessages.find((msg) => msg.fromId !== user.id) ||
    filteredMessages[0];

  const replySourceMessage = activeThreadMessage || messages[0];
  const replyAuthorId = replySourceMessage?.fromId ?? null;
  const replyParticipantIds =
    replySourceMessage?.participants?.length
      ? replySourceMessage.participants
      : replySourceMessage
      ? [replySourceMessage.fromId]
      : [];

  const contextMetaByKey: Record<string, { label: string; href: string }> = {
    GENERAL: { label: 'General', href: '/dashboard/messaging' },
    INTERNAL_NOTE: { label: 'Internal note', href: '/dashboard/messaging' },
  };
  for (const [id, label] of clientsById.entries()) {
    contextMetaByKey[`CLIENT:${id}`] = {
      label,
      href: `/dashboard/clients/${id}`,
    };
  }
  for (const [id, label] of invoicesById.entries()) {
    contextMetaByKey[`INVOICE:${id}`] = {
      label,
      href: `/dashboard/invoices/${id}`,
    };
  }
  for (const [id, label] of proposalsById.entries()) {
    contextMetaByKey[`PROPOSAL:${id}`] = {
      label,
      href: `/dashboard/proposals/${id}`,
    };
  }

  const emptyStateText =
    activeTab === 'mentions'
      ? 'No mentions yet.'
      : activeTab === 'unread'
      ? 'All caught up — no unread messages.'
      : 'No messages to show.';

  const usersById: Record<string, string> = Object.fromEntries(recipientUsersById.entries());

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Messages</p>
        <h1 className="text-3xl font-bold text-zinc-900">Inbox</h1>
        <p className="text-sm text-zinc-600">All company messages in one place.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[
          { key: 'unread', label: 'Unread' },
          { key: 'all', label: 'All' },
          { key: 'mentions', label: 'Mentions' },
        ].map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/messaging?tab=${tab.key}`}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
              activeTab === tab.key
                ? 'bg-brand-primary-700 text-white'
                : 'border border-zinc-200 bg-white text-zinc-600 hover:text-brand-primary-700'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm">
        {!filteredMessages.length ? (
          <div className="p-8 text-center text-sm text-zinc-500">{emptyStateText}</div>
        ) : (
          <InboxList
            messages={filteredMessages}
            currentUserId={user.id}
            contextMetaByKey={contextMetaByKey}
            usersById={usersById}
          />
        )}
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <NewMessageForm
          currentUserId={user.id}
          replyAuthorId={replyAuthorId}
          replyParticipantIds={replyParticipantIds}
          forceReplyButtons
        />
      </div>
    </div>
  );
}
