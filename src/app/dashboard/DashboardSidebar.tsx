'use client';

import { useEffect, useLayoutEffect, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  FileText,
  Repeat,
  BarChart2,
  PieChart,
  Settings,
  Home,
  Wrench,
  Package,
  FileSignature,
  Files,
  Bell,
  Calendar,
  UserPlus,
  Sun,
  Moon,
  MessageCircle,
  BookOpen,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useTheme } from '@/components/ThemeProvider';
const buildDisplayName = (profile?: {
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  email?: string | null;
}) => {
  if (!profile) return '';
  const { firstName, lastName, name, email } = profile;
  const composed = [firstName, lastName].filter(Boolean).join(' ').trim();
  if (composed) return composed;
  if (name?.trim()) return name.trim();
  if (email) return email.split('@')[0] ?? 'You';
  return '';
};

const buildCompanyInitials = (label?: string) => {
  if (!label) return 'C';
  const trimmed = label.trim();
  if (!trimmed) return 'C';
  const initials = trimmed
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
  return initials || 'C';
};

function GroupUsersIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <circle cx="12" cy="8" r="3" />
      <circle cx="6.5" cy="11" r="2.5" />
      <circle cx="17.5" cy="11" r="2.5" />
      <path d="M3 20c0-3 2.5-4.5 5.5-4.5" />
      <path d="M9 20c0-2.5 2-4 3-4s3 1.5 3 4" />
      <path d="M18.5 20c0-3 2.5-4.5 5.5-4.5" />
    </svg>
  );
}

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Home, exact: true },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Schedule', href: '/dashboard/scheduling', icon: Calendar },
  { label: 'Leads', href: '/dashboard/leads', icon: UserPlus },
  { label: 'Clients', href: '/dashboard/clients', icon: Users },
  {
    label: 'Proposals',
    href: '/dashboard/proposals',
    icon: FileText,
  },
  {
    label: 'Contracts',
    href: '/dashboard/contracts',
    icon: FileSignature,
  },
  {
    label: 'Products',
    href: '/dashboard/products',
    icon: Package,
    requiresElevated: true,
  },
  { label: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  { label: 'Recurring Payments', href: '/dashboard/recurring', icon: Repeat },
  { label: 'Reporting', href: '/dashboard/reporting', icon: BarChart2 },
  { label: 'Resources', href: '/dashboard/resources', icon: Files },
  { label: 'Compliance', href: '/dashboard/compliance', icon: PieChart },
  { label: 'Documentation', href: '/docs', icon: BookOpen },
  { label: 'Chat', href: '/chat', icon: MessageCircle },
  { label: 'Messaging', href: '/dashboard/messaging', icon: Bell },
];

