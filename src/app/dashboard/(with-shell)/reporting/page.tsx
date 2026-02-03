import { getCurrentUser } from '@/lib/auth';
import { describePlan } from '@/lib/plan';
import {
  getInvoiceStatuses,
  getReportingSummary,
  ReportingFilters,
  ReportingSummary,
} from '@/lib/reporting';
import ReportingDashboardClient from './ReportingDashboardClient';
import BusinessTrends from '@/components/BusinessTrends';
import Link from 'next/link';
// Pie chart client component
import PaidUnpaidPieChartClient from './PaidUnpaidPieChartClient';
import prisma from '@/lib/prisma';

export default async function ReportingPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="px-4 py-6 text-sm text-red-600">Unauthorized</div>;
  }

  // Restrict access to SUPERADMIN, ADMIN, and OWNER only
  if (user.role !== 'SUPERADMIN' && user.role !== 'ADMIN' && user.role !== 'OWNER') {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-semibold text-gray-900 mb-2">Access Restricted</h1>
          <p className="text-gray-600">Reporting is only available to administrators and business owners.</p>
        </div>
      </div>
    );
  }

  const plan = describePlan(user);
  const companyId = user.companyId ?? user.company?.id ?? null;
  const canSeeTeam = (user.role === 'OWNER' || user.role === 'ADMIN') && Boolean(companyId);
  const canEditGoals = user.role === 'OWNER' || user.role === 'ADMIN';
  
  // Fetch company data with goals
  const company = companyId ? await prisma.company.findUnique({
    where: { id: companyId },
    select: {
      id: true,
      revenueGoalMonthly: true,
      revenueGoalQuarterly: true,
      revenueGoalYearly: true,
    },
  }) : null;

  // Default to company-wide scope for OWNER/ADMIN, personal for others
  const reportingScope = {
    userId: user.id,
    companyId,
    includeCompany: user.role === 'OWNER' || user.role === 'ADMIN',
  };
  const today = new Date();
  const initialFilters: ReportingFilters = {
    year: today.getFullYear(),
    month: today.getMonth() + 1,
    status: 'PAID',
    period: 'yearly',
  };

  const [initialSummary, statusOptions] = await Promise.all([
    getReportingSummary(reportingScope, initialFilters),
    getInvoiceStatuses(reportingScope),
  ]);

  // Get years that have invoices
  const invoiceYears = await prisma.invoice.findMany({
    where: canSeeTeam && companyId
      ? { user: { companyId } }
      : { userId: user.id },
    select: { createdAt: true },
  });
  
  const yearsWithData = [...new Set(
    invoiceYears.map(inv => new Date(inv.createdAt).getFullYear())
  )].sort((a, b) => b - a);

  // Always include up to ten years back from current year
  const currentYear = today.getFullYear();
  for (let i = 0; i < 10; i++) {
    const year = currentYear - i;
    if (!yearsWithData.includes(year)) {
      yearsWithData.push(year);
    }
  }
  yearsWithData.sort((a, b) => b - a);

  let teamInitialSummary: ReportingSummary | null = null;
  if (canSeeTeam) {
    teamInitialSummary = await getReportingSummary(
      { userId: user.id, companyId, includeCompany: true },
      initialFilters,
    );
  }

  // Calculate previous period revenue for comparison
  const previousYearFilters: ReportingFilters = {
    year: currentYear - 1,
    month: today.getMonth() + 1,
    status: 'ALL',
    period: 'yearly',
  };
  
  const previousYearSummary = canSeeTeam && companyId
    ? await getReportingSummary({ userId: user.id, companyId, includeCompany: true }, previousYearFilters)
    : await getReportingSummary(reportingScope, previousYearFilters);

  const currentRevenue = canSeeTeam && teamInitialSummary ? teamInitialSummary.total.amount : initialSummary.total.amount;
  const previousRevenue = previousYearSummary.total.amount;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-brand-primary-600 mb-0">FINANCIAL</p>
          <h1 className="text-3xl font-semibold text-gray-900">Reporting</h1>
          <p className="text-sm text-zinc-500">
            Measure your revenue.
          </p>
        </div>
      </div>

     


      {/* Overall Reporting Section */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-primary-700 mb-4">Overall Invoicing</h2>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_3fr] gap-0 items-start">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Total Invoices</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">
                {initialSummary.totalInvoiceCount ?? 0}
              </p>
              <p className="mt-2 text-xl font-bold text-green-600">
                Paid Invoices: {initialSummary.paidInvoiceCount ?? 0}
                <span className="block text-base font-normal text-green-700">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(initialSummary.paidInvoiceTotal ?? 0)}
                </span>
              </p>
              <p className="mt-2 text-xl font-bold text-red-600">
                Unpaid Invoices: {initialSummary.unpaidInvoiceCount ?? 0}
                <span className="block text-base font-normal text-red-700">
                  {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(initialSummary.unpaidInvoiceTotal ?? 0)}
                </span>
              </p>
              <p className="mt-2 text-base font-semibold text-zinc-700">
                Expected Total: {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(initialSummary.paidInvoiceTotal + initialSummary.unpaidInvoiceTotal)}
              </p>
            </div>
            <div>
              {initialSummary.totalInvoiceCount > 0 ? (
                <PaidUnpaidPieChartClient
                  paid={initialSummary.paidInvoiceCount ?? 0}
                  unpaid={initialSummary.unpaidInvoiceCount ?? 0}
                  total={initialSummary.totalInvoiceCount ?? 0}
                />
              ) : (
                <div className="relative h-40 w-40 rounded-full border-2 border-dashed border-zinc-300 bg-zinc-50 flex flex-col items-center justify-center text-center mt-4 mx-auto">
                  <span className="text-xs uppercase tracking-[0.3em] text-zinc-400">No data yet</span>
                  <span className="text-sm text-zinc-400">No invoices to display</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Subscriptions Section */}
      <div className="space-y-4">
        <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold text-brand-primary-700 mb-4">Recurring Payments / Subscriptions</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="text-center flex flex-col items-center justify-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Current MRR</p>
              <p className="mt-2 text-2xl font-bold text-zinc-900">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(initialSummary.recurring.currentAmount)}/mo</p>
            </div>
            <div className="text-center flex flex-col items-center justify-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Active</p>
              <p className="mt-2 text-3xl font-bold text-green-600">{initialSummary.recurring.activeCount ?? 0}</p>
            </div>
            <div className="text-center flex flex-col items-center justify-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Pending</p>
              <p className="mt-2 text-3xl font-bold text-yellow-600">{initialSummary.recurring.pendingCount ?? 0}</p>
            </div>
            <div className="text-center flex flex-col items-center justify-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Paused</p>
              <p className="mt-2 text-3xl font-bold text-blue-600">{initialSummary.recurring.pausedCount ?? 0}</p>
            </div>
            <div className="text-center flex flex-col items-center justify-center">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Cancelled</p>
              <p className="mt-2 text-3xl font-bold text-red-600">{initialSummary.recurring.cancelledCount ?? 0}</p>
            </div>
          </div>
        </div>
      </div>

 {/* Business Trends Card */}
      {canSeeTeam && company && (
        <BusinessTrends
          currentRevenue={currentRevenue}
          previousRevenue={previousRevenue}
          goal={company.revenueGoalYearly}
          period="yearly"
          periodLabel="Annual"
          companyId={company.id}
          canEdit={canEditGoals}
        />
      )}


      <ReportingDashboardClient
        initialFilters={initialFilters}
        initialSummary={initialSummary}
        statusOptions={statusOptions}
        planTier={plan.effectiveTier}
        canSeeTeam={false}
        availableYears={yearsWithData}
      />

        {canSeeTeam && (
          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold text-gray-900">Team Reporting</h2>
              <p className="text-sm text-zinc-500">Company-wide revenue across all team members.</p>
            </div>
            <ReportingDashboardClient
              initialFilters={initialFilters}
              initialSummary={teamInitialSummary ?? initialSummary}
              initialTeamSummary={teamInitialSummary ?? null}
              statusOptions={statusOptions}
              planTier={plan.effectiveTier}
              canSeeTeam={true}
              forceTeamOnly
              availableYears={yearsWithData}
            />
          </div>
        )}
    </div>
  );
}
