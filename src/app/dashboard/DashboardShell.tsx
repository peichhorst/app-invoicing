'use client';

import { ReactNode, useState, useEffect } from 'react';
import { Menu } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { DashboardSidebar } from './DashboardSidebar';

export function DashboardShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <div className="hidden md:block">
          <DashboardSidebar />
        </div>
        <div className="flex-1 min-w-0">
          <div className="md:hidden border-b border-zinc-200 bg-white px-4 py-3 shadow-sm">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex items-center justify-center rounded-full border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700"
            >
              <Menu size={18} className="mr-2" />
              Menu
            </button>
          </div>
          <main className="mx-auto w-full max-w-6xl px-0 py-0">{children}</main>
        </div>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-60 bg-white shadow-lg">
            <DashboardSidebar />
          </div>
        </div>
      )}
    </div>
  );
}
