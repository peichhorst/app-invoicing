// src/components/ResendButton.tsx
'use client';

import { useState } from 'react';

type Props = {
  invoiceId: string;
};

export function ResendButton({ invoiceId }: Props) {
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const resend = async () => {
    if (sending) return;
    setSending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/resend`, { method: 'GET' });
      if (!res.ok) {
        throw new Error(await res.text());
      }
      setMessage('Sent!');
      setTimeout(() => setMessage(null), 2500);
    } catch (error) {
      console.error('Resend failed', error);
      setMessage('Failed');
      setTimeout(() => setMessage(null), 3000);
    } finally {
      setSending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={resend}
      disabled={sending}
      className="text-emerald-600 hover:underline font-medium cursor-pointer disabled:opacity-50"
    >
      {sending ? 'Sending…' : message ?? 'Resend'}
    </button>
  );
}
