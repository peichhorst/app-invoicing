'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type MarkInvoicePaidButtonProps = {
  invoiceId: string;
  status: string;
};

export function MarkInvoicePaidButton({ invoiceId, status }: MarkInvoicePaidButtonProps) {
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
        const txt = await res.text();
        throw new Error(txt || 'Failed to update paid status');
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
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center gap-2 justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition ${
          status === 'PAID'
            ? 'bg-green-600 hover:bg-green-700'
            : loading
            ? 'bg-purple-600 opacity-70 cursor-wait'
            : 'bg-purple-600 hover:bg-purple-700'
        }`}
      >
        {status === 'PAID' ? (
          <>
            Paid
            <span aria-hidden="true" className="text-xl leading-3">
              &times;
            </span>
          </>
        ) : loading ? (
          'Marking...'
        ) : (
          'Mark as Paid'
        )}
      </button>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
