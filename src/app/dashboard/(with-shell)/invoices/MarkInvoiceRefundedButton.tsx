'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type MarkInvoiceRefundedButtonProps = {
  invoiceId: string;
  status: string;
  variant?: 'button' | 'link';
};

export function MarkInvoiceRefundedButton({
  invoiceId,
  status,
  variant = 'button',
}: MarkInvoiceRefundedButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/mark-refunded`, { method: 'POST' });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') ?? '';
        let message = 'Failed to mark invoice refunded';

        if (contentType.includes('application/json')) {
          const data = await res.json().catch(() => null);
          message = data?.error || data?.message || message;
        } else {
          const txt = await res.text();
          message = txt || message;
        }

        throw new Error(message);
      }

      router.refresh();
    } catch (err: any) {
      console.error('Mark invoice refunded failed', err);
      setError(err?.message || 'Unable to mark invoice refunded');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'REFUNDED') {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      {variant === 'button' ? (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-2 justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
            loading
              ? 'bg-brand-primary-600 opacity-70 cursor-wait'
              : 'bg-brand-primary-600 hover:bg-brand-primary-700'
          }`}
        >
          <span className="uppercase tracking-[0.2em] text-xs">
            {loading ? 'Marking...' : 'Mark Refunded'}
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
            loading
              ? 'cursor-wait border-brand-primary-300 bg-brand-primary-100 text-brand-primary-700'
              : 'border-brand-primary-200 bg-white text-brand-primary-700 hover:border-brand-primary-300 hover:bg-brand-primary-50'
          }`}
        >
          <span className="uppercase tracking-[0.2em]">{loading ? 'Updating...' : 'Mark Refunded'}</span>
        </button>
      )}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
