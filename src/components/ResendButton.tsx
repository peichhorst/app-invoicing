// src/components/ResendButton.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  invoiceId: string;
};

export function ResendButton({ invoiceId }: Props) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const resend = async () => {
    if (sending) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/resend`, { method: 'GET' });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      setMessage('Email sent successfully.');
      router.refresh(); // reflect updated sentCount immediately
      setTimeout(() => setMessage(null), 2500);
    } catch (error) {
      console.error('Resend failed', error);
      setMessage('Failed to send.');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={resend}
        disabled={sending}
        className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-sm font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        title="Email Invoice"
      >
        <span aria-hidden="true">{sending ? '…' : '✉️'}</span>
        <span className="sr-only">{sending ? 'Sending…' : 'Resend'}</span>
      </button>
      {message && (
        <span className="text-xs text-gray-600" aria-live="polite">
          {message}
        </span>
      )}
    </div>
  );
}
