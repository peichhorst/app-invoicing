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
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<string>('');
  const [otherPaymentMethod, setOtherPaymentMethod] = useState('');

  const handleSubmit = async () => {
    if (loading) return;
    if (!paymentMethod) {
      setError('Select a payment method.');
      return;
    }
    if (paymentMethod === 'other' && !otherPaymentMethod.trim()) {
      setError('Enter the custom payment method.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          otherPaymentMethod: paymentMethod === 'other' ? otherPaymentMethod.trim() : undefined,
        }),
      });
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
          },
        });
        channel.close();
      } catch {
        // ignore broadcast issues
      }

      setIsOpen(false);
      setPaymentMethod('');
      setOtherPaymentMethod('');
      router.refresh();
    } catch (err: any) {
      console.error('Update paid status failed', err);
      setError(err?.message || 'Unable to update invoice status');
    } finally {
      setLoading(false);
    }
  };

  if (status === 'PAID') {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      {variant === 'button' ? (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsOpen(true);
          }}
          className={`inline-flex items-center gap-2 justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
            loading
              ? 'bg-brand-primary-600 opacity-70 cursor-wait'
              : 'bg-brand-primary-600 hover:bg-brand-primary-700'
          }`}
        >
          {loading ? (
            'Marking...'
          ) : (
            <span className="uppercase tracking-[0.2em] text-xs">Mark Paid</span>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setError(null);
            setIsOpen(true);
          }}
          className={`inline-flex items-center justify-center rounded-md border px-3 py-1.5 text-xs font-semibold shadow-sm transition ${
            loading
              ? 'cursor-wait border-brand-primary-300 bg-brand-primary-100 text-brand-primary-700'
              : 'border-brand-primary-200 bg-white text-brand-primary-700 hover:border-brand-primary-300 hover:bg-brand-primary-50'
          }`}
        >
          <span className="uppercase tracking-[0.2em]">{loading ? 'Updating...' : 'Mark Paid'}</span>
        </button>
      )}
      {error && <p className="text-xs text-rose-500">{error}</p>}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 py-6 md:items-center">
          <div className="w-full max-w-md space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Mark invoice paid</div>
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-700"
                onClick={() => {
                  if (loading) return;
                  setIsOpen(false);
                }}
              >
                Close
              </button>
            </div>
            <label className="flex flex-col items-start text-left text-xs text-zinc-500">
              <span className="mb-1">Payment method</span>
              <select
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              >
                <option value="">Select method</option>
                <option value="venmo">Venmo</option>
                <option value="zelle">Zelle</option>
                <option value="check">Check</option>
                <option value="cash">Cash</option>
                <option value="other">Other</option>
              </select>
            </label>
            {paymentMethod === 'other' && (
              <label className="flex flex-col items-start text-left text-xs text-zinc-500">
                <span className="mb-1">Other method</span>
                <input
                  type="text"
                  value={otherPaymentMethod}
                  onChange={(event) => setOtherPaymentMethod(event.target.value)}
                  className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
                  placeholder="Enter payment method"
                />
              </label>
            )}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition ${
                  loading
                    ? 'cursor-wait bg-brand-primary-600 opacity-70'
                    : 'bg-brand-primary-600 hover:bg-brand-primary-700'
                }`}
              >
                {loading ? 'Marking...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
