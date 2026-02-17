'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type MarkInvoicePaidButtonProps = {
  invoiceId: string;
  invoiceNumber?: string;
  clientName?: string;
  status: string;
  variant?: 'button' | 'link';
};

export function MarkInvoicePaidButton({
  invoiceId,
  invoiceNumber,
  clientName,
  status,
  variant = 'button',
}: MarkInvoicePaidButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    if (loading) return;
    const targetMethod = status === 'PAID' ? 'DELETE' : 'POST';
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/mark-paid`, { method: targetMethod });
      if (!res.ok) {
        const contentType = res.headers.get('content-type') ?? '';
        let message = 'Failed to update paid status';

        if (contentType.includes('application/json')) {
          const data = await res.json().catch(() => null);
          message = data?.error || data?.message || message;
        } else {
          const txt = await res.text();
          message = txt || message;
        }

        throw new Error(message);
      }

      try {
        const channel = new BroadcastChannel('clientwave-events');
        channel.postMessage({
          type: 'invoice-paid',
          payload: {
            invoiceId,
            invoiceNumber,
            clientName,
            reverted: targetMethod === 'DELETE',
          },
        });
        channel.close();
      } catch {
        // ignore broadcast issues
      }

      router.refresh();
    } catch (err: any) {
      console.error('Update paid status failed', err);
      setError(err?.message || 'Unable to update invoice status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      {variant === 'button' ? (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-2 justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
            status === 'PAID'
              ? 'bg-green-600 hover:bg-green-700'
              : loading
              ? 'bg-brand-primary-600 opacity-70 cursor-wait'
              : 'bg-brand-primary-600 hover:bg-brand-primary-700'
          }`}
        >
          {status === 'PAID' ? (
            <>
              Paid
              <span className="text-xs font-semibold underline">(Unmark)</span>
            </>
          ) : loading ? (
            'Marking...'
          ) : (
            'Mark as Paid'
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center gap-1 text-xs font-semibold ${
            status === 'PAID' ? 'text-rose-700 hover:text-rose-800' : 'text-brand-primary-700 hover:text-brand-primary-800'
          }`}
        >
          {loading
            ? 'Updating...'
            : status === 'PAID'
            ? 'Paid (Unmark)'
            : 'Mark Paid'}
        </button>
      )}
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
