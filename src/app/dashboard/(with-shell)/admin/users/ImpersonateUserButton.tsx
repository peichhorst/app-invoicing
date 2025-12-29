'use client';

import { useTransition } from 'react';
import { ArrowUpRight } from 'lucide-react';

type ImpersonateUserButtonProps = {
  userId: string;
  userName: string;
  className?: string;
};

export function ImpersonateUserButton({ userId, userName, className }: ImpersonateUserButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleImpersonate = () => {
    startTransition(async () => {
      const res = await fetch(`/api/admin/users/${userId}/impersonate`, { method: 'POST' });
      if (res.ok) {
        window.location.href = '/dashboard';
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? 'Failed to impersonate user.');
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleImpersonate}
      disabled={isPending}
      className={`inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-50 disabled:opacity-60 ${className ?? ''}`}
      title={`Login as ${userName}`}
    >
      <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      <span className="sr-only">Impersonate</span>
    </button>
  );
}
