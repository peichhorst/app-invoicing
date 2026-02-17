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
        className="inline-flex items-center gap-2 rounded-full px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-800 shadow-lg transition focus:outline-none focus:ring-2 focus:ring-brand-primary-500"
      >
        <span className="inline-block h-9 w-9 overflow-hidden rounded-full ring-2 ring-zinc-300 dark:ring-zinc-600">
          {renderAvatar(36)}
        </span>
        <ChevronDown size={16} className="text-zinc-600 dark:text-zinc-300" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-10 mt-3 w-72 rounded-2xl p-5 shadow-2xl border bg-white text-zinc-900 border-zinc-200 dark:bg-zinc-900 dark:text-white dark:border-zinc-800">
          <div className="flex items-center gap-3 pb-4 mb-4 border-b border-zinc-200 dark:border-zinc-700">
            <span className="inline-block h-12 w-12 overflow-hidden rounded-full shadow-lg ring-2 ring-zinc-300 dark:ring-zinc-600">
              {renderAvatar(48)}
            </span>
            <UserCompanyHeader
              name={user.name}
              email={user.email}
              companyName={user.companyName}
              role={user.role}
              variant="dropdown"
              className="min-w-0"
            />
          </div>
          <div className="space-y-2 text-sm">
            <Link
              href="/dashboard/settings"
              onClick={close}
              className="block rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.3em] shadow-sm transition border bg-zinc-50 text-zinc-900 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 dark:bg-zinc-800 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-700 dark:hover:border-zinc-600"
            >
              Settings
            </Link>
            <button
              onClick={() => {
                resetThemeColor();
                close();
              }}
              className="w-full rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.3em] shadow-sm transition border bg-zinc-50 text-zinc-900 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 dark:bg-zinc-800 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-700 dark:hover:border-zinc-600"
            >
              Reset Theme Color
            </button>
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="w-full rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.3em] shadow-sm transition border bg-zinc-50 text-zinc-900 border-zinc-200 hover:bg-zinc-100 hover:border-zinc-300 dark:bg-zinc-800 dark:text-white dark:border-zinc-700 dark:hover:bg-zinc-700 dark:hover:border-zinc-600"
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
