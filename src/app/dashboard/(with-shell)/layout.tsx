import { ReactNode } from 'react';
import { headers } from 'next/headers';
import { DashboardShell } from '../DashboardShell';
import { getCurrentUser } from '@/lib/auth';

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

  const user = await getCurrentUser();

  return (
    <DashboardShell
      sidebarRole={user?.role ?? null}
      sidebarProfile={
        user
          ? {
              firstName: user.firstName ?? null,
              lastName: user.lastName ?? null,
              name: user.name ?? null,
              email: user.email ?? null,
              companyName: user.companyName ?? user.company?.name ?? null,
              role: user.role ?? null,
              position: user.position ?? null,
              positionCustom: user.positionCustom ?? null,
              company: user.company
                ? {
                    name: user.company.name ?? null,
                    logoUrl: user.company.logoUrl ?? null,
                  }
                : null,
            }
          : null
      }
    >
      <div className="pb-16">{children}</div>
    </DashboardShell>
  );
}
