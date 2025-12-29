'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Menu, ChevronDown, User as UserIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useMobileSidebar } from '@/components/MobileSidebarContext';
import { Logo } from './Logo';

const InstallPromptButton = dynamic(
  () => import('@/app/InstallPromptButton').then((m) => m.InstallPromptButton),
  { ssr: false },
);
const SwitchBackButton = dynamic(
  () => import('./SwitchBackButton').then((m) => m.SwitchBackButton),
  { ssr: false }
);
const getInitials = (name?: string | null) => {
  const primary = name?.trim() || '';
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
    companyLogoUrl?: string | null;
    companyId?: string | null;
    useHeaderLogo?: boolean | null;
    companyPrimaryColor?: string | null;
  } | null;
  isOnboarding?: boolean;
};

export default function AppHeader({ user, isOnboarding }: AppHeaderProps) {
  const themeLogoColor =
    user?.companyPrimaryColor && user.companyPrimaryColor !== ''
      ? user.companyPrimaryColor
      : 'var(--color-brand-primary-500)';
  const [useCompanyLogo, setUseCompanyLogo] = useState(Boolean(user?.useHeaderLogo));
  const [tempLogoUrl, setTempLogoUrl] = useState<string | null>(null);

  // Stable handler refs to avoid listener leaks across rerenders
  const toggleHandlerRef = useRef<(e: Event) => void>(() => {});
  const uploadedHandlerRef = useRef<(e: Event) => void>(() => {});

  useEffect(() => {
    toggleHandlerRef.current = (event: Event) => {
      const detail = (event as CustomEvent<boolean | undefined>).detail;
      if (typeof detail === 'boolean') {
        setUseCompanyLogo(detail);
      }
    };
    uploadedHandlerRef.current = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      setTempLogoUrl(detail);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const toggle = (event: Event) => toggleHandlerRef.current?.(event);
    const uploaded = (event: Event) => uploadedHandlerRef.current?.(event);
    window.addEventListener('company-logo-toggle', toggle as EventListener);
    window.addEventListener('company-logo-uploaded', uploaded as EventListener);
    return () => {
      window.removeEventListener('company-logo-toggle', toggle as EventListener);
      window.removeEventListener('company-logo-uploaded', uploaded as EventListener);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const token = setTimeout(() => {
      setUseCompanyLogo(Boolean(user?.useHeaderLogo));
    }, 0);
    return () => clearTimeout(token);
  }, [user?.useHeaderLogo]);

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

  const hasName = Boolean(user?.name && user.name.trim().length > 0);
  const shouldUseInitials = hasName && !isOnboarding;
  const avatar = user?.logoDataUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={user.logoDataUrl} alt="avatar" className="h-11 w-11 rounded-full object-cover" />
  ) : shouldUseInitials ? (
    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-sm font-semibold uppercase text-brand-primary-700">
      {getInitials(user?.name)}
    </div>
  ) : (
    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-brand-primary-700">
      <UserIcon size={18} />
    </div>
  );

  return (
    <header className="relative border-b border-zinc-200 bg-white w-full px-2 sm:px-0 overflow-visible">
      <div className="grid-overlay absolute inset-0 opacity-25 pointer-events-none" />
      <div className="relative mx-auto flex max-w-7xl items-center justify-between px-0 sm:px-8 lg:px-10 py-3">
        <Link href="/" className="group flex items-center gap-4">
          {useCompanyLogo && (tempLogoUrl || user?.companyLogoUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={(tempLogoUrl || user?.companyLogoUrl) as string}
              alt={user?.companyName || 'Company logo'}
              className="h-14 w-auto max-w-[220px] object-contain"
            />
          ) : (
              <Logo size="lg" alt={user?.companyName || 'ClientWave'} textColor={themeLogoColor} />
            )}
          </Link>
        <div className="flex w-full items-center gap-3">
          <div className="flex items-center gap-3">
            <InstallPromptButton />
            <SwitchBackButton />
          </div>
          <div className="ml-auto flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  type="button"
                  ref={buttonRef}
                  onClick={() => setMenuOpen((prev) => !prev)}
          className="inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary-700 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-500"
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          <span className="ring-1 ring-brand-primary-100 rounded-full">{avatar}</span>
                  <ChevronDown size={18} style={{ color: themeLogoColor }} />
                </button>
                {menuOpen && (
                  <div
                    ref={menuRef}
                    className="absolute right-0 top-full z-20 mt-3 w-56 rounded-2xl border border-zinc-200 bg-white p-3 text-zinc-900 shadow-2xl"
                  >
                    <div className="space-y-2">
                      <Link
                        href="/dashboard/profile"
                        onClick={() => setMenuOpen(false)}
                        className="block rounded-xl border border-brand-primary-700 bg-brand-primary-600 px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-sm transition hover:border-brand-primary-700 hover:bg-brand-primary-700"
                      >
                        Profile
                      </Link>
                      <form action="/api/auth/logout" method="post">
                        <button
                          type="submit"
                          className="w-full rounded-xl border border-brand-primary-700 bg-brand-primary-600 px-3 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-sm transition hover:border-brand-primary-700 hover:bg-brand-primary-700"
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
              className="md:hidden flex h-[52px] w-[52px] items-center justify-center rounded-full border border-[var(--color-brand-logo-text)] bg-white text-[var(--color-brand-logo-text)] transition hover:border-brand-primary-400 hover:bg-brand-primary-50"
            >
              <span className="sr-only">Open menu</span>
              <Menu size={25} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
