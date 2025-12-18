import { getCurrentUser } from '@/lib/auth';
import { describePlan } from '@/lib/plan';
import {
  getInvoiceStatuses,
  getReportingSummary,
  ReportingFilters,
} from '@/lib/reporting';
import ReportingDashboard from './ReportingDashboard';
import Link from 'next/link';

export default async function ReportingPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="px-4 py-6 text-sm text-red-600">Unauthorized</div>;
  }

  const plan = describePlan(user);
  const companyId = user.companyId ?? user.company?.id ?? null;
  const includeCompany = (user.role === 'OWNER' || user.role === 'ADMIN') && Boolean(companyId);
  const reportingScope = { userId: user.id, companyId, includeCompany };
  const today = new Date();
  const initialFilters: ReportingFilters = {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    status: 'ALL',
    period: 'monthly',
  };

  const [initialSummary, statusOptions] = await Promise.all([
    getReportingSummary(reportingScope, initialFilters),
    getInvoiceStatuses(reportingScope),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Reporting</h1>
            <p className="text-sm text-zinc-500">
              Monthly recap of paid invoices to help you understand cashflow.
            </p>
          </div>
        </div>

        <ReportingDashboard
          initialFilters={initialFilters}
          initialSummary={initialSummary}
          statusOptions={statusOptions}
          planTier={plan.effectiveTier}
        />
      </div>
    </div>
  );
}
