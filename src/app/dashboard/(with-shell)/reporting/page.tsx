import { getCurrentUser } from '@/lib/auth';
import { describePlan } from '@/lib/plan';
import {
  getInvoiceStatuses,
  getReportingSummary,
  ReportingFilters,
  ReportingSummary,
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
  const canSeeTeam = (user.role === 'OWNER' || user.role === 'ADMIN') && Boolean(companyId);
  // Default personal scope (owner/admin can opt into team view separately)
  const reportingScope = { userId: user.id, companyId, includeCompany: false };
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

  let teamInitialSummary: ReportingSummary | null = null;
  if (canSeeTeam) {
    teamInitialSummary = await getReportingSummary(
      { userId: user.id, companyId, includeCompany: true },
      initialFilters,
    );
  }

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
          canSeeTeam={false}
        />

        {canSeeTeam && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Team Reporting</h2>
              <p className="text-sm text-zinc-500">Company-wide revenue across all team members.</p>
            </div>
            <ReportingDashboard
              initialFilters={initialFilters}
              initialSummary={teamInitialSummary ?? initialSummary}
              initialTeamSummary={teamInitialSummary ?? null}
              statusOptions={statusOptions}
              planTier={plan.effectiveTier}
              canSeeTeam={true}
              forceTeamOnly
            />
          </div>
        )}
      </div>
    </div>
  );
}
