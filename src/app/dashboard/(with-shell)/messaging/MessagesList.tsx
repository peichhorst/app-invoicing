'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

type Message = {
  id: string;
  text: string;
  fileUrl?: string | null;
  sentAt: string | Date;
  toAll?: boolean;
  toPositions?: string[];
  toUserIds?: string[];
  from?: { name?: string | null; email?: string | null } | null;
  fromId?: string;
  readBy?: { id: string }[];
};

type Props = {
  messages: Message[];
  currentUserId: string;
  positionsById: Record<string, string>;
  usersById: Record<string, string>;
};

export default function MessagesList({ messages, currentUserId, positionsById, usersById }: Props) {
  const router = useRouter();
  const [localMessages, setLocalMessages] = useState(messages);
  const [activeTab, setActiveTab] = useState<'all' | 'internal' | 'unread'>('unread');
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const pollingRef = useRef(false);
  const messageCountRef = useRef<number>(messages.length);

  useEffect(() => {
    setDeleting(false);
    setDeleteError(null);
  }, [deleteTargetId]);

  const handleDelete = async (messageId: string) => {
    if (!messageId) {
      setDeleteError('Missing message id.');
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/messages/${encodeURIComponent(messageId)}`, { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Delete failed');
      }
      setLocalMessages((prev) => prev.filter((m) => m.id !== messageId));
      router.refresh();
      setDeleteTargetId(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
    }
  };

  const handleMarkAsRead = async (messageId: string) => {
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
      router.refresh();
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

  const handleUnmarkAsRead = async (messageId: string) => {
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
      router.refresh();
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

  // Poll for new messages and refresh when count changes
  useEffect(() => {
    const poll = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        const res = await fetch('/api/messages/status', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { messageCount?: number };
          const count = typeof data.messageCount === 'number' ? data.messageCount : null;
          if (count !== null && count !== messageCountRef.current) {
            messageCountRef.current = count;
            router.refresh();
          }
        }
      } catch {
        // ignore
      } finally {
        pollingRef.current = false;
      }
    };

    const interval = setInterval(poll, 3000);
    void poll();
    return () => clearInterval(interval);
  }, [router]);

  // Listen for broadcast events
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

  // Update local state when props change
  useEffect(() => {
    setLocalMessages(messages);
    messageCountRef.current = messages.length;
  }, [messages]);

  const isInternalOnly = (msg: Message) =>
    !msg.toAll &&
    (msg.toPositions?.length ?? 0) === 0 &&
    (msg.toUserIds?.length ?? 0) === 1 &&
    msg.toUserIds?.[0] === currentUserId;

  const visibleMessages =
    activeTab === 'internal'
      ? localMessages.filter((msg) => isInternalOnly(msg))
      : activeTab === 'unread'
      ? localMessages.filter((msg) => {
          const isSender = msg.fromId === currentUserId;
          const isRead = (msg.readBy ?? []).some((r) => r.id === currentUserId) || isSender;
          return !isRead;
        })
      : localMessages;

  if (!visibleMessages.length) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-500">
        {activeTab === 'internal' ? 'No internal notes yet.' : 'No messages yet.'}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {[
          { key: 'unread', label: 'Unread' },
          { key: 'all', label: 'All messages' },
          { key: 'internal', label: 'Internal notes' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as 'all' | 'internal' | 'unread')}
            className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] ${
              activeTab === tab.key
                ? 'bg-brand-primary-700 text-white'
                : 'border border-zinc-200 bg-white text-zinc-600 hover:text-brand-primary-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {visibleMessages.map((msg) => {
        const isSender = msg.fromId === currentUserId;
        const isRead = msg.readBy?.some((r) => r.id === currentUserId) || isSender;
        const sent = typeof msg.sentAt === 'string' ? new Date(msg.sentAt) : msg.sentAt;
        const fromLabel = msg.from?.name || msg.from?.email || 'Someone';
        const recipientParts: string[] = [];
        const readByNames = (msg.readBy ?? [])
          .map((reader) => (reader.id === currentUserId ? null : usersById[reader.id]))
          .filter(Boolean) as string[];

        if (isInternalOnly(msg)) {
          recipientParts.push('Internal Note');
        } else if (msg.toAll) {
          recipientParts.push('Announcement (All Team Members)');
        } else {
          const positionNames = (msg.toPositions ?? [])
            .map((id) => positionsById[id])
            .filter(Boolean);
          if (positionNames.length) {
            recipientParts.push(positionNames.join(', '));
          }
          const userNames = (msg.toUserIds ?? [])
            .map((id) => (id === currentUserId ? 'You' : usersById[id]))
            .filter(Boolean);
          if (userNames.length) {
            recipientParts.push(userNames.join(', '));
          }
        }

        const recipientLabel = recipientParts.length ? recipientParts.join(' • ') : 'Direct';

        return (
          <div
            key={msg.id}
            className={`rounded-xl border p-4 shadow-sm transition ${
              isSender
                ? 'border-brand-accent-100 bg-brand-accent-50'
                : isRead
                ? 'border-zinc-200 bg-white'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-zinc-900">
                  {fromLabel}
                  {isSender && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-brand-primary-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-brand-primary-700">
                      Sent
                    </span>
                  )}
                  {isRead && !isSender && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                      Read
                    </span>
                  )}
                  {!isRead && !isSender && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                      New
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-500">
                  {sent.toLocaleString()} <span className="text-zinc-400">•</span> Sent to {recipientLabel}
                </p>
                {isSender && readByNames.length > 0 && (
                  <p className="text-xs text-emerald-600">Read by {readByNames.join(', ')}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isSender && (
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(msg.id)}
                    className="rounded-full border border-transparent px-2 py-1 text-xs font-semibold text-zinc-400 transition hover:border-zinc-200 hover:text-zinc-600"
                    aria-label="Delete message"
                  >
                    ×
                  </button>
                )}
                {msg.fileUrl && msg.fileUrl.trim() && (
                  <a
                    href={msg.fileUrl}
                    className="text-xs font-semibold text-brand-primary-700 hover:text-brand-primary-900"
                    target="_blank"
                    rel="noreferrer"
                  >
                    View attachment
                  </a>
                )}
                {!isRead && !isSender && (
                  <button
                    type="button"
                    onClick={() => handleMarkAsRead(msg.id)}
                    className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-600"
                  >
                    Mark as read
                  </button>
                )}
                {isRead && !isSender && (
                  <button
                    type="button"
                    onClick={() => handleUnmarkAsRead(msg.id)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
                  >
                    Unmark as read
                  </button>
                )}
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-800">{msg.text}</p>
          </div>
        );
      })}
      <ConfirmationModal
        isOpen={Boolean(deleteTargetId)}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={() => deleteTargetId && handleDelete(deleteTargetId)}
        closeOnConfirm={false}
        title="Delete message?"
        message={deleteError || 'This will remove the message for everyone.'}
        confirmText={deleting ? 'Deleting...' : 'Delete'}
        cancelText="Cancel"
        align="center"
      />
    </div>
  );
}
