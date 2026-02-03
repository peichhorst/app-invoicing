import { ReactNode } from 'react';
import { headers } from 'next/headers';
import { DashboardShell } from '../DashboardShell';

export default async function DashboardWithShellLayout({ children }: { children: ReactNode }) {
  // Skip the dashboard shell (and sidebar) for onboarding routes so the page can render full-width immediately.
  const headerList = await headers();
  const getHeader = (key: string) => {
    const target: any = headerList as any;
    if (typeof target.get === 'function') return target.get(key);
    if (typeof target.getAll === 'function') {
      const all = target.getAll(key);
      return Array.isArray(all) ? all[0] : all;
    }
    const direct = target?.[key];
    return Array.isArray(direct) ? direct[0] : direct;
  };
  const pathname =
    getHeader('x-invoke-path') ||
    getHeader('x-matched-path') ||
    getHeader('x-pathname') ||
    getHeader('next-url') ||
    '';
  const isOnboarding = typeof pathname === 'string' && pathname.includes('/dashboard/onboarding');

  if (isOnboarding) {
    return <div className="pb-16">{children}</div>;
  }

  return <DashboardShell><div className="pb-16">{children}</div></DashboardShell>;
}
