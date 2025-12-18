'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { MonthlyRow, ReportingFilters, ReportingSummary } from '@/lib/reporting';

const MONTHS = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));

const formatMonthLabel = (value: Date | string) => {
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
};

const TabItems = [
  { id: 'total', label: 'Total' },
  { id: 'one-time', label: 'One-Time' },
  { id: 'recurring', label: 'Recurring' },
] as const;

type TabId = (typeof TabItems)[number]['id'];

type ReportingDashboardProps = {
  initialSummary: ReportingSummary;
  initialFilters: ReportingFilters;
  statusOptions: string[];
  planTier: string;
};

export default function ReportingDashboard({
  initialSummary,
  initialFilters,
  statusOptions,
  planTier,
}: ReportingDashboardProps) {
  const [filters, setFilters] = useState<ReportingFilters>(initialFilters);
  const [summary, setSummary] = useState(initialSummary);
  const [options, setOptions] = useState(statusOptions);
  const [activeTab, setActiveTab] = useState<TabId>('total');
  const [isLoading, setIsLoading] = useState(false);
  const period = filters.period || 'monthly';
  const [isPending, startTransition] = useTransition();

  const statusOptionsList = useMemo(() => options.filter(Boolean), [options]);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          year: String(filters.year),
          month: String(filters.month),
          status: filters.status ?? 'ALL',
          period: filters.period || 'monthly',
        });
        const response = await fetch(`/api/reporting/summary?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        if (!active) return;
        startTransition(() => {
          setSummary(data.summary);
          if (Array.isArray(data.statusOptions)) {
            setOptions(data.statusOptions);
          }
        });
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    load().catch(() => {
      if (active) setIsLoading(false);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [filters, startTransition]);

  const tableRows = useMemo(() => {
    if (activeTab === 'recurring') {
      return summary.tables.recurring;
    }
    if (activeTab === 'one-time') {
      return summary.tables.oneTime;
    }
    return summary.tables.total;
  }, [activeTab, summary.tables]);

  const showUpgradeBanner = planTier === 'FREE' && summary.total.amount > 0;

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="space-y-6">
      {showUpgradeBanner && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/80 p-4 text-sm text-purple-900 shadow-sm">
          <p className="font-semibold text-purple-900">Upgrade Now</p>
          <p className="text-sm text-purple-800">
            You already have revenue this month; unlock automatic bank syncing, + integrations, and more for $19/mo.
          </p>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex flex-col text-xs uppercase tracking-[0.3em] text-zinc-500">
            Period
            <select
              value={period}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, period: event.target.value as 'monthly' | 'yearly' }))
              }
              className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm focus:border-purple-400"
            >
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </label>
          {period === 'monthly' && (
            <label className="flex flex-col text-xs uppercase tracking-[0.3em] text-zinc-500">
              Month
              <select
                value={filters.month}
                onChange={(event) =>
                  setFilters((prev) => ({ ...prev, month: Number(event.target.value) }))
                }
                className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm focus:border-purple-400"
              >
                {MONTHS.map((entry) => (
                  <option key={entry.value} value={entry.value}>
                    {entry.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="flex flex-col text-xs uppercase tracking-[0.3em] text-zinc-500">
            Year
            <select
              value={filters.year}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, year: Number(event.target.value) }))
              }
              className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm focus:border-purple-400"
            >
              {yearOptions.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs uppercase tracking-[0.3em] text-zinc-500">
            Status
            <select
              value={filters.status ?? 'ALL'}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, status: event.target.value }))
              }
              className="mt-1 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm focus:border-purple-400"
            >
              {statusOptionsList.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <div className="ml-auto flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            {isLoading || isPending ? (
              <span>Updating...</span>
            ) : (
              <span>Filters synced</span>
            )}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-2 rounded-2xl border border-zinc-200 bg-white/90 p-1 shadow-sm">
          {TabItems.map((tab) => {
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] transition ${
                  selected
                    ? 'bg-purple-600 text-white shadow-lg'
                    : 'bg-white text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeTab === 'recurring' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white shadow-2xl lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-100">
                Recurring Revenue (MRR)
              </p>
              <p className="mt-3 text-5xl font-bold">{formatCurrency(summary.recurring.currentAmount)}/mo</p>
              <p className="text-sm text-purple-100">
                {summary.recurring.changePercent >= 0 ? '+' : ''}
                {summary.recurring.changePercent}% from last month
              </p>
            </div>
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600">Active</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.recurring.activeCount}</p>
              </div>
              <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600">Pending</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.recurring.pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600">Paused</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.recurring.pausedCount}</p>
            </div>
            <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600">Cancelled</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.recurring.cancelledCount}</p>
            </div>
            <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600">Potential MRR</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{formatCurrency(summary.recurring.potentialMRR)}/mo</p>
            </div>
          </div>
          <RevenueTable rows={tableRows} />
        </div>
      )}

      {activeTab === 'one-time' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="rounded-2xl bg-gradient-to-r from-zinc-900 to-purple-900 p-8 text-white shadow-2xl lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
                One-Time Revenue {period === 'yearly' ? 'This Year' : 'This Month'}
              </p>
              <p className="mt-3 text-5xl font-bold">{formatCurrency(summary.oneTime.totalAmount)}</p>
              <p className="text-sm text-indigo-200">earned this {period === 'yearly' ? 'year' : 'period'}</p>
            </div>
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600">Paid Invoices</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.oneTime.paidCount}</p>
              </div>
              <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600">On Time Rate</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.oneTime.onTimePercentage}%</p>
              </div>
            </div>
          </div>
          <RevenueTable rows={tableRows} />
        </div>
      )}

      {activeTab === 'total' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="rounded-2xl bg-gradient-to-r from-zinc-900 to-purple-900 p-8 text-white shadow-2xl lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-indigo-200">
                Total Revenue {period === 'yearly' ? 'This Year' : 'This Month'}
              </p>
              <p className="mt-3 text-5xl font-bold">{formatCurrency(summary.total.amount)}</p>
              <p className="text-sm text-indigo-200">↑ {summary.total.changePercent}% vs last {period === 'yearly' ? 'year' : 'month'}</p>
            </div>
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600">
                  Active Subscriptions
                </p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.total.activeSubscriptions}</p>
              </div>
              <div className="rounded-2xl border border-purple-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-purple-600">
                  One-Time Invoices
                </p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.total.oneTimeInvoices}</p>
              </div>
            </div>
          </div>
          <RevenueTable rows={tableRows} />
        </div>
      )}
    </div>
  );
}

function RevenueTable({ rows }: { rows: MonthlyRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-purple-200 bg-white/80 p-8 text-center shadow-sm">
        <p className="text-lg font-semibold text-gray-900">No invoices found for these filters</p>
        <p className="mt-2 text-sm text-zinc-500">
          Adjust the month, year, or status above to populate the table.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-zinc-200">
          <thead className="bg-zinc-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Period
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Recurring
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                One-Time
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {rows.map((row) => {
              const monthValue = typeof row.month === 'string' ? new Date(row.month) : row.month;
              const key =
                monthValue instanceof Date && !Number.isNaN(monthValue.getTime())
                  ? monthValue.toISOString()
                  : `${row.invoices}-${row.total}`;
              return (
                <tr key={key}>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    {formatMonthLabel(row.month)}
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700">
                    <div className="font-medium">{formatCurrency(row.recurringTotal || 0)}</div>
                    <div className="text-xs text-gray-500">{(row.recurringInvoices || 0).toLocaleString()} invoices</div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm text-gray-700">
                    <div className="font-medium">{formatCurrency(row.oneTimeTotal || 0)}</div>
                    <div className="text-xs text-gray-500">{(row.oneTimeInvoices || 0).toLocaleString()} invoices</div>
                  </td>
                  <td className="px-6 py-4 text-right text-sm font-semibold text-green-600">
                    {formatCurrency(row.total)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
