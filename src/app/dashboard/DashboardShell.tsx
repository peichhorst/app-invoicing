'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { DashboardSidebar } from './DashboardSidebar';
import { useMobileSidebar } from '@/components/MobileSidebarContext';

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { mobileOpen, close } = useMobileSidebar();
  const hideSidebar = pathname?.startsWith('/dashboard/onboarding');

  useEffect(() => {
    close();
  }, [pathname, close]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950">
      <div className="flex min-h-screen">
        {!hideSidebar && (
          <div className="hidden md:block md:w-70">
            <DashboardSidebar />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <main className="w-full">{children}</main>
        </div>
      </div>
      {mobileOpen && !hideSidebar && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60"
            onClick={close}
          />
          <div className="absolute inset-y-0 left-0 w-60 bg-white dark:bg-zinc-900 shadow-lg">
            <div className="relative h-full">
              <button
                type="button"
                className="absolute top-5 right-1 z-40 inline-flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-brand-primary-700 dark:border-zinc-600 text-brand-primary-700 dark:text-zinc-300 shadow-sm"
                onClick={close}
              >
                <span className="sr-only">Close menu</span>
                <svg viewBox="0 0 24 24" className="h-4 w-4">
                  <path
                    d="M6 6l12 12M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <DashboardSidebar className="h-full pt-4" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
