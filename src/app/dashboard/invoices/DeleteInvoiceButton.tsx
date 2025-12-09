'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

type Props = {
  invoiceId: string;
};

export function DeleteInvoiceButton({ invoiceId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm('Delete this invoice? This cannot be undone.')) return;
    startTransition(async () => {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to delete invoice.');
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 cursor-pointer disabled:opacity-60"
      title="Delete invoice"
    >
      <X className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">Delete</span>
    </button>
  );
}
