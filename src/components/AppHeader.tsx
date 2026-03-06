'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Menu, ChevronDown, User as UserIcon, Sun, Moon } from 'lucide-react';
import { useMobileSidebar } from '@/components/MobileSidebarContext';
import { Logo } from './Logo';
import { useTheme } from './ThemeProvider';

const getInitials = (name?: string | null) => {
  const primary = name?.trim() || '';
  if (!primary) return 'U';
  const tokens = primary.split(/[\s._-]+/).filter(Boolean);
  if (tokens.length === 0) {
    return primary.charAt(0).toUpperCase();
  }
  // Show as many initials as words, up to 3 for visual balance
  return tokens
    .map((segment) => segment.charAt(0).toUpperCase())
    .slice(0, 3)
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
  const pathname = usePathname();
  const isAuthenticated = Boolean(user);
  const { theme, toggleTheme } = useTheme();
  const quickLinks = [
    { label: 'Documentation', href: '/docs' },
    { label: 'Chat', href: '/chat' },
  ];
  const dropdownButtonBase =
    'block w-full rounded-md border px-3 py-2 text-center text-xs font-semibold uppercase tracking-[0.3em] shadow-sm transition';
  const dropdownButtonPrimary = `${dropdownButtonBase} border-zinc-200 dark:border-zinc-700 bg-brand-primary-700 dark:bg-brand-primary-600 text-white hover:bg-brand-primary-800 dark:hover:bg-brand-primary-700`;
  const dropdownButtonSecondary = `${dropdownButtonBase} border-zinc-200 dark:border-zinc-700 bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700`;
  const showGenericHeader =
    typeof pathname === 'string' &&
    (pathname.startsWith('/clientwave-support') || pathname.startsWith('/support'));
  const logoUser = showGenericHeader ? null : user;
  const themeLogoColor =
    logoUser?.companyPrimaryColor && logoUser.companyPrimaryColor !== ''
      ? logoUser.companyPrimaryColor
      : 'var(--color-brand-primary-700)';
  const [useCompanyLogo, setUseCompanyLogo] = useState(Boolean(logoUser?.useHeaderLogo));
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
      setUseCompanyLogo(Boolean(logoUser?.useHeaderLogo));
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
  const isDark = theme === 'dark';
  // Context-aware primary color for initials badge
  const initialsBg = logoUser?.companyPrimaryColor || 'var(--color-brand-primary-700)';
  const initialsText = '#fff';
  const avatar = logoUser?.logoDataUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logoUser.logoDataUrl} alt="avatar" className="h-11 w-11 rounded-full object-cover" />
  ) : shouldUseInitials ? (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-700 text-sm font-semibold uppercase p-2 tracking-widest font-mono"
      style={{ background: initialsBg, color: initialsText }}
    >
      {getInitials(logoUser?.name ?? user?.name)}
    </div>
  ) : (
    <div
      className={`flex h-11 w-11 items-center justify-center rounded-full border ${
        isDark ? 'border-zinc-700 bg-zinc-800 text-zinc-300' : 'border-zinc-200 bg-zinc-50 text-brand-primary-700'
      }`}
    >
      <UserIcon size={18} />
    </div>
  );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-30 w-full px-2 sm:px-0 overflow-visible border-b ${
        isDark ? 'border-zinc-800 bg-zinc-950 text-zinc-100' : 'border-zinc-200 bg-white text-zinc-900'
      }`}
    >
        <div className="relative mx-auto flex h-[85px] max-w-none items-center justify-between px-0 sm:px-4 lg:px-4">
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
          <div className="hidden md:flex items-center gap-3" />
        <div className="flex w-full items-center gap-3">
          <div className="ml-auto flex items-center gap-3">
            {isAuthenticated && (
              <button
                type="button"
                onClick={open}
                className={`md:hidden flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-[var(--color-brand-logo-text)] text-[var(--color-brand-logo-text)] transition hover:border-brand-primary-400 ${
                  isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-white hover:bg-brand-primary-50'
                }`}
              >
                <span className="sr-only">Open menu</span>
                <Menu size={28} />
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                ref={buttonRef}
                onClick={() => setMenuOpen((prev) => !prev)}
                className={`inline-flex rounded-full border focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary-700 ${
                  isAuthenticated
                    ? `items-center gap-2 px-3 py-2 text-sm font-semibold uppercase tracking-[0.3em] shadow-sm ${
                        isDark
                          ? 'bg-transparent text-zinc-200 border-[var(--color-brand-logo-text)]'
                          : 'bg-transparent text-brand-primary-700 border-[var(--color-brand-logo-text)]'
                      }`
                    : `h-[56px] w-[56px] items-center justify-center border-2 transition hover:border-brand-primary-400 ${
                        isDark ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-white hover:bg-brand-primary-50'
                      }`
                }`}
                style={
                  isAuthenticated
                    ? undefined
                    : {
                        borderColor: themeLogoColor,
                        color: themeLogoColor,
                      }
                }
                aria-haspopup="true"
                aria-expanded={menuOpen}
              >
                {isAuthenticated ? (
                  <>
                    <span className={`ring-1 rounded-full ${isDark ? 'ring-zinc-700' : 'ring-brand-primary-100'}`}>{avatar}</span>
                    <ChevronDown
                      size={18}
                      style={{ color: theme === 'dark' ? 'white' : themeLogoColor }}
                    />
                  </>
                ) : (
                  <>
                    <Menu
                      size={28}
                      style={{ color: theme === 'dark' ? 'white' : themeLogoColor }}
                    />
                    <span className="sr-only">Open menu</span>
                  </>
                )}
              </button>
              {menuOpen && (
                <div
                  ref={menuRef}
                  className="absolute right-0 top-full z-20 mt-3 w-56 rounded-2xl border border-[var(--color-brand-logo-text)] bg-white p-3 text-zinc-900 shadow-2xl"
                >
                  <div className="space-y-2">
                    <Link
                      href={isAuthenticated ? '/dashboard' : '/login'}
                      onClick={() => setMenuOpen(false)}
                      className={dropdownButtonPrimary}
                    >
                      {isAuthenticated ? 'Dashboard' : 'Login / Register'}
                    </Link>
                    {quickLinks.map((link) => {
                      const isActive =
                        pathname === link.href || pathname?.startsWith(`${link.href}/`);
                      return (
                        <Link
                          key={link.label}
                          href={link.href}
                          onClick={() => setMenuOpen(false)}
                          className={`${dropdownButtonBase} ${
                            isActive
                              ? 'border-zinc-200 dark:border-zinc-700 bg-brand-primary-700 dark:bg-brand-primary-600 text-white hover:bg-brand-primary-800 dark:hover:bg-brand-primary-700'
                              : 'border-zinc-200 dark:border-zinc-700 bg-white text-zinc-700 hover:bg-zinc-100 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700'
                          }`}
                        >
                          {link.label}
                        </Link>
                      );
                    })}
                    {isAuthenticated && (
                      <button
                        type="button"
                        onClick={toggleTheme}
                        className={`flex items-center justify-center gap-2 ${dropdownButtonSecondary}`}
                      >
                        {theme === 'dark' ? (
                          <Sun size={16} className="text-yellow-500" />
                        ) : (
                          <Moon size={16} className="text-zinc-500" />
                        )}
                        <span>Theme</span>
                      </button>
                    )}
                    {isAuthenticated && (
                      <form action="/api/auth/logout" method="post">
                        <button
                          type="submit"
                          onClick={() => {
                            localStorage.removeItem('clientwave-theme');
                          }}
                          className={dropdownButtonPrimary}
                        >
                          Logout
                        </button>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
