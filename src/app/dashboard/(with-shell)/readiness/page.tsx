import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getReadinessSummary } from '@/lib/readiness';
import ReadinessDashboardClient from './ReadinessDashboardClient';

export const revalidate = 0;

export default async function ReadinessPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/dashboard');
  }

  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN' && user.role !== 'OWNER') {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="mb-2 text-2xl font-semibold text-gray-900">Access Restricted</h1>
          <p className="text-gray-600">Readiness reporting is available to administrators and business owners.</p>
        </div>
      </div>
    );
  }

  const summary = await getReadinessSummary();

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-primary-600">PRODUCT OPS</p>
        <h1 className="text-3xl font-semibold text-gray-900">Readiness Dashboard</h1>
        <p className="text-sm text-zinc-500">
          Auto-generated from <code>docs/TODO.md</code> and <code>docs/QA-CHECKLIST.md</code>.
        </p>
      </div>

      <ReadinessDashboardClient summary={summary} />
    </div>
  );
}
