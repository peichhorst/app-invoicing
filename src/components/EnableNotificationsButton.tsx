'use client';

import { useEffect, useState } from 'react';

const toUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const base64Safe = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64Safe);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
};

export function EnableNotificationsButton() {
  const vapidPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
  const [status, setStatus] = useState<'idle' | 'working' | 'enabled' | 'denied' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [pendingAction, setPendingAction] = useState<'enable' | 'disable' | null>(null);

  useEffect(() => {
    const detect = async () => {
      if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
        setChecked(true);
        return;
      }
      const permission = Notification.permission;
      if (permission === 'granted') {
        setStatus('enabled');
      } else if (permission === 'denied') {
        setStatus('denied');
      }
      setChecked(true);
    };
    void detect();
  }, []);

  const handleEnable = async () => {
    setMessage(null);
    if (!vapidPublic) {
      setMessage('Push key not configured. Ask an admin to set NEXT_PUBLIC_VAPID_PUBLIC_KEY.');
      setStatus('error');
      return;
    }
    if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) {
      setMessage('Notifications are not supported on this device/browser.');
      setStatus('error');
      return;
    }
    setStatus('working');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setStatus('denied');
        setMessage('Permission was denied. You can re-enable notifications in browser settings.');
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(vapidPublic),
      });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Failed to save subscription');
      }
      setStatus('enabled');
      setMessage('Notifications enabled. You will get chimes for events.');
    } catch (err) {
      console.error('Enable notifications failed', err);
      const reason = err instanceof Error ? err.message : 'Failed to enable notifications';
      setStatus('error');
      setMessage(reason);
    } finally {
      setPendingAction(null);
    }
  };

  const handleDisable = async () => {
    setMessage(null);
    if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('Notification' in window)) {
      setMessage('Notifications are not supported on this device/browser.');
      setStatus('error');
      return;
    }
    setPendingAction('disable');
    setStatus('working');
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        try {
          await fetch('/api/push/subscribe', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sub),
          });
        } catch {
          // best-effort server cleanup
        }
        await sub.unsubscribe();
      }
      setStatus('idle');
      setMessage('Notifications disabled.');
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Failed to disable notifications';
      setStatus('error');
      setMessage(reason);
    } finally {
      setPendingAction(null);
    }
  };

  const showDisable = status === 'enabled' || pendingAction === 'disable';
  const enableLabel =
    status === 'working' && pendingAction === 'enable'
      ? 'Enabling...'
      : status === 'denied'
      ? 'Request again'
      : 'Enable notifications';
  const disableLabel = status === 'working' && pendingAction === 'disable' ? 'Disabling...' : 'Disable';

  return (
    <div className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Notifications</p>
          <p className="text-sm text-zinc-600">
            {status === 'enabled' ? 'Notifications on' : 'Get payment and invite alerts with sound.'}
          </p>
        </div>
        {showDisable ? (
          <button
            type="button"
            onClick={handleDisable}
            disabled={status === 'working'}
            className="rounded-full border border-rose-200 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 shadow-sm transition hover:bg-rose-50 disabled:opacity-60"
          >
            {disableLabel}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleEnable}
            disabled={status === 'working'}
            className="rounded-full border border-brand-secondary-200 bg-white px-3 py-1.5 text-sm font-semibold text-brand-secondary-700 shadow-sm transition hover:bg-brand-secondary-50 disabled:opacity-60"
          >
            {enableLabel}
          </button>
        )}
      </div>
      {message && (
        <p
          className={`text-xs ${
            status === 'enabled'
              ? 'text-emerald-700'
              : status === 'denied' || status === 'error'
              ? 'text-rose-700'
              : 'text-zinc-600'
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
