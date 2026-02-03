'use client';

import Link from 'next/link';
import { Megaphone } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type MessageRow = {
  id: string;
  text: string;
  sentAt: string | Date;
  fromId: string;
  from?: { name?: string | null; email?: string | null } | null;
  readBy?: { id: string }[];
  toAll?: boolean;
  toPositions?: string[];
  toUserIds?: string[];
  recipientLabel?: string;
  contextType?: string | null;
  contextId?: string | null;
  parentId?: string | null;
};

type ContextMeta = {
  label: string;
  href: string;
};

type Props = {
  messages: MessageRow[];
  currentUserId: string;
  contextMetaByKey: Record<string, ContextMeta>;
  usersById: Record<string, string>;
};

const getInitials = (label: string) => {
  const clean = label.trim();
  if (!clean) return '?';
  const parts = clean.split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const getPreview = (text: string) => {
  const firstLine = text.split('\n').find((line) => line.trim()) || '';
  return firstLine.length > 100 ? `${firstLine.slice(0, 100)}...` : firstLine;
};

const getContextKey = (msg: MessageRow) => {
  if (!msg.contextType) return 'GENERAL';
  if (!msg.contextId) return msg.contextType;
  return `${msg.contextType}:${msg.contextId}`;
};

const getRecipientSummary = (msg: MessageRow, currentUserId: string) => {
  if (msg.recipientLabel) return msg.recipientLabel;
  if (msg.toAll) return 'Announcement (All Team Members)';
  const positionCount = msg.toPositions?.length ?? 0;
  const userCount = msg.toUserIds?.length ?? 0;
  const onlySelf =
    userCount === 1 && msg.toUserIds?.[0] === currentUserId && positionCount === 0;
  if (onlySelf) return 'Internal note';
  const parts: string[] = [];
  if (positionCount) {
    parts.push(`${positionCount} position${positionCount === 1 ? '' : 's'}`);
  }
  if (userCount) {
    parts.push(`${userCount} person${userCount === 1 ? '' : 's'}`);
  }
  return parts.length ? parts.join(', ') : 'General';
};

export default function InboxList({ messages, currentUserId, contextMetaByKey, usersById }: Props) {
  const router = useRouter();
  const [localMessages, setLocalMessages] = useState(messages);
  const pollingRef = useRef(false);
  const messagesRef = useRef(messages);

  type ThreadNode = MessageRow & { replies: ThreadNode[] };
  const threads = useMemo(() => {
    const nodeMap = new Map<string, ThreadNode>();
    localMessages.forEach((msg) => {
      nodeMap.set(msg.id, { ...msg, replies: [] });
    });
    const roots: ThreadNode[] = [];
    localMessages.forEach((msg) => {
      const node = nodeMap.get(msg.id);
      if (!node) return;
      if (msg.parentId && nodeMap.has(msg.parentId)) {
        nodeMap.get(msg.parentId)?.replies.push(node);
      } else {
        roots.push(node);
      }
    });
    const sortReplies = (items: ThreadNode[]) => {
      items.forEach((node) => {
        node.replies.sort((a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime());
        sortReplies(node.replies);
      });
    };
    sortReplies(roots);
    return roots;
  }, [localMessages]);

  useEffect(() => {
    setLocalMessages(messages);
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    messagesRef.current = localMessages;
  }, [localMessages]);

  useEffect(() => {
    const channel = new BroadcastChannel('clientwave-events');
    const handleMessage = (event: MessageEvent) => {
      const data = event.data || {};
      if (data.type === 'message-received') {
        router.refresh();
      }
      if (data.type === 'message-read') {
        const messageId = data.payload?.messageId as string | undefined;
        const readerId = data.payload?.readerId as string | undefined;
        if (!messageId || !readerId) return;
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === messageId && !(m.readBy ?? []).some((r) => r.id === readerId)
              ? { ...m, readBy: [...(m.readBy ?? []), { id: readerId }] }
              : m,
          ),
        );
      }
      if (data.type === 'message-unread') {
        const messageId = data.payload?.messageId as string | undefined;
        const readerId = data.payload?.readerId as string | undefined;
        if (!messageId || !readerId) return;
        setLocalMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? { ...m, readBy: (m.readBy ?? []).filter((r) => r.id !== readerId) }
              : m,
          ),
        );
      }
    };
    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [router]);

  useEffect(() => {
    const pollReceipts = async () => {
      if (pollingRef.current) return;
      const sentIds = messagesRef.current
        .filter((msg) => msg.fromId === currentUserId)
        .map((msg) => msg.id);
      if (!sentIds.length) return;
      pollingRef.current = true;
      try {
        const res = await fetch('/api/messages/read-receipts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids: sentIds }),
        });
        if (!res.ok) return;
        const data = (await res.json()) as { receipts?: { id: string; readByIds: string[] }[] };
        const receipts = data.receipts ?? [];
        if (!receipts.length) return;
        setLocalMessages((prev) =>
          prev.map((msg) => {
            const receipt = receipts.find((item) => item.id === msg.id);
            if (!receipt) return msg;
            const readBy = receipt.readByIds.map((id) => ({ id }));
            return { ...msg, readBy };
          }),
        );
      } catch {
        // ignore
      } finally {
        pollingRef.current = false;
      }
    };

    const interval = setInterval(pollReceipts, 4000);
    void pollReceipts();
    return () => clearInterval(interval);
  }, [currentUserId]);

  const markRead = async (messageId: string) => {
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [messageId] }),
      });
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === messageId && !(m.readBy ?? []).some((r) => r.id === currentUserId)
            ? { ...m, readBy: [...(m.readBy ?? []), { id: currentUserId }] }
            : m,
        ),
      );
      const channel = new BroadcastChannel('clientwave-events');
      channel.postMessage({
        type: 'message-read',
        payload: { messageId, readerId: currentUserId },
      });
      channel.close();
    } catch {
      // ignore
    }
  };

  const unmarkRead = async (messageId: string) => {
    try {
      await fetch('/api/messages/unread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [messageId] }),
      });
      setLocalMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, readBy: (m.readBy ?? []).filter((r) => r.id !== currentUserId) }
            : m,
        ),
      );
      const channel = new BroadcastChannel('clientwave-events');
      channel.postMessage({
        type: 'message-unread',
        payload: { messageId, readerId: currentUserId },
      });
      channel.close();
    } catch {
      // ignore
    }
  };

  const openThread = async (msg: MessageRow) => {
    const isSender = msg.fromId === currentUserId;
    const isRead = (msg.readBy ?? []).some((r) => r.id === currentUserId) || isSender;
    if (!isRead) {
      await markRead(msg.id);
    }
    const contextKey = getContextKey(msg);
    const contextMeta = contextMetaByKey[contextKey];
    const baseHref = contextMeta?.href || '/dashboard/messaging';
    router.push(`${baseHref}?thread=${msg.id}`);
  };

  const renderMessageCard = (msg: ThreadNode, depth = 0) => {
    const fromLabel = msg.from?.name || msg.from?.email || 'Someone';
    const initials = getInitials(fromLabel);
    const preview = getPreview(msg.text);
    const isSender = msg.fromId === currentUserId;
    const isRead = (msg.readBy ?? []).some((r) => r.id === currentUserId) || isSender;
    const contextKey = getContextKey(msg);
    const contextMeta = contextMetaByKey[contextKey];
    const contextLabel = contextMeta?.label || 'General';
    const contextHref = contextMeta?.href || '/dashboard/messaging';
    const recipientSummary = getRecipientSummary(msg, currentUserId);
    const isInternalNote = msg.contextType === 'INTERNAL_NOTE';
    const isAnnouncement = msg.toAll === true;
    const contextTagLabel = isInternalNote
      ? 'Internal Note'
      : isAnnouncement
      ? 'Announcement'
      : contextLabel;
    const readByNames = isSender
      ? (msg.readBy ?? [])
          .map((reader) => (reader.id === currentUserId ? null : usersById[reader.id]))
          .filter(Boolean)
      : [];
    const sentAt = typeof msg.sentAt === 'string' ? new Date(msg.sentAt) : msg.sentAt;
    const baseTone = isSender ? 'bg-brand-primary-50' : 'bg-emerald-50';
    const replyTone = 'bg-white border border-zinc-100';
    const rowTone = depth > 0 ? replyTone : baseTone;
    const indentStyle = depth > 0 ? { paddingLeft: 20 + depth * 18 } : undefined;

    return (
      <div key={msg.id} className="group">
        <button
          type="button"
          onClick={() => void openThread(msg)}
          className={`hidden w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-zinc-50 sm:flex ${rowTone}`}
          style={indentStyle}
        >
          <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-700">
            {initials}
          </div>
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-zinc-900">{fromLabel}</p>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                  isSender
                    ? 'border border-zinc-200 bg-white text-zinc-600'
                    : isRead
                    ? 'border border-zinc-200 bg-white text-zinc-600'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {isSender ? 'Sent' : isRead ? 'Read' : 'Unread'}
              </span>
            </div>
            <p className="text-sm text-zinc-600">{preview}</p>
            <div className="space-y-1">
              <Link
                href={contextHref}
                onClick={(event) => event.stopPropagation()}
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                  isInternalNote
                    ? 'border border-violet-200 bg-violet-50 text-violet-700'
                    : isAnnouncement
                    ? 'border border-rose-300 bg-rose-600 text-white shadow-sm'
                    : 'border border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-brand-primary-200 hover:text-brand-primary-700'
                }`}
              >
                {isAnnouncement && <Megaphone className="mr-1 h-3 w-3" aria-hidden="true" />}
                {contextTagLabel}
              </Link>
              {!isInternalNote && (
                <p className="text-xs text-zinc-500">Sent to: {recipientSummary}</p>
              )}
              {isSender && readByNames.length > 0 && (
                <p className="text-xs text-emerald-600">Read by {readByNames.join(', ')}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
            <span>{sentAt.toLocaleString()}</span>
            {!isSender && (
              <>
                {!isRead ? (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      void markRead(msg.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        void markRead(msg.id);
                      }
                    }}
                    className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white"
                  >
                    Mark read
                  </span>
                ) : (
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      void unmarkRead(msg.id);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        void unmarkRead(msg.id);
                      }
                    }}
                    className="rounded-full border border-zinc-200 bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-zinc-600"
                  >
                    Mark unread
                  </span>
                )}
              </>
            )}
          </div>
        </button>

        <details className="border-t border-zinc-100 sm:hidden">
          <summary
            className={`flex cursor-pointer items-center gap-3 px-4 py-3 ${rowTone}`}
            style={indentStyle}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-sm font-semibold text-zinc-700">
              {initials}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-zinc-900">{fromLabel}</p>
              <p className="text-xs text-zinc-500">{sentAt.toLocaleString()}</p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                isSender
                  ? 'border border-zinc-200 bg-white text-zinc-600'
                  : isRead
                  ? 'border border-zinc-200 bg-white text-zinc-600'
                  : 'bg-amber-500 text-white'
              }`}
            >
              {isSender ? 'Sent' : isRead ? 'Read' : 'Unread'}
            </span>
          </summary>
          <div className="space-y-3 px-4 pb-4">
            <p className="text-sm text-zinc-600">{preview}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={contextHref}
                className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${
                  isInternalNote
                    ? 'border border-violet-200 bg-violet-50 text-violet-700'
                    : isAnnouncement
                    ? 'border border-rose-300 bg-rose-600 text-white shadow-sm'
                    : 'border border-zinc-200 bg-zinc-50 text-zinc-600'
                }`}
              >
                {isAnnouncement && <Megaphone className="mr-1 h-3 w-3" aria-hidden="true" />}
                {contextTagLabel}
              </Link>
              {!isSender && (
                <>
                  {!isRead ? (
                    <button
                      type="button"
                      onClick={() => void markRead(msg.id)}
                      className="rounded-full bg-amber-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-white"
                    >
                      Mark read
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void unmarkRead(msg.id)}
                      className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-zinc-600"
                    >
                      Mark unread
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => void openThread(msg)}
                className="rounded-full border border-brand-primary-200 bg-brand-primary-50 px-3 py-1 text-xs font-semibold text-brand-primary-700"
              >
                Open thread
              </button>
            </div>
          </div>
        </details>
      </div>
    );
  };

  const renderReplyThreads = (nodes: ThreadNode[], depth: number) => (
    <>
      {nodes.map((node) => (
        <div key={node.id} className="space-y-3">
          {renderMessageCard(node, depth)}
          {node.replies.length > 0 && renderReplyThreads(node.replies, depth + 1)}
        </div>
      ))}
    </>
  );

  return (
    <div className="space-y-5">
      {threads.map((thread) => (
        <div key={thread.id} className="space-y-3">
          {renderMessageCard(thread)}
          {thread.replies.length > 0 && (
            <div className="space-y-3 border-l border-zinc-100 pl-5 sm:pl-10">
              {renderReplyThreads(thread.replies, 1)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
