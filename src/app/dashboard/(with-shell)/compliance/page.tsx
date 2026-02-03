import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { buildComplianceReport, resolveSince } from '@/lib/compliance-report';
import { OverallPieChartClient } from '@/components/compliance/OverallPieChartClient';
import { PositionBarChartClient } from '@/components/compliance/PositionBarChartClient';
import { ResourceBarChartClient } from '@/components/compliance/ResourceBarChartClient';


type ComplianceReport = {
  overall: {
    acknowledged: number;
    total: number;
    percentage: number;
  };
  perResource: {
    resourceId: string;
    title: string;
    acknowledged: number;
    total: number;
  }[];
  byPosition: {
    position: string;
    acknowledged: number;
    total: number;
    percentage: number;
  }[];
};

export const dynamic = 'force-dynamic';

export default async function CompliancePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, any>>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
const filterOptions = [
    { label: 'All time', value: 'all' },
    { label: 'Last 30 days', value: '30' },
  ];
  let overall = { acknowledged: 0, total: 0, percentage: 0 };
  let report: ComplianceReport | null = null;
  let errorMessage: string | null = null;
  const periodParam = Array.isArray(resolvedSearchParams?.period)
    ? resolvedSearchParams?.period[0]
    : resolvedSearchParams?.period;
  const period = periodParam === '30' ? '30' : 'all';
  const csvHref = `/api/compliance/export?period=${period}`;

  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      redirect('/dashboard');
    }
    if (user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
      redirect('/dashboard');
    }
    const since = resolveSince(period);
    report = await buildComplianceReport(user.companyId, since);
    overall = report?.overall ?? overall;
  } catch (error) {
    console.error('Failed to load compliance report', error);
    errorMessage = error instanceof Error ? error.message : String(error);
  }

  return (
    <main className="w-full">
      <div className="pb-16">
        <div className="mx-auto max-w-7xl space-y-6 p-6">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Compliance</p>
            <h1 className="text-3xl font-semibold text-zinc-900">Compliance report</h1>
            <p className="text-sm text-zinc-600">Monitor acknowledgments across your team.</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-zinc-200 bg-white px-4 py-3">
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <Link
                  key={option.value}
                  href={`/dashboard/compliance?period=${option.value}`}
                  className={`rounded-full border px-4 py-1 text-xs font-semibold transition ${
                    period === option.value
                      ? 'border-brand-primary-600 bg-brand-primary-600 text-white'
                      : 'border-zinc-300 bg-white text-zinc-700 hover:border-brand-primary-600 hover:text-brand-primary-600'
                  }`}
                >
                  {option.label}
                </Link>
              ))}
            </div>
            <a
              href={csvHref}
              className="rounded-full border border-brand-primary-600 bg-brand-primary-600 px-4 py-1 text-xs font-semibold text-white shadow-sm hover:bg-brand-primary-700"
            >
              Export CSV
            </a>
          </div>

          {/* Overall Compliance (full width) */}
          <section className="rounded-3xl border border-zinc-200 bg-white px-5 py-5 shadow-sm flex flex-col items-center mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500 mb-2">Overall</p>
            <h2 className="text-2xl font-bold text-zinc-900 mb-2">{overall.acknowledged} of {overall.total} acknowledged</h2>
            <p className="text-xs text-zinc-600 mb-4 text-center">Percentage of all required acknowledgments completed by your team.</p>
            <div className="w-full flex justify-center">
              <OverallPieChartClient acknowledged={overall.acknowledged} total={overall.total} />
            </div>
          </section>

          {/* By Position (full row) */}
          <div className="mt-8">
            <section className="rounded-3xl border border-zinc-200 bg-white px-5 py-5 shadow-sm flex flex-col items-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500 mb-2">By Position</p>
              <div className="w-full flex-1 flex items-center justify-center">
                {report && report.byPosition.length > 0 ? (
                  <PositionBarChartClient
                    data={report.byPosition.map((entry) => ({
                      ...entry,
                      percentage: entry.total ? Math.round((entry.acknowledged / entry.total) * 100) : 0,
                    }))}
                  />
                ) : (
                  <div className="w-full flex flex-col items-center justify-center">
                    <div className="h-80 w-full flex items-center justify-center">
                      <PositionBarChartClient data={[]} />
                    </div>
                    <p className="mt-4 text-xs text-zinc-400">No position data</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Per Resource (full row) */}
          <div className="mt-8">
            <section className="rounded-3xl border border-zinc-200 bg-white px-5 py-5 shadow-sm flex flex-col items-center">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500 mb-2">By Resource</p>
              <div className="w-full flex-1 flex items-center justify-center">
                {report && report.perResource.length > 0 ? (
                  <ResourceBarChartClient
                    data={report.perResource.map((entry) => ({
                      ...entry,
                      percentage: entry.total ? Math.round((entry.acknowledged / entry.total) * 100) : 0,
                    }))}
                  />
                ) : (
                  <div className="w-full flex flex-col items-center justify-center">
                    <div className="h-80 w-full flex items-center justify-center">
                      <ResourceBarChartClient data={[]} />
                    </div>
                    <p className="mt-4 text-xs text-zinc-400">No resource data</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
}
