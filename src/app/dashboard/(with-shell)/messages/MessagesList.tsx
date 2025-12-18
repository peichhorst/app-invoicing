'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

type Message = {
  id: string;
  text: string;
  fileUrl?: string | null;
  sentAt: string | Date;
  from?: { name?: string | null; email?: string | null } | null;
  fromId?: string;
  readBy?: { id: string }[];
};

type Props = {
  messages: Message[];
  currentUserId: string;
};

export default function MessagesList({ messages, currentUserId }: Props) {
  const router = useRouter();
  const [localMessages, setLocalMessages] = useState(messages);
  const pollingRef = useRef(false);
  const messageCountRef = useRef<number>(messages.length);

  const handleMarkAsRead = async (messageId: string) => {
    try {
      await fetch('/api/messages/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [messageId] }),
      });
      setLocalMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, readBy: [...(m.readBy ?? []), { id: currentUserId }] } : m)),
      );
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

  if (!localMessages.length) {
    return (
      <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-4 text-sm text-zinc-500">
        No messages yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {localMessages.map((msg) => {
        const isSender = msg.fromId === currentUserId;
        const isRead = msg.readBy?.some((r) => r.id === currentUserId) || isSender;
        const sent = typeof msg.sentAt === 'string' ? new Date(msg.sentAt) : msg.sentAt;
        const fromLabel = msg.from?.name || msg.from?.email || 'Someone';

        return (
          <div
            key={msg.id}
            className={`rounded-xl border p-4 shadow-sm transition ${
              isSender
                ? 'border-blue-100 bg-blue-50'
                : isRead
                ? 'border-zinc-200 bg-white'
                : 'border-amber-200 bg-amber-50'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold text-zinc-900">
                  {fromLabel}
                  {!isRead && !isSender && (
                    <span className="ml-2 inline-flex items-center rounded-full bg-amber-500 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                      New
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-500">{sent.toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2">
                {msg.fileUrl && msg.fileUrl.trim() && (
                  <a
                    href={msg.fileUrl}
                    className="text-xs font-semibold text-purple-700 hover:text-purple-900"
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
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-zinc-800">{msg.text}</p>
          </div>
        );
      })}
    </div>
  );
}
