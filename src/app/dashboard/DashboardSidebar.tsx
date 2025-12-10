'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: '🏠', exact: true },
  { label: 'Clients', href: '/dashboard/clients', icon: '👥' },
  { label: 'Invoices', href: '/dashboard/invoices', icon: '🧾' },
  { label: 'Recurring', href: '/dashboard/recurring', icon: '🔁' },
  { label: 'Reporting', href: '/dashboard/reporting', icon: '📈' },
  { label: 'Settings', href: '/dashboard/profile', icon: '⚙️' },
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

  return (
    <aside
      className={`flex flex-col gap-4 min-h-screen h-full border-r border-white/20 bg-white/90 p-4 shadow-sm transition-all duration-150 ${
        collapsed ? 'w-20' : 'w-60'
      } ${className ?? ''}`}
    >
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCollapsed((prev) => !prev)}
            className="hidden md:inline-flex items-center justify-center rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-600 bg-white"
          >
            {collapsed ? (
              <ChevronRight size={16} />
            ) : (
              <>
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">Collapse</span>
              </>
            )}
          </button>
        </div>
        {!collapsed && (
          <>
            <h2 className="mt-1 text-2xl font-bold text-zinc-900">Control center</h2>
            <p className="text-xs text-zinc-500">Your office for client management</p>
          </>
        )}
      </div>

      <nav className="flex-1 space-y-1 text-sm font-semibold">
        {navItems.map((item) => {
          const isActive = checkActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-2 py-3 transition hover:bg-purple-50 hover:text-purple-700 ${
                collapsed ? 'justify-center' : ''
              } ${isActive ? 'bg-purple-50 text-purple-700' : ''}`}
            >
              <span className="text-lg">{item.icon}</span>
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
