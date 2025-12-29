import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { buildComplianceReport, resolveSince } from '@/lib/compliance-report';
import { OverallPieChartClient } from '@/components/compliance/OverallPieChartClient';
import { PositionBarChartClient } from '@/components/compliance/PositionBarChartClient';


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
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
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
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-6">
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

        <section className="rounded-3xl border border-zinc-200 bg-white px-5 py-5 shadow-sm">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Overall Compliancy </p>
              <p className="text-lg font-semibold text-zinc-900">
                {overall.acknowledged} of {overall.total} acknowledged
              </p>
            </div>
            <OverallPieChartClient acknowledged={overall.acknowledged} total={overall.total} />
          </div>
        </section>

        

        {report && report.byPosition.length > 0 && (
          <section className="rounded-3xl border border-zinc-200 bg-white px-5 py-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">By position</p>
            <div className="mt-3 space-y-3">
              {report.byPosition
                .map((entry) => ({
                  ...entry,
                  percentage: entry.total ? Math.round((entry.acknowledged / entry.total) * 100) : 0,
                }))
                .sort((a, b) => a.percentage - b.percentage)
                .map((entry) => (
                  <div key={entry.position} className="rounded-2xl border border-zinc-100 bg-white/80 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">{entry.position}</p>
                      <p className="text-xs font-semibold text-zinc-600">
                        {entry.acknowledged}/{entry.total} acknowledged
                      </p>
                    </div>
                    <div className="mt-2 flex h-2 w-full rounded-full bg-zinc-100">
                      <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${entry.percentage}%` }} />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{entry.percentage}%</p>
                  </div>
                ))}
            </div>
          </section>
        )}
        {report && report.perResource.length > 0 && (
          <section className="rounded-3xl border border-zinc-200 bg-white px-5 py-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Per resource</p>
            <div className="mt-3 space-y-3">
              {report.perResource
                .map((entry) => ({
                  ...entry,
                  percentage: entry.total ? Math.round((entry.acknowledged / entry.total) * 100) : 0,
                }))
                .sort((a, b) => a.percentage - b.percentage)
                .map((entry) => (
                  <div key={entry.resourceId} className="rounded-2xl border border-zinc-100 bg-white/80 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-zinc-900">{entry.title}</p>
                      <p className="text-xs font-semibold text-zinc-600">
                        {entry.acknowledged}/{entry.total} acknowledged
                      </p>
                    </div>
                    <div className="mt-2 flex h-2 w-full rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{ width: `${entry.percentage}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-zinc-500">{entry.percentage}%</p>
                  </div>
                ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
