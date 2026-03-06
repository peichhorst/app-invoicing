'use client';

import { useState } from 'react';

type PayNowProps = {
  sellerId: string;
  invoiceId: string;
  amountDue: number;
  currency?: string;
  disabled?: boolean;
};

export default function PayNowButton({ sellerId, invoiceId, amountDue, currency, disabled }: PayNowProps) {
  const [loading, setLoading] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [error, setError] = useState<string | null>(null);
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
  });

  const paymentPath = `/payment?seller=${encodeURIComponent(sellerId)}&invoice=${encodeURIComponent(invoiceId)}`;

  const handleCopyPaymentLink = async () => {
    if (disabled) return;
    setCopyState('idle');
    try {
      const absoluteLink = `${window.location.origin}${paymentPath}`;
      await navigator.clipboard.writeText(absoluteLink);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
  };

  const handlePay = async () => {
    if (loading || disabled) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'Unable to start backup checkout');
      }

      if (!data?.url) {
        throw new Error('Stripe session URL missing');
      }

      window.location.assign(data.url);
    } catch (err: any) {
      setError(err?.message || 'Backup checkout failed');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={handleCopyPaymentLink}
          className="inline-flex items-center justify-center rounded-lg border border-brand-primary-300 bg-white px-4 py-2 text-sm font-semibold text-brand-primary-700 shadow-sm transition hover:bg-brand-primary-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Copy Payment Link
        </button>
        <button
          type="button"
          disabled={loading || disabled}
          onClick={handlePay}
          className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:bg-brand-primary-700 disabled:bg-brand-primary-200 disabled:text-zinc-500"
        >
          {loading ? 'Opening payment...' : 'View Payment Link'}
        </button>
      </div>
      {copyState === 'copied' && <p className="text-xs text-emerald-700">Payment link copied.</p>}
      {copyState === 'failed' && <p className="text-xs text-red-600">Unable to copy payment link.</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