export function DashboardSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const sidebarTheme = theme;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('clientwave-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem('clientwave-sidebar-collapsed');
    if (stored !== null) {
      setCollapsed(stored === 'true');
    }
  }, []);

  // Ensure contrast/logo text vars are correct on first paint after navigation (e.g., post-onboarding)
  useLayoutEffect(() => {
    if (typeof window === 'undefined') return;
    const computeContrast = (hex?: string | null) => {
      if (!hex) return '#ffffff';
      const cleaned = hex.replace('#', '');
      if (cleaned.length !== 6) return '#ffffff';
      const r = parseInt(cleaned.slice(0, 2), 16) / 255;
      const g = parseInt(cleaned.slice(2, 4), 16) / 255;
      const b = parseInt(cleaned.slice(4, 6), 16) / 255;
      const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
      const [R, G, B] = [r, g, b].map(toLinear);
      const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;
      return luminance > 0.5 ? '#0f172a' : '#ffffff';
    };
    const root = document.documentElement;
    const primary = getComputedStyle(root).getPropertyValue('--color-brand-primary-700')?.trim() || '#1d4ed8';
    const contrast = computeContrast(primary);
    const logoText = contrast === '#ffffff' ? primary : contrast;
    root.style.setProperty('--color-brand-contrast', contrast);
    root.style.setProperty('--color-brand-logo-text', logoText);
  }, []);

  const checkActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname?.startsWith(href);

  const [isAdmin, setIsAdmin] = useState(false);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [profile, setProfile] = useState<
    | {
        firstName?: string | null;
        lastName?: string | null;
        name?: string | null;
        email?: string | null;
        companyName?: string | null;
        role?: string | null;
        position?: string | null;
        positionCustom?: { id?: string | null; name?: string | null } | null;
        company?: { name?: string | null; logoUrl?: string | null } | null;
      }
    | null
  >(null);
  useEffect(() => {
    const abortController = new AbortController();
    const run = async () => {
      try {
        const res = await fetch('/api/me', { 
          cache: 'no-store',
          signal: abortController.signal 
        });
        if (!res.ok) return;
        const data = await res.json();
        setIsAdmin(Boolean(data?.isAdmin));
        setIsSuperAdmin(Boolean(data?.isSuperAdmin));
        setRole(data?.role ?? null);
        setProfile({
          firstName: data?.firstName ?? null,
          lastName: data?.lastName ?? null,
          name: data?.name ?? null,
          email: data?.email ?? null,
          company: data?.company ?? null,
          companyName: data?.company?.name ?? data?.companyName ?? null,
          role: data?.role ?? null,
          position: data?.position ?? null,
          positionCustom: data?.positionCustom ?? null,
        });
      } catch (err) {
        // Ignore abort errors during cleanup
        if (err instanceof Error && err.name === 'AbortError') return;
        // Ignore other errors silently
      }
    };
    run();
    return () => {
      abortController.abort();
    };
  }, []);

  const companyLabel =
    profile?.company?.name?.trim() || profile?.companyName?.trim() || 'Personal account';
  const companyInitial = buildCompanyInitials(companyLabel);
  const companyLogoUrl = profile?.company?.logoUrl ?? null;
  const positionLabel =
    profile?.positionCustom?.name?.trim() ||
    (profile?.position ? profile.position.replace(/_/g, ' ').toUpperCase() : '');

  const privilegedNav = role === 'OWNER' || isAdmin || isSuperAdmin;
  const filteredNavItems = navItems.filter((item) => {
    if ((item.label === 'Reporting' || item.label === 'Compliance') && !privilegedNav) {
      return false;
    }
    if (item.requiresElevated && !privilegedNav) {
      return false;
    }
    return true;
  });

  return (
    <aside
      className={`md:fixed md:left-0 md:top-[85px] flex flex-col gap-4 md:h-[calc(100vh-85px)] min-h-screen border-r ${sidebarTheme === 'dark' ? 'border-zinc-800 bg-zinc-950 text-zinc-100' : 'border-white/20 bg-white text-zinc-900'} p-4 shadow-sm transition-all duration-150 md:overflow-y-auto z-20 ${
        collapsed ? 'w-20' : 'w-70'
      } ${className ?? ''}`}
      data-sidebar-theme={sidebarTheme}
      style={
        sidebarTheme === 'dark'
          ? ({ ['--color-brand-sidebar-text']: '#e2e8f0' } as CSSProperties)
          : undefined
      }
    >
      <div className="relative flex flex-col gap-2">
        <div className="flex items-center justify-between">
          
          <div className={`flex ${collapsed ? 'flex-col' : 'flex-row'} items-center gap-2`}>
            <button
              type="button"
              onClick={() => setCollapsed((prev) => !prev)}
              className="hidden md:inline-flex items-center justify-center rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-brand-primary-600 bg-white"
            >
              {collapsed ? (
                <ChevronRight size={16} className="text-brand-primary-600" />
              ) : (
                <ChevronLeft size={16} className="text-brand-primary-600" />
              )}
            </button>
            <button
              type="button"
              onClick={toggleTheme}
              className={`hidden md:inline-flex items-center justify-center rounded-full border px-3 py-1 text-xs font-semibold ${
                sidebarTheme === 'dark'
                  ? 'border-zinc-700 bg-slate-900 text-zinc-200'
                  : 'border-zinc-200 bg-white text-zinc-600'
              }`}
              aria-label="Toggle theme"
              title="Toggle theme"
            >
              {sidebarTheme === 'dark' ? (
                <Sun size={16} className="text-yellow-500" />
              ) : (
                <Moon size={16} className="text-zinc-500" />
              )}
            </button>
          </div>
        </div>
         
       
        {!collapsed && profile && (
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className={`h-10 w-10 overflow-hidden rounded-full border text-center text-sm font-semibold ${sidebarTheme === 'dark' ? 'border-zinc-700 bg-zinc-800 text-zinc-300' : 'border-zinc-200 bg-white text-zinc-600'}`}>
                {companyLogoUrl ? (
                  <img src={companyLogoUrl} alt="Company logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">{companyInitial}</span>
                )}
              </div>
              <p className={`text-sm font-semibold ${sidebarTheme === 'dark' ? 'text-zinc-200' : 'text-zinc-900'}`}>{companyLabel}</p>
            </div>
          <p className={`text-base font-bold ${sidebarTheme === 'dark' ? 'text-zinc-100' : ''}`} style={sidebarTheme === 'dark' ? {} : { color: 'var(--color-brand-logo-text)' }}>
            {buildDisplayName(profile ?? undefined)}
          </p>
          {positionLabel ? (
            <p className={`text-xs font-semibold uppercase tracking-[0.3em] ${sidebarTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'}`}>{positionLabel}</p>
          ) : null}
        </div>
      )}
        
       
      </div>            
      <nav className="flex-1 text-sm font-semibold">
        <div className="space-y-0 -mx-4 px-0">
          <div className="space-y-[1px]">
            {filteredNavItems.map((item) => {
              const safeHref = item.href?.trim();
              if (!safeHref) return null;
              const isActive = checkActive(safeHref, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={safeHref}
                  href={safeHref}
                  className={`group flex w-full items-center gap-3 px-4 py-2 transition ${
                    collapsed ? 'justify-center' : ''
                  } ${
                    isActive
                      ? 'bg-brand-primary-700 text-[var(--color-brand-contrast)]'
                      : `hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)] ${sidebarTheme === 'dark' ? 'text-zinc-300' : 'text-[var(--color-brand-sidebar-text)] md:text-[var(--color-brand-logo-text)]'}`
                  }`}
                >
                  <Icon
                    size={18}
                    className={`transition ${
                      isActive
                        ? 'text-[var(--color-brand-contrast)]'
                        : `${sidebarTheme === 'dark' ? 'text-zinc-300' : 'text-[var(--color-brand-sidebar-text)] md:text-[var(--color-brand-logo-text)]'} group-hover:text-[var(--color-brand-contrast)]`
                    }`}
                  />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </div>
          {(role === 'OWNER' || isAdmin || isSuperAdmin) && (
            <div className={`space-y-[1px] pt-0 pl-0 ${sidebarTheme === 'dark' ? '' : 'border-t border-white/30'}`}>
              <Link
                href="/dashboard/team"
                className={`group flex w-full items-center gap-3 px-4 py-2 transition ${
                  collapsed ? 'justify-center' : ''
                } ${sidebarTheme === 'dark' ? 'text-zinc-300' : 'text-[var(--color-brand-sidebar-text)] md:text-[var(--color-brand-logo-text)]'} hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)]`}
              >
                <Users
                  size={18}
                  className={`transition ${sidebarTheme === 'dark' ? 'text-zinc-300' : 'text-[var(--color-brand-sidebar-text)] md:text-[var(--color-brand-logo-text)]'} group-hover:text-[var(--color-brand-contrast)]`}
                />
                {!collapsed && <span className="transition group-hover:text-[var(--color-brand-contrast)]">Team</span>}
              </Link>
            </div>
          )}

          {isSuperAdmin && (
            <div className={`space-y-[1px] pt-0 pl-0 ${sidebarTheme === 'dark' ? '' : 'border-t border-white/30'}`}>              
              <Link
                href="/dashboard/admin/users"
                className={`group flex w-full items-center gap-3 px-5 py-2 transition ${
                  collapsed ? 'justify-center' : ''
                } ${sidebarTheme === 'dark' ? 'text-zinc-300' : 'text-[var(--color-brand-sidebar-text)] md:text-[var(--color-brand-logo-text)]'} hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)]`}
              >
                <GroupUsersIcon
                  width={18}
                  height={18}
                  className={`transition ${sidebarTheme === 'dark' ? 'text-zinc-300' : 'text-[var(--color-brand-sidebar-text)] md:text-[var(--color-brand-logo-text)]'} group-hover:text-[var(--color-brand-contrast)]`}
                />
                {!collapsed && <span className="transition group-hover:text-[var(--color-brand-contrast)]">Users</span>}
              </Link>
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}
