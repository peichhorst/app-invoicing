'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

type DeleteClientButtonProps = {
  clientId: string;
  companyName: string;
};

export function DeleteClientButton({ clientId, companyName }: DeleteClientButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(`Delete client "${companyName}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert('Failed to delete client.');
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="inline-flex items-center justify-center rounded-lg border border-red-200 px-3 py-1.5 text-sm font-semibold text-red-600 shadow-sm transition hover:bg-red-50 cursor-pointer disabled:opacity-60"
      title="Delete client"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
