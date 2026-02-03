"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

type Props = {
  leadId: string;
  leadName?: string;
  disabled?: boolean;
};

export function DeleteLeadButton({ leadId, leadName, disabled }: Props) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      const res = await fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to delete lead.');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setShowConfirm(true)}
        disabled={disabled || isPending}
        className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 disabled:opacity-60"
        title={disabled ? 'Cannot delete converted lead' : 'Delete lead'}
      >
        <Trash2 className="h-4 w-4" aria-hidden="true" />
        <span className="sr-only">Delete lead</span>
      </button>

      <ConfirmationModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete lead?"
        message={
          disabled
            ? 'Converted leads cannot be deleted. Archive or revert the conversion first.'
            : `Delete ${leadName ?? 'this lead'}? This action cannot be undone.`
        }
        confirmText="Delete"
        cancelText="Cancel"
        align="center"
      />
    </>
  );
}
