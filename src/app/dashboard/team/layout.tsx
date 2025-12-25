import { ReactNode } from 'react';
import { DashboardShell } from '@/app/dashboard/DashboardShell';

export default function TeamLayout({ children }: { children: ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
