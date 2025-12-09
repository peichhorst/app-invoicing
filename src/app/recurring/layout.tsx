import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { DashboardShell } from '@/app/dashboard/DashboardShell';

export default async function RecurringLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  return <DashboardShell>{children}</DashboardShell>;
}
