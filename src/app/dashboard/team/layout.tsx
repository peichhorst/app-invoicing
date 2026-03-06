import { ReactNode } from 'react';
import { DashboardShell } from '@/app/dashboard/DashboardShell';
import { getCurrentUser } from '@/lib/auth';

export default async function TeamLayout({ children }: { children: ReactNode }) {
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
      {children}
    </DashboardShell>
  );
}
