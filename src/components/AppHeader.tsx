'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Menu, ChevronDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMobileSidebar } from '@/components/MobileSidebarContext';
import { Logo } from './Logo';

const InstallPromptButton = dynamic(
  () => import('@/app/InstallPromptButton').then((m) => m.InstallPromptButton),
  { ssr: false },
);
const SwitchBackButton = dynamic(
  () => import('./SwitchBackButton').then((m) => ({ default: m.SwitchBackButton })),
  { ssr: false }
);
const getInitials = (name?: string | null, email?: string | null) => {
  const primary = name?.trim() || email?.split('@')[0]?.trim() || '';
  if (!primary) return 'U';
  const tokens = primary.split(/[\s._-]+/).filter(Boolean);
  if (tokens.length === 0) {
    return primary.charAt(0).toUpperCase();
  }
  return tokens
    .slice(0, 2)
    .map((segment) => segment.charAt(0).toUpperCase())
    .join('');
};

type AppHeaderProps = {
  user: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    companyName?: string | null;
    logoDataUrl?: string | null;
  } | null;
  isOnboarding?: boolean;
};

export default function AppHeader({ user, isOnboarding }: AppHeaderProps) {
  const { open } = useMobileSidebar();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const handle = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handle);
    return () => window.removeEventListener('mousedown', handle);
  }, [menuOpen]);

  const avatar = user?.logoDataUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.logoDataUrl} alt="avatar" className="h-9 w-9 rounded-full object-cover" />
  ) : (
    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-purple-700">
      {getInitials(user?.name, user?.email)}
    </div>
  );

  return (
    <header className="relative border-b border-zinc-200 bg-white w-full px-2 sm:px-0 overflow-visible">
        <div className="grid-overlay absolute inset-0 opacity-25 pointer-events-none" />
      <div className="relative mx-auto flex max-w-6xl items-center justify-between px-0 sm:px-8 lg:px-10 py-4">
        <Link href="/" className="group flex items-center gap-4">
          <Logo size="lg" />
        </Link>
        <div className="flex w-full items-center gap-3">
          <div className="flex items-center gap-3">
            <SwitchBackButton />
            <InstallPromptButton />
          </div>
          <div className="ml-auto flex items-center gap-3">
            {user && !isOnboarding ? (
              <div className="relative">
                <button
                  type="button"
                  ref={buttonRef}
                  onClick={() => setMenuOpen((prev) => !prev)}
                  className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-700 shadow-sm transition hover:bg-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  aria-haspopup="true"
                  aria-expanded={menuOpen}
                >
                  <span className="ring-1 ring-purple-100 rounded-full">{avatar}</span>
                  <ChevronDown size={16} className="text-purple-600" />
                </button>
                {menuOpen && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-full z-20 mt-3 w-52 rounded-2xl border border-purple-300 bg-gradient-to-br from-purple-700 via-purple-800 to-indigo-800 p-3 text-white shadow-2xl shadow-purple-900/40"
                  >
                    <div className="flex flex-col divide-y divide-white/20 text-xs font-semibold  tracking-[0.3em]">
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setMenuOpen(false)}
                        className="rounded-xl px-3 py-2 text-center text-white/90 transition hover:bg-white/10"
                      >
                        Profile
                      </Link>
                      <form action="/api/auth/logout" method="post">
                        <button
                          type="submit"
                          className="w-full rounded-xl px-3 py-2 text-white/90 transition hover:bg-white/10"
                        >
                          Logout
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            ) : null}
            <button
              type="button"
              onClick={open}
              className="md:hidden flex h-10 w-10 items-center justify-center rounded-full border border-purple-300 bg-white text-purple-600 transition hover:border-purple-400 hover:bg-purple-50"
            >
              <span className="sr-only">Open menu</span>
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
