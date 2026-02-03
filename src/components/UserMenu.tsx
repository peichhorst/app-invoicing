'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import UserCompanyHeader from './UserCompanyHeader';

const getInitials = (name?: string | null, email?: string | null) => {
  const base = name?.trim() || email?.split('@')[0]?.trim() || '';
  if (!base) return 'U';
  const tokens = base.split(/[\s._-]+/).filter(Boolean);
  if (tokens.length === 0) {
    return base.charAt(0).toUpperCase();
  }
  return tokens
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('');
};

const resetThemeColor = () => {
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  const defaultAccentColors: Record<number, string> = {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#1d4ed8',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  };
  shades.forEach((shade) => {
    const val = defaultAccentColors[shade];
    document.documentElement.style.setProperty(`--color-brand-accent-${shade}`, val);
    document.documentElement.style.setProperty(`--color-brand-primary-${shade}`, val);
  });
  // Clear localStorage for accent colors
  localStorage.removeItem('accent_color_bus');
  localStorage.removeItem('accent_owner');
};

type UserMenuUser = {
  name?: string | null;
  email?: string | null;
  companyName?: string | null;
  role?: string | null;
  logoDataUrl?: string | null;
};

type UserMenuProps = {
  user: UserMenuUser;
};

export default function UserMenu({ user }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggle = () => setOpen((prev) => !prev);
  const close = () => setOpen(false);

  const renderAvatar = (size: number) =>
    user.logoDataUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={user.logoDataUrl}
        alt="User avatar"
        width={size}
        height={size}
        className="rounded-full object-cover"
      />
    ) : (
      <div
        className="flex h-full w-full items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-brand-primary-700"
        style={{ width: size, height: size, fontSize: size * 0.35 }}
      >
        {getInitials(user.name, user.email)}
      </div>
    );

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="true"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-primary-600 via-fuchsia-600 to-brand-secondary-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-lg shadow-brand-primary-500/30 transition hover:shadow-brand-primary-500/50 focus:outline-none focus:ring-2 focus:ring-white/50"
      >
        <span className="inline-block h-9 w-9 overflow-hidden rounded-full ring-2 ring-white/40">
          {renderAvatar(36)}
        </span>
        <ChevronDown size={16} className="text-white/90" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-3 w-72 rounded-2xl border border-white/10 bg-gradient-to-br from-brand-primary-700 via-brand-secondary-700 to-brand-accent-700 p-5 text-white shadow-2xl backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-white/20 pb-4 mb-4">
            <span className="inline-block h-12 w-12 overflow-hidden rounded-full ring-2 ring-white/30 shadow-lg">
              {renderAvatar(48)}
            </span>
            <UserCompanyHeader
              name={user.name}
              email={user.email}
              companyName={user.companyName}
              role={user.role}
              variant="dropdown"
              className="min-w-0 text-white"
            />
          </div>
          <div className="space-y-2 text-sm">
            <Link
              href="/dashboard/settings"
              onClick={close}
              className="block rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-sm transition hover:bg-white/15 hover:border-white/20"
            >
              Settings
            </Link>
            <button
              onClick={() => {
                resetThemeColor();
                close();
              }}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-sm transition hover:bg-white/15 hover:border-white/20"
            >
              Reset Theme Color
            </button>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-sm transition hover:bg-white/15 hover:border-white/20"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
