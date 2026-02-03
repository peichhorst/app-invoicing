import { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/app/dashboard/DashboardShell';

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }
  return <DashboardShell>{children}</DashboardShell>;
}

