'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Users,
  FileText,
  Repeat,
  BarChart2,
  Settings,
  Home,
  Wrench,
  FileSignature,
  Files,
  Bell,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
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

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Home, exact: true },
  { label: 'Clients', href: '/dashboard/clients', icon: Users },
  { label: 'Invoices', href: '/dashboard/invoices', icon: FileText },
  { label: 'Recurring', href: '/dashboard/recurring', icon: Repeat },
  {
    label: 'Proposals & Contracts',
    href: '/dashboard/proposals-contracts',
    icon: FileSignature,
  },
  { label: 'Reporting', href: '/dashboard/reporting', icon: BarChart2 },
  { label: 'Resources', href: '/dashboard/resources', icon: Files },
  { label: 'Messages', href: '/dashboard/messages', icon: Bell },
];

export function DashboardSidebar({ className }: { className?: string }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('clientwave-sidebar-collapsed') === 'true';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('clientwave-sidebar-collapsed', String(collapsed));
  }, [collapsed]);

  const checkActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname?.startsWith(href);

  const [isAdmin, setIsAdmin] = useState(false);
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
    let active = true;
    const run = async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!active) return;
        setIsAdmin(Boolean(data?.isAdmin));
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
      } catch {
        // ignore
      }
    };
    run();
    return () => {
      active = false;
    };
  }, []);

  const companyLabel =
    profile?.company?.name?.trim() || profile?.companyName?.trim() || 'Personal account';
  const companyInitial = companyLabel.charAt(0).toUpperCase() || 'C';
  const companyLogoUrl = profile?.company?.logoUrl ?? null;
  const positionLabel =
    profile?.positionCustom?.name?.trim() ||
    (profile?.position ? profile.position.replace(/_/g, ' ').toUpperCase() : '');

  return (
    <aside
      className={`flex flex-col gap-4 min-h-screen h-full border-r border-white/20 bg-white/90 p-4 shadow-sm transition-all duration-150 ${
        collapsed ? 'w-20' : 'w-60'
      } ${className ?? ''}`}
    >
      <div className="relative flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div>
            {!collapsed && (
              <>
                <div className="flex items-center gap-2">
                  {className?.includes('pt-4') && <Logo size="sm" showText={false} />}
                  <h2 className="mt-1 text-lg font-small text-purple-700 pb-2">Control Center</h2>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="hidden md:inline-flex items-center justify-center rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-purple-600 bg-white"
          >
            {collapsed ? (
              <ChevronRight size={16} className="text-purple-600" />
            ) : (
              <ChevronLeft size={16} className="text-purple-600" />
            )}
          </button>
        </div>
         
       
        {!collapsed && profile && (
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 overflow-hidden rounded-full border border-zinc-200 bg-white text-center text-sm font-semibold text-zinc-600">
                {companyLogoUrl ? (
                  <img src={companyLogoUrl} alt="Company logo" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center">{companyInitial}</span>
                )}
              </div>
              <p className="text-sm font-semibold text-zinc-900">{companyLabel}</p>
            </div>
          <p className="text-base font-bold text-purple-600">
            {buildDisplayName(profile ?? undefined)}
          </p>
          {positionLabel ? (
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.3em]">{positionLabel}</p>
          ) : null}
        </div>
      )}
        
        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-purple-500 pt-4">
          Member
          {!collapsed && <span> controls</span>}
        </p>
      </div>            
      <nav className="flex-1 space-y-0 text-sm font-semibold">
        {navItems.map((item) => {
          const safeHref = item.href?.trim();
          if (!safeHref) {
            return null;
          }
          const isActive = checkActive(safeHref, item.exact);
          const Icon = item.icon;
          return (
            <Link
              key={safeHref}
              href={safeHref}
              className={`flex items-center gap-3 rounded-2xl px-2 py-3 transition ${
                collapsed ? 'justify-center' : ''
              } ${
                isActive
                  ? 'bg-purple-50 text-purple-700'
                  : 'text-zinc-700 hover:bg-purple-50 hover:text-purple-700'
              }`}
            >
              <Icon size={18} className="text-purple-600" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
        {isAdmin && (
          <div className={`space-y-1 pt-4 ${collapsed ? 'items-center' : ''}`}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-purple-500 pb-2">Admin   {!collapsed && (<span>controls</span> )}</p>
            <Link
              href="/dashboard/admin/users"
              className={`flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-purple-50 hover:text-purple-700 ${
                collapsed ? 'justify-center' : ''
              } text-zinc-700`}
            >
              <Users size={18} className="text-purple-600" />
              {!collapsed && <span>Users</span>}
            </Link>
          </div>
        )}
        {role === 'OWNER' && (
          <div className={`space-y-1 pt-5 ${collapsed ? 'items-center' : ''}`}>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-purple-500">Owner   {!collapsed && (<span>controls</span> )}</p>
            <Link
              href="/dashboard/settings"
              className={`flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-purple-50 hover:text-purple-700 ${
                collapsed ? 'justify-center' : ''
              } text-zinc-700`}
            >
              <Settings size={18} className="text-purple-600" />
              {!collapsed && <span>Settings</span>}
            </Link>
            <Link
              href="/owner/team"
              className={`flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-purple-50 hover:text-purple-700 ${
                collapsed ? 'justify-center' : ''
              } text-zinc-700`}
            >
              <Users size={18} className="text-purple-600" />
              {!collapsed && <span>Team</span>}
            </Link>
          </div>
        )}
      </nav>
    </aside>
  );
}
