'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

type Props = {
  invoiceId: string;
};

export function DeleteInvoiceButton({ invoiceId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);

  const handleDelete = () => {
    startTransition(async () => {
      const res = await fetch(`/api/invoices/${invoiceId}`, { method: 'DELETE' });
      if (res.ok) {
        const payload = (await res.json().catch(() => null)) as { action?: 'deleted' | 'voided' } | null;
        if (payload?.action === 'voided') {
          alert('Invoice was voided to preserve payment/reporting history.');
        }
        router.refresh();
      } else {
        alert('Failed to delete invoice.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={isPending}
        className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 cursor-pointer disabled:opacity-60"
        title="Delete invoice"
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Delete</span>
      </button>
      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete or void invoice?"
        message="Draft invoices with no payments are permanently deleted. All others are marked VOID to preserve payment/reporting history."
        confirmText="Delete"
        cancelText="Cancel"
        align="center"
      />
    </>
  );
}
