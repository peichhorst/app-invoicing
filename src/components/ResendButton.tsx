'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  invoiceId: string;
};

export function ResendButton({ invoiceId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeMode, setActiveMode] = useState<'original' | 'reminder' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessCheck, setShowSuccessCheck] = useState(false);
  const router = useRouter();

  const resend = async (mode: 'original' | 'reminder') => {
    if (sending) return;
    setSending(true);
    setActiveMode(mode);
    setError(null);
    setShowSuccessCheck(false);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode }),
      });
      if (!res.ok) {
        throw new Error(await res.text());
      }

      setShowSuccessCheck(true);
      setIsOpen(false);
      router.refresh();
      setTimeout(() => setShowSuccessCheck(false), 2500);
    } catch (err) {
      console.error('Resend failed', err);
      setError('Failed to send.');
      setTimeout(() => setError(null), 3000);
    } finally {
      setSending(false);
      setActiveMode(null);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={sending}
        className="inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white p-2 text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50 disabled:cursor-not-allowed disabled:opacity-50"
        title="Resend invoice"
      >
        <span aria-hidden="true">
          {sending ? (
            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-primary-200 border-t-brand-primary-700" />
          ) : showSuccessCheck ? (
            '\u2713'
          ) : (
            '\u2709'
          )}
        </span>
        <span className="sr-only">{sending ? 'Sending...' : 'Choose resend mode'}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 py-6 md:items-center">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Resend invoice</p>
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-700"
                onClick={() => setIsOpen(false)}
                disabled={sending}
              >
                Close
              </button>
            </div>
            <p className="text-sm text-zinc-700">Choose how this resend should be labeled in the email.</p>
            <div className="grid gap-3">
              <button
                type="button"
                onClick={() => resend('original')}
                disabled={sending}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-left text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending && activeMode === 'original' ? 'Sending...' : 'Send as Original'}
              </button>
              <button
                type="button"
                onClick={() => resend('reminder')}
                disabled={sending}
                className="rounded-lg border border-brand-primary-200 bg-brand-primary-50 px-4 py-3 text-left text-sm font-semibold text-brand-primary-800 transition hover:border-brand-primary-300 hover:bg-brand-primary-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sending && activeMode === 'reminder' ? 'Sending...' : 'Send as Reminder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <span className="text-xs text-rose-600" aria-live="polite">
          {error}
        </span>
      )}
    </div>
  );
}
