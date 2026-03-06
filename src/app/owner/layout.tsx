import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/app/dashboard/DashboardShell';

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }

  return (
    <DashboardShell
      sidebarRole={user.role ?? null}
      sidebarProfile={{
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
      }}
    >
      {children}
    </DashboardShell>
  );
}
