'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

export function ConvertLeadButton({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleConvert = () => {
    if (!confirm('Convert this lead to a client?')) return;
    startTransition(async () => {
      try {
        const currentUserId = (window as any).CURRENT_USER_ID;
        const res = await fetch(`/api/clients/${clientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            isLead: false,
            conversion: {
              source: 'CONVERTED_FROM_LEAD',
              convertedAt: new Date().toISOString(),
              convertedById: currentUserId || undefined,
            },
          }),
        });
        if (!res.ok) {
          const txt = await res.text();
          alert(txt || 'Failed to convert lead');
          return;
        }
        alert('Lead successfully converted to client!');
        router.refresh();
      } catch (err) {
        console.error(err);
        alert('Failed to convert lead');
      }
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
