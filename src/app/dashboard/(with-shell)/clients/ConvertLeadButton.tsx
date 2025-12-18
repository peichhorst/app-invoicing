'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function ConvertLeadButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleConvert = () => {
    startTransition(async () => {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isLead: false }),
      });
      if (!res.ok) {
        const txt = await res.text();
        alert(txt || 'Failed to convert lead');
        return;
      }
      router.refresh();
    });
  };

  return (
    <button
      type="button"
      onClick={handleConvert}
      disabled={isPending}
      className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-200 px-3 py-1.5 text-sm font-semibold text-amber-700 shadow-sm transition hover:bg-amber-50 disabled:opacity-60"
    >
      Convert to client
    </button>
  );
}
