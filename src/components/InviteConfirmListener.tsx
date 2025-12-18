'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Toast = {
  id: string;
  logicalKey: string;
  title: string;
  body: string;
  reverted?: boolean;
  isMessage?: boolean;
  timestamp: number;
};

/**
 * React-based toast listener with BroadcastChannel + light polling fallback.
 * - Throttles duplicates for same invoice/status to avoid double-firing (broadcast + poll)
 * - Chime only for positive events
 * - Red styling for reverted payments
 * - Newest on top
 */
export function InviteConfirmListener({ userId }: { userId?: string }) {
  const router = useRouter();
  const lastChimeRef = useRef<string | null>(null);
  const inviteCountRef = useRef<number | null>(null);
  const paidCountRef = useRef<number | null>(null);
  const messageCountRef = useRef<number | null>(null);
  const pollingRef = useRef(false);
  const recentKeysRef = useRef<Map<string, number>>(new Map());
  const processedCountChangesRef = useRef<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Debug: Log when component mounts
  useEffect(() => {
    console.log('🔔 InviteConfirmListener mounted');
    return () => {
      console.log('🔕 InviteConfirmListener unmounted');
    };
  }, []);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const playChimeOnce = useCallback((key: string, reverted?: boolean, soundType?: 'payment' | 'message') => {
    if (reverted) return; // no chime on revert
    if (lastChimeRef.current === key) return;
    lastChimeRef.current = key;
    try {
      const soundFile = soundType === 'message' ? '/success-chime.mp3' : '/payment-chime.mp3';
      const audio = new Audio(soundFile);
      audio.volume = 0.7;
      audio.play().catch(() => {});
    } catch {
      // ignore audio failures
    }
  }, []);

  const showToast = useCallback(
    (title: string, body: string, logicalKey: string, reverted?: boolean, isMessage?: boolean) => {
      const now = Date.now();
      const bucketKey = `${logicalKey}:${reverted ? 'rev' : isMessage ? 'msg' : 'paid'}`;
      const lastTime = recentKeysRef.current.get(bucketKey);
      if (lastTime && now - lastTime < 3000) {
        return; // throttle duplicate of same invoice/status within 3s
      }
      recentKeysRef.current.set(bucketKey, now);

      const id = `${logicalKey}-${now}`;
      playChimeOnce(id, reverted, isMessage ? 'message' : 'payment');
      setToasts((prev) => [...prev, { id, logicalKey, title, body, reverted, timestamp: now, isMessage }]);
    },
    [playChimeOnce],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const processEvent = useCallback(
    (type: string | undefined, payload: any, newCount?: number, source?: string) => {
      if (!type) return;
      if (type === 'invite-confirmed') {
        const user = payload?.user || {};
        const key = `invite-${user.email || user.name || Date.now()}`;
        const body = `${user.name || 'Someone'} (${user.email || 'email hidden'}) is now confirmed.`;
        showToast('Confirmation received', body, key, false, false);
        router.refresh();
        return;
      }
      if (type === 'message-received') {
        const { messageId, fromId, fromName, text } = payload || {};
        // Skip notification if user is the sender
        if (fromId && userId && fromId === userId) {
          router.refresh();
          return;
        }
        const key = `message-${messageId || Date.now()}`;
        const body = `${fromName || 'Someone'}: ${text || 'New message'}`;
        showToast('New Message', body, key, false, true);
        router.refresh();
        return;
      }
      if (type === 'invoice-paid') {
        const { invoiceId, invoiceNumber, clientName, reverted } = payload || {};

        // DEBUG LOGGING
        console.log('📊 Processing invoice-paid event:', {
          source,
          invoiceId,
          invoiceNumber,
          reverted,
          newCount
        });
        
        // Use invoiceId for key (most reliable)
        const key = invoiceId ? `invoice-${invoiceId}` : 'unknown';
        
        // Create fingerprint using count and reverted state ONLY (ignore invoice details)
        // This way both broadcast and polling will generate the same fingerprint
        const changeFingerprint = `count:${newCount}:${reverted ? 'rev' : 'paid'}`;
        
        console.log('🔑 Fingerprint:', changeFingerprint, 'Already processed?', processedCountChangesRef.current.has(changeFingerprint));
        
        // If we've already processed this exact change, skip it
        if (processedCountChangesRef.current.has(changeFingerprint)) {
          console.log('⏭️ SKIPPED - already processed');
          return;
        }
        
        console.log('✅ SHOWING TOAST');
        
        // Mark this change as processed
        processedCountChangesRef.current.add(changeFingerprint);
        
        // Clean up old fingerprints after 15 seconds
        setTimeout(() => {
          processedCountChangesRef.current.delete(changeFingerprint);
        }, 15000);
        
        const label = invoiceNumber ? `Invoice #${invoiceNumber}` : invoiceId ? `Invoice ${invoiceId}` : 'An invoice';
        const clientLabel = clientName ? ` – ${clientName}` : '';
        const body = `${label}${clientLabel} was ${reverted ? 'reverted to Unpaid' : 'marked paid'}.`;
        showToast('Invoice updated', body, key, Boolean(reverted), false);
        router.refresh();
        return;
      }
    },
    [showToast, router],
  );

  // BroadcastChannel: instant same-browser updates
  useEffect(() => {
    const channel = new BroadcastChannel('clientwave-events');
    const handleMessage = (event: MessageEvent) => {
      const data = event.data || {};
      
      // Get the new count for fingerprinting
      if (data.type === 'invoice-paid') {
        const reverted = data.payload?.reverted;
        const currentCount = paidCountRef.current;
        const newCount = reverted ? (currentCount || 0) - 1 : (currentCount || 0) + 1;
        processEvent(data.type, data.payload ?? data, newCount, 'broadcast');
      } else {
        processEvent(data.type, data.payload ?? data, undefined, 'broadcast');
      }
    };
    channel.addEventListener('message', handleMessage);
    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [processEvent]);

  // Polling fallback to catch updates across devices/browsers
  useEffect(() => {
    const poll = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;
      try {
        // Invites
        try {
          const res = await fetch('/api/invite/status', { cache: 'no-store' });
          if (res.ok) {
            const data = (await res.json()) as {
              confirmedCount?: number;
              lastConfirmed?: { name?: string | null; email?: string | null };
            };
            const count = typeof data.confirmedCount === 'number' ? data.confirmedCount : null;
            if (count !== null) {
              if (inviteCountRef.current !== null && count > inviteCountRef.current) {
                processEvent('invite-confirmed', { user: data.lastConfirmed });
              }
              inviteCountRef.current = count;
            }
          }
        } catch {
          // ignore
        }

        // Paid invoices (detect both mark-paid and revert)
        try {
          const res = await fetch('/api/invoices/paid-status', { cache: 'no-store' });
          if (res.ok) {
            const data = (await res.json()) as {
              paidCount?: number;
              lastPaid?: { id?: string | null; invoiceNumber?: string | null; clientName?: string | null; timestamp?: number } | null;
              lastChanged?: { id?: string | null; invoiceNumber?: string | null; clientName?: string | null; status?: string | null; timestamp?: number } | null;
            };
            const count = typeof data.paidCount === 'number' ? data.paidCount : null;
            if (count !== null) {
              const prev = paidCountRef.current;
              if (prev !== null && count !== prev) {
                const reverted = count < prev;
                const sourceInvoice = reverted ? data.lastChanged ?? data.lastPaid : data.lastPaid ?? data.lastChanged;
                processEvent('invoice-paid', {
                  invoiceId: sourceInvoice?.id,
                  invoiceNumber: sourceInvoice?.invoiceNumber,
                  clientName: sourceInvoice?.clientName,
                  reverted,
                  timestamp: sourceInvoice?.timestamp,
                }, count, 'polling');
              }
              paidCountRef.current = count;
            }
          }
        } catch {
          // ignore
        }

        // Messages (detect new unread messages)
        try {
          const res = await fetch('/api/messages/status', { cache: 'no-store' });
          if (res.ok) {
            const data = (await res.json()) as {
              messageCount?: number;
              lastMessage?: { id?: string | null; text?: string | null; fromId?: string | null; fromName?: string | null; sentAt?: number } | null;
            };
            const count = typeof data.messageCount === 'number' ? data.messageCount : null;
            if (count !== null) {
              const prev = messageCountRef.current;
              if (prev !== null && count > prev && data.lastMessage) {
                processEvent('message-received', {
                  messageId: data.lastMessage.id,
                  fromId: data.lastMessage.fromId,
                  fromName: data.lastMessage.fromName,
                  text: data.lastMessage.text,
                }, count, 'polling');
              }
              messageCountRef.current = count;
            }
          }
        } catch {
          // ignore
        }
      } finally {
        pollingRef.current = false;
      }
    };

    const interval = setInterval(poll, 4000);
    void poll();
    return () => clearInterval(interval);
  }, [processEvent]);

  return toasts.length ? (
    <div className="fixed bottom-4 right-4 z-50 space-y-3">
      {[...toasts].reverse().map((toast) => {
        const colors = toast.isMessage
          ? { bg: 'border border-blue-200 bg-blue-50', dot: 'bg-blue-500', title: 'text-blue-800', time: 'text-blue-600', body: 'text-blue-700', button: 'text-blue-700 hover:text-blue-900' }
          : toast.reverted
          ? { bg: 'border border-rose-200 bg-rose-50', dot: 'bg-rose-500', title: 'text-rose-800', time: 'text-rose-600', body: 'text-rose-700', button: 'text-rose-700 hover:text-rose-900' }
          : { bg: 'border border-emerald-200 bg-emerald-50', dot: 'bg-emerald-500', title: 'text-emerald-800', time: 'text-emerald-600', body: 'text-emerald-700', button: 'text-emerald-700 hover:text-emerald-900' };
        
        return (
        <div
          key={toast.id}
          className={`rounded-xl px-4 py-3 shadow-lg ${colors.bg}`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 h-2.5 w-2.5 rounded-full ${colors.dot}`}
              aria-hidden
            />
            <div className="flex-1 space-y-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className={`text-sm font-semibold ${colors.title}`}>
                  {toast.title}
                </p>
                <span className={`text-xs font-medium ${colors.time}`}>
                  {formatTime(toast.timestamp)}
                </span>
              </div>
              <p className={`text-xs ${colors.body}`}>
                {toast.body}
              </p>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              className={`ml-2 text-xs font-semibold ${colors.button}`}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        </div>
        );
      })}
    </div>
  ) : null;
}
