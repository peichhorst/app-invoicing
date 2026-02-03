'use client';

import { useEffect, useState, useTransition } from 'react';
import type { CSSProperties } from 'react';
import { ArrowLeft } from 'lucide-react';

type Props = {
  className?: string;
  style?: CSSProperties;
};

export function SwitchBackButton({ className = '', style }: Props) {
  const [visible, setVisible] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const token = setTimeout(() => {
      const hasBackup = document.cookie.split(';').some((c) => c.trim().startsWith('session_token_backup='));
      setVisible(hasBackup);
    }, 0);
    return () => clearTimeout(token);
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

  const baseClasses =
    'h-12 w-12 rounded-full shadow-xl shadow-brand-primary-200/60 border transition flex items-center justify-center';
  const activeClasses =
    'border-brand-primary-200 bg-white text-brand-primary-700 hover:bg-brand-primary-50 hover:text-brand-primary-700 cursor-pointer';
  const disabledClasses = 'opacity-60 cursor-not-allowed';

  return (
    <button
      type="button"
      aria-label="Switch back to admin"
      onClick={handleSwitchBack}
      disabled={isPending}
      className={`${baseClasses} ${activeClasses} ${isPending ? disabledClasses : ''} ${className}`}
      style={style}
    >
      <ArrowLeft className="h-6 w-6" strokeWidth={2} />
    </button>
  );
}
