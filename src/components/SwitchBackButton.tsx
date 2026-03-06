'use client';

import { useEffect, useState, useTransition } from 'react';
import type { CSSProperties } from 'react';
import { ArrowLeft } from 'lucide-react';

type Props = {
  className?: string;
  style?: CSSProperties;
  variant?: 'default' | 'floating';
};

export function SwitchBackButton({ className = '', style, variant = 'default' }: Props) {
  const [visible, setVisible] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const token = setTimeout(() => {
      const hasBackup = document.cookie.split(';').some((c) => c.trim().startsWith('session_token_backup='));
      const isImpersonating = document.cookie
        .split(';')
        .some((c) => c.trim().startsWith('impersonating_session=1'));
      setVisible(hasBackup && isImpersonating);
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

  const defaultBaseClasses =
    'h-12 w-12 rounded-full shadow-xl shadow-brand-primary-200/60 border transition flex items-center justify-center';
  const defaultActiveClasses =
    'border-brand-primary-200 bg-white text-brand-primary-700 hover:bg-brand-primary-50 hover:text-brand-primary-700 cursor-pointer';
  const floatingBaseClasses =
    'h-14 w-14 rounded-full bg-blue-600 text-white shadow-lg transition-all duration-300 flex items-center justify-center';
  const floatingActiveClasses =
    'hover:scale-110 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 cursor-pointer';
  const baseClasses = variant === 'floating' ? floatingBaseClasses : defaultBaseClasses;
  const activeClasses = variant === 'floating' ? floatingActiveClasses : defaultActiveClasses;
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
