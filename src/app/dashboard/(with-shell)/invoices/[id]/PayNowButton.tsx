'use client';

import { useState } from 'react';

type PayNowProps = {
  invoiceId: string;
  amountDue: number;
  currency?: string;
  disabled?: boolean;
};

export default function PayNowButton({ invoiceId, amountDue, currency, disabled }: PayNowProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency ?? 'USD',
  });

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
        throw new Error(data?.error || 'Unable to start payment');
      }

      if (!data?.url) {
        throw new Error('Stripe session URL missing');
      }

      window.location.assign(data.url);
    } catch (err: any) {
      setError(err?.message || 'Payment failed');
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        disabled={loading || disabled}
        onClick={handlePay}
        className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:bg-gray-300 disabled:text-gray-500"
      >
      {loading ? 'Starting payment...' : `Pay ${formatter.format(amountDue)}`}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
