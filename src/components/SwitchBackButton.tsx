'use client';

import { useEffect, useState, useTransition } from 'react';
import { ArrowLeft } from 'lucide-react';

export function SwitchBackButton() {
  const [visible, setVisible] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const hasBackup = document.cookie.split(';').some((c) => c.trim().startsWith('session_token_backup='));
    setVisible(hasBackup);
  }, []);

  const handleSwitchBack = () => {
    startTransition(async () => {
      const res = await fetch('/api/auth/impersonate/switch-back', { method: 'POST' });
      if (res.ok) {
        window.location.href = '/dashboard';
      } else {
        const data = await res.json().catch(() => null);
        alert(data?.error ?? 'Failed to switch back.');
      }
    });
  };

  if (!visible) return null;

  return (
    <button
      type="button"
      aria-label="Switch back to admin"
      onClick={handleSwitchBack}
      disabled={isPending}
      className="fixed top-4 left-4 z-50 h-12 w-12 rounded-full border border-orange-200 bg-white text-orange-600 shadow-xl shadow-orange-200/60 transition hover:bg-orange-50 disabled:opacity-60 flex items-center justify-center cursor-pointer"
    >
      <ArrowLeft className="h-6 w-6" strokeWidth={2} />
    </button>
  );
}
