 'use client';

 import { useEffect, useRef, useState, useCallback } from 'react';
 import { useRouter } from 'next/navigation';

const STORAGE_KEY = 'clientwave-notification-counts';

type StoredCounts = {
  invite?: number;
  paid?: number;
  message?: number;
};

const loadCounts = (): StoredCounts => {
  if (typeof window === 'undefined') return {};
  const stored = sessionStorage.getItem(STORAGE_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored) as StoredCounts;
  } catch {
    return {};
  }
};

const saveCounts = (counts: StoredCounts) => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
};

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
  const lastMessageIdRef = useRef<string | null>(null);
  const pollingRef = useRef(false);
  const isVisibleRef = useRef(true);
  const recentKeysRef = useRef<Map<string, number>>(new Map());
  const bookingToastKeysRef = useRef<Set<string>>(new Set());
  const processedBookingKeysRef = useRef<Set<string>>(new Set());
  const processedCountChangesRef = useRef<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'denied',
  );
  const [localTabId, setLocalTabId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  const [countsHydrated, setCountsHydrated] = useState(false);

  const persistCounts = useCallback(() => {
    saveCounts({
      invite: inviteCountRef.current ?? 0,
      paid: paidCountRef.current ?? 0,
      message: messageCountRef.current ?? 0,
    });
  }, []);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const counts = loadCounts();
    inviteCountRef.current = typeof counts.invite === 'number' ? counts.invite : null;
    paidCountRef.current = typeof counts.paid === 'number' ? counts.paid : null;
    messageCountRef.current = typeof counts.message === 'number' ? counts.message : null;
    setCountsHydrated(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setLocalTabId(window.sessionStorage.getItem('cw-tab-id'));
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const updateVisibility = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
    };
    updateVisibility();
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      document.removeEventListener('visibilitychange', updateVisibility);
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

  const playChimeOnce = useCallback(
    (key: string, reverted?: boolean, soundType?: 'payment' | 'message' | 'success') => {
    if (reverted) return; // no chime on revert
    if (lastChimeRef.current === key) return;
    lastChimeRef.current = key;
    try {
      const soundFile =
        soundType === 'success'
          ? '/success-chime.mp3'
          : soundType === 'message'
          ? '/success-chime.mp3'
          : '/payment-chime.mp3';
      const audio = new Audio(soundFile);
      audio.volume = 0.7;
      audio.play().catch(() => {});
    } catch {
      // ignore audio failures
    }
  }, []);

  const triggerDesktopNotification = useCallback(
    (title: string, body: string) => {
      if (notificationPermission !== 'granted' || typeof Notification === 'undefined') {
        return;
      }
      try {
        new Notification(title, {
          body,
          icon: '/icon-192.png',
        });
      } catch {
        // ignore
      }
    },
    [notificationPermission],
  );

  const requestNotificationPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    setNotificationPermission(result);
  }, []);

  const showToast = useCallback(
    (
      title: string,
      body: string,
      logicalKey: string,
      reverted?: boolean,
      isMessage?: boolean,
      soundType?: 'payment' | 'message' | 'success',
    ) => {
      const now = Date.now();
      const bucketKey = `${logicalKey}:${reverted ? 'rev' : isMessage ? 'msg' : 'paid'}`;
      const lastTime = recentKeysRef.current.get(bucketKey);
      if (lastTime && now - lastTime < 3000) {
        return; // throttle duplicate of same invoice/status within 3s
      }
      recentKeysRef.current.set(bucketKey, now);

      const id = `${logicalKey}-${now}`;
      playChimeOnce(id, reverted, soundType || (isMessage ? 'message' : 'payment'));
        setToasts((prev) => [...prev, { id, logicalKey, title, body, reverted, timestamp: now, isMessage }]);
        triggerDesktopNotification(title, body);
      },
    [playChimeOnce, triggerDesktopNotification],
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
        showToast('Invite Confirmation', body, key, false, false, 'success');
        router.refresh();
        inviteCountRef.current = (inviteCountRef.current ?? 0) + 1;
        persistCounts();
        return;
      }
      if (type === 'booking-created') {
        const { ownerId: targetOwnerId, slotLabel, startTime } = payload || {};
        if (!userId || !targetOwnerId || userId !== targetOwnerId) {
          return;
        }
        if (payload?.tabId && payload.tabId === localTabId) {
          return;
        }
        const bookingFingerprint = `booking-${slotLabel ?? startTime ?? Date.now()}`;
        if (processedBookingKeysRef.current.has(bookingFingerprint)) {
          return;
        }
        const dateLabel = startTime
          ? new Date(startTime).toLocaleString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true,
            })
          : null;
      const stableKey = slotLabel ?? startTime ?? 'unknown';
      const bookingKey = `booking-${stableKey}`;
      if (bookingToastKeysRef.current.has(bookingKey)) {
        return;
      }
      bookingToastKeysRef.current.add(bookingKey);
        const body = slotLabel
          ? `New booking at ${slotLabel}`
          : `New booking scheduled${dateLabel ? ` for ${dateLabel}` : ''}`;
        showToast('New booking', body, bookingKey, false, false, 'success');
        processedBookingKeysRef.current.add(bookingFingerprint);
        setTimeout(() => {
          processedBookingKeysRef.current.delete(bookingFingerprint);
        }, 15000);
        return;
      }
      if (type === 'message-received') {
        const { messageId, fromId, fromName, text } = payload || {};
        // Skip notification if user is the sender
        if (fromId && userId && fromId === userId) {
          router.refresh();
          return;
        }
        if (messageId) {
          lastMessageIdRef.current = messageId;
        }
        const key = `message-${messageId || Date.now()}`;
        const body = `${fromName || 'Someone'}: ${text || 'New message'}`;
        showToast('New Message', body, key, false, true);
        router.refresh();
        messageCountRef.current = (messageCountRef.current ?? 0) + 1;
        persistCounts();
        return;
      }
      if (type === 'invoice-paid') {
        const { invoiceId, invoiceNumber, clientName, reverted } = payload || {};
        // Use invoiceId for key (most reliable)
        const key = invoiceId ? `invoice-${invoiceId}` : 'unknown';
        
        // Create fingerprint using count and reverted state ONLY (ignore invoice details)
        // This way both broadcast and polling will generate the same fingerprint
        const changeFingerprint = `count:${newCount}:${reverted ? 'rev' : 'paid'}`;

        // If we've already processed this exact change, skip it
        if (processedCountChangesRef.current.has(changeFingerprint)) {
          return;
        }

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
        if (typeof newCount === 'number') {
          paidCountRef.current = newCount;
        } else {
          paidCountRef.current = (paidCountRef.current ?? 0) + (reverted ? -1 : 1);
        }
        persistCounts();
        return;
      }
    },
    [showToast, router, localTabId],
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
    if (!countsHydrated || !userId) return;
    if (process.env.NEXT_PUBLIC_DISABLE_POLLING === 'true') return;
    const poll = async () => {
      if (pollingRef.current) return;
      if (!isVisibleRef.current) return;
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
              if (inviteCountRef.current === null) {
                inviteCountRef.current = count;
                persistCounts();
              } else if (count > inviteCountRef.current) {
                processEvent('invite-confirmed', { user: data.lastConfirmed });
                inviteCountRef.current = count;
                persistCounts();
              }
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
              if (paidCountRef.current === null) {
                paidCountRef.current = count;
                persistCounts();
              } else if (count > paidCountRef.current) {
                const sourceInvoice = data.lastPaid ?? data.lastChanged;
                processEvent('invoice-paid', {
                  invoiceId: sourceInvoice?.id,
                  invoiceNumber: sourceInvoice?.invoiceNumber,
                  clientName: sourceInvoice?.clientName,
                  reverted: false,
                  timestamp: sourceInvoice?.timestamp,
                }, count, 'polling');
                paidCountRef.current = count;
                persistCounts();
              } else if (count < paidCountRef.current) {
                // Mark as unpaid: trigger processEvent with reverted: true
                const sourceInvoice = data.lastChanged ?? data.lastPaid;
                processEvent('invoice-paid', {
                  invoiceId: sourceInvoice?.id,
                  invoiceNumber: sourceInvoice?.invoiceNumber,
                  clientName: sourceInvoice?.clientName,
                  reverted: true,
                  timestamp: sourceInvoice?.timestamp,
                }, count, 'polling');
                paidCountRef.current = count;
                persistCounts();
              }
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
              const lastId = data.lastMessage?.id ?? null;
              const isNewId = lastId && lastId !== lastMessageIdRef.current;
              if (messageCountRef.current === null) {
                messageCountRef.current = count;
                persistCounts();
                if (lastId) {
                  lastMessageIdRef.current = lastId;
                }
              } else if (count > messageCountRef.current && data.lastMessage && isNewId) {
                processEvent('message-received', {
                  messageId: data.lastMessage.id,
                  fromId: data.lastMessage.fromId,
                  fromName: data.lastMessage.fromName,
                  text: data.lastMessage.text,
                }, count, 'polling');
                messageCountRef.current = count;
                persistCounts();
                if (lastId) {
                  lastMessageIdRef.current = lastId;
                }
              } else if (lastId) {
                lastMessageIdRef.current = lastId;
              }
            }
          }
        } catch {
          // ignore
        }
      } finally {
        pollingRef.current = false;
      }
    };

    const interval = setInterval(poll, 15000);
    void poll();
    return () => clearInterval(interval);
  }, [processEvent, countsHydrated, userId]);

  const showPermissionPrompt =
    isMounted && notificationPermission === 'default' && typeof Notification !== 'undefined';

  if (!isMounted) {
    return null;
  }

  return (
    <>
      {showPermissionPrompt && (
        <div className="fixed bottom-4 right-4 z-50 w-72 space-y-2 rounded-xl border border-zinc-200 bg-white/90 p-3 text-xs text-zinc-700 shadow-lg backdrop-blur">
          <p className="font-semibold text-zinc-900">Enable desktop alerts?</p>
          <p className="text-[10px] text-zinc-500">
            Grant browser notifications to hear the chime even when the tab is hidden.
          </p>
          <button
            type="button"
            onClick={requestNotificationPermission}
            className="inline-flex w-full items-center justify-center rounded-md border border-brand-primary-200 bg-brand-primary-50 px-3 py-1 text-[11px] font-semibold text-brand-primary-700 hover:bg-brand-primary-100"
          >
            Enable notifications
          </button>
        </div>
      )}
      {toasts.length ? (
        <div className="fixed bottom-4 right-4 z-50 space-y-3">
          {[...toasts].reverse().map((toast) => {
            const colors = toast.isMessage
              ? {
                  bg: 'border border-brand-accent-200 bg-brand-accent-50',
                  dot: 'bg-brand-accent-500',
                  title: 'text-brand-accent-800',
                  time: 'text-brand-accent-600',
                  body: 'text-brand-accent-700',
                  button: 'text-brand-accent-700 hover:text-brand-accent-900',
                }
              : toast.reverted
              ? {
                  bg: 'border border-rose-200 bg-rose-50',
                  dot: 'bg-rose-500',
                  title: 'text-rose-800',
                  time: 'text-rose-600',
                  body: 'text-rose-700',
                  button: 'text-rose-700 hover:text-rose-900',
                }
              : {
                  bg: 'border border-emerald-200 bg-emerald-50',
                  dot: 'bg-emerald-500',
                  title: 'text-emerald-800',
                  time: 'text-emerald-600',
                  body: 'text-emerald-700',
                  button: 'text-emerald-700 hover:text-emerald-900',
                };

            return (
              <div
                key={toast.id}
                className={`rounded-xl px-4 py-3 shadow-lg ${colors.bg} ${toast.isMessage ? 'cursor-pointer' : ''}`}
                onClick={() => {
                  if (toast.isMessage) {
                    router.push('/dashboard/messaging');
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${colors.dot}`} aria-hidden />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={`text-sm font-semibold ${colors.title}`}>{toast.title}</p>
                      <span className={`text-xs font-medium ${colors.time}`}>{formatTime(toast.timestamp)}</span>
                    </div>
                    <p className={`text-xs ${colors.body}`}>{toast.body}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      dismissToast(toast.id);
                    }}
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
      ) : null}
    </>
  );
}
