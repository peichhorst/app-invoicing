'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
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

const PIE_COLORS = [
  '#84cc16',
  '#22d3ee',
  '#f97316',
  '#a855f7',
  '#fb7185',
  '#38bdf8',
  '#facc15',
  '#4ade80',
  '#f472b6',
  '#f59e0b',
  '#8b5cf6',
  '#0ea5e9',
];

const baseTabs = [
  { id: 'total', label: 'Total' },
  { id: 'one-time', label: 'One-Time' },
  { id: 'recurring', label: 'Recurring' },
  { id: 'clients', label: 'By Client' },
] as const;

type TabId = 'total' | 'one-time' | 'recurring' | 'team' | 'users' | 'clients';

type ReportingDashboardProps = {
  initialSummary: ReportingSummary;
  initialTeamSummary?: ReportingSummary | null;
  initialFilters: ReportingFilters;
  statusOptions: string[];
  planTier: string;
  canSeeTeam?: boolean;
  forceTeamOnly?: boolean;
  availableYears?: number[];
};

export default function ReportingDashboard({
  initialSummary,
  initialTeamSummary = null,
  initialFilters,
  statusOptions,
  planTier,
  canSeeTeam = false,
  forceTeamOnly = false,
  availableYears,
}: ReportingDashboardProps) {
  const [filters, setFilters] = useState<ReportingFilters>(initialFilters);
  const [summary, setSummary] = useState(initialSummary);
  const [teamSummary, setTeamSummary] = useState<ReportingSummary | null>(initialTeamSummary);
  const [teamByUser, setTeamByUser] = useState<{ userId: string; name?: string | null; email?: string | null; total: number }[] | null>(null);
  const [clientTotals, setClientTotals] = useState<{ clientId: string; name?: string | null; contactName?: string | null; total: number }[] | null>(null);
  const [teamByClient, setTeamByClient] = useState<{ clientId: string; name?: string | null; contactName?: string | null; total: number }[] | null>(null);
  const [options, setOptions] = useState(statusOptions);
  const [activeTab, setActiveTab] = useState<TabId>(() => (forceTeamOnly ? 'users' : 'total'));
  const [byUserChart, setByUserChart] = useState<'pie' | 'bar'>('pie');
  const [isTeamLoading, setIsTeamLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [teamApiResponse, setTeamApiResponse] = useState<any>(null);
  const period = filters.period || 'monthly';
  const [, startTransition] = useTransition();

  const statusOptionsList = useMemo(() => options.filter(Boolean), [options]);
  const tabItems: { id: TabId; label: string }[] = useMemo(() => {
    if (forceTeamOnly) return [{ id: 'users', label: 'By Team Member' }];
    return canSeeTeam ? [...baseTabs, { id: 'users', label: 'By Team Member' }] : [...baseTabs];
  }, [canSeeTeam, forceTeamOnly]);

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
          includeCompany: 'true',
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
    const interval = setInterval(() => {
      load().catch(() => {});
    }, 10000); // Poll every 10 seconds
    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
    };
  }, [filters, startTransition, forceTeamOnly]);

  useEffect(() => {
    if (!canSeeTeam || (activeTab !== 'team' && activeTab !== 'users' && activeTab !== 'clients')) return;
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      setIsTeamLoading(true);
      try {
        const params = new URLSearchParams({
          year: String(filters.year),
          month: String(filters.month),
          status: filters.status ?? 'ALL',
          period: filters.period || 'monthly',
          // Always include company for team reporting
          includeCompany: 'true',
          byUser: activeTab === 'users' ? 'true' : 'false',
          byClient: activeTab === 'clients' ? 'true' : 'false',
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
        setTeamApiResponse(data); // <-- Save full API response for debug
        startTransition(() => {
          setTeamSummary(data.summary);
          if (Array.isArray(data.byUser)) {
            setTeamByUser(data.byUser);
          }
          if (Array.isArray(data.byClient)) {
            setTeamByClient(data.byClient);
          }
        });
      } finally {
        if (active) {
          setIsTeamLoading(false);
        }
      }
    };
    load().catch(() => {
      if (active) setIsTeamLoading(false);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [activeTab, canSeeTeam, filters, startTransition]);

  useEffect(() => {
    if (forceTeamOnly) return;
    if (activeTab !== 'clients') return;
    let active = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        const params = new URLSearchParams({
          year: String(filters.year),
          month: String(filters.month),
          status: filters.status ?? 'ALL',
          period: filters.period || 'monthly',
          includeCompany: 'true',
          byClient: 'true',
        });
        const response = await fetch(`/api/reporting/summary?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!active) return;
        startTransition(() => {
          if (Array.isArray(data.byClient)) {
            setClientTotals(data.byClient);
          }
        });
      } catch {
        // ignore
      }
    };
    load().catch(() => {});
    return () => {
      active = false;
      controller.abort();
    };
  }, [activeTab, filters, startTransition, forceTeamOnly]);

  const currentSummary =
    activeTab === 'team' || activeTab === 'users' || activeTab === 'clients'
      ? teamSummary ?? summary
      : summary;

  const tableRows = useMemo(() => {
    if (activeTab === 'recurring') {
      return currentSummary.tables.recurring;
    }
    if (activeTab === 'one-time') {
      return currentSummary.tables.oneTime;
    }
    if (activeTab === 'team' || activeTab === 'users' || activeTab === 'clients') {
      return currentSummary.tables.total;
    }
    return currentSummary.tables.total;
  }, [activeTab, currentSummary.tables]);

  const currentYear = new Date().getFullYear();
  const yearOptions = availableYears ?? [currentYear, currentYear - 1, currentYear - 2];

  return (
    <div className="space-y-6" data-plan-tier={planTier}>
    
      <div className="rounded-2xl border border-zinc-200 bg-white/80 p-4 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col text-xs uppercase tracking-[0.3em] text-zinc-500">
            Period
            <select
              value={period}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, period: event.target.value as 'monthly' | 'yearly' }))
              }
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm focus:border-brand-primary-400"
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
                className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm focus:border-brand-primary-400"
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
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm focus:border-brand-primary-400"
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
              className="mt-1 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-900 shadow-sm focus:border-brand-primary-400"
            >
              {statusOptionsList.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="grid gap-3 text-xs font-semibold uppercase tracking-[0.3em]" style={{gridTemplateColumns: `repeat(${tabItems.length}, minmax(0, 1fr))`}}>
          {tabItems.map((tab) => {
            const selected = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-xl border-2 px-6 py-4 text-center transition ${
                  selected
                    ? 'border-brand-primary-600 bg-brand-primary-600 text-white shadow-lg'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:border-brand-primary-300 hover:bg-brand-primary-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>


      {/* Yearly breakdown chart only in main reporting section (Total tab) */}
      {period === 'yearly' && activeTab === 'total' && (
        <YearlyBreakdownChart summary={summary} year={filters.year} isLoading={isLoading} />
      )}


      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">By Team Member</p>
                <p className="text-sm text-zinc-600">Team revenue broken down by member</p>
              </div>
              {isTeamLoading && <p className="text-xs text-zinc-500">Loading...</p>}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-zinc-200">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">User</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {(teamByUser ?? []).map((entry) => (
                      <tr key={entry.userId}>
                        <td className="px-4 py-3 text-sm font-semibold text-zinc-900">
                          {entry.name?.trim() || entry.email || 'User'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-900">
                          {formatCurrency(entry.total)}
                        </td>
                      </tr>
                    ))}
                    {(!teamByUser || teamByUser.length === 0) && !isTeamLoading && !forceTeamOnly && (
                      <tr>
                        <td colSpan={2} className="px-4 py-4 text-center text-sm text-zinc-500">
                          No data yet for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Distribution</p>
                  <div className="flex gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold text-zinc-700">
                    <button
                      type="button"
                      onClick={() => setByUserChart('pie')}
                      className={`rounded-full px-3 py-1 transition ${byUserChart === 'pie' ? 'bg-white shadow-sm' : 'hover:bg-white/60'}`}
                    >
                      Pie
                    </button>
                    <button
                      type="button"
                      onClick={() => setByUserChart('bar')}
                      className={`rounded-full px-3 py-1 transition ${byUserChart === 'bar' ? 'bg-white shadow-sm' : 'hover:bg-white/60'}`}
                    >
                      Bar
                    </button>
                  </div>
                </div>
                {teamByUser && teamByUser.length > 0 ? (
                  (() => {
                    const totalSum = teamByUser.reduce((sum, row) => sum + row.total, 0) || 1;
                    const colors = ['#2563eb', '#a855f7', '#22c55e', '#ef4444', '#f97316', '#14b8a6', '#8b5cf6', '#0ea5e9'];

                    if (byUserChart === 'bar') {
                      const max = Math.max(...teamByUser.map((row) => row.total), 1);
                      return (
                        <div className="space-y-3">
                          {teamByUser.map((row, idx) => {
                            const color = colors[idx % colors.length];
                            const pct = ((row.total / totalSum) * 100).toFixed(1);
                            const width = `${Math.max(4, (row.total / max) * 100)}%`;
                            return (
                              <div key={row.userId} className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-zinc-700">
                                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                                  <span className="flex-1 truncate">{row.name?.trim() || row.email || 'User'}</span>
                                  <span className="font-semibold text-zinc-900">{pct}%</span>
                                  <span className="ml-2 text-xs text-zinc-500">{formatCurrency(row.total)}</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-zinc-100">
                                  <div className="h-2 rounded-full" style={{ width, backgroundColor: color }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    let acc = 0;
                    const stops = teamByUser.map((row, idx) => {
                      const pct = (row.total / totalSum) * 100;
                      const start = acc;
                      const end = acc + pct;
                      acc = end;
                      const color = colors[idx % colors.length];
                      return `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
                    });
                    const gradient = `conic-gradient(${stops.join(',')})`;
                    return (
                      <div className="flex flex-col gap-3">
                        <div
                          className="mx-auto h-40 w-40 rounded-full border border-zinc-200 shadow-inner"
                          style={{ backgroundImage: gradient }}
                        />
                        <div className="space-y-2">
                          {teamByUser.map((row, idx) => {
                            const color = colors[idx % colors.length];
                            const pct = ((row.total / totalSum) * 100).toFixed(1);
                            return (
                              <div key={row.userId} className="flex items-center gap-2 text-sm text-zinc-700">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                                <span className="flex-1 truncate">{row.name?.trim() || row.email || 'User'}</span>
                                <span className="font-semibold text-zinc-900">{pct}%</span>
                                <span className="ml-2 text-xs text-zinc-500">{formatCurrency(row.total)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-sm text-zinc-500">No data yet for this period.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'clients' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">By Client</p>
                <p className="text-sm text-zinc-600">Revenue broken down by client</p>
              </div>
              {isTeamLoading && <p className="text-xs text-zinc-500">Loading...</p>}
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="overflow-hidden rounded-xl border border-zinc-200">
                <table className="min-w-full divide-y divide-zinc-200">
                  <thead className="bg-zinc-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Client</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {(forceTeamOnly ? teamByClient : clientTotals) && (forceTeamOnly ? teamByClient : clientTotals)!.map((entry) => (
                      <tr key={entry.clientId}>
                        <td className="px-4 py-3 text-sm font-semibold text-zinc-900">
                          {entry.name?.trim() || entry.contactName || 'Client'}
                        </td>
                        <td className="px-4 py-3 text-right text-sm font-semibold text-zinc-900">
                          {formatCurrency(entry.total)}
                        </td>
                      </tr>
                    ))}
                    {((forceTeamOnly ? teamByClient : clientTotals)?.length ?? 0) === 0 && !isTeamLoading && (
                      <tr>
                        <td colSpan={2} className="px-4 py-4 text-center text-sm text-zinc-500">
                          No data yet for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Distribution</p>
                  <div className="flex gap-1 rounded-full border border-zinc-200 bg-zinc-50 p-1 text-xs font-semibold text-zinc-700">
                    <button
                      type="button"
                      onClick={() => setByUserChart('pie')}
                      className={`rounded-full px-3 py-1 transition ${byUserChart === 'pie' ? 'bg-white shadow-sm' : 'hover:bg-white/60'}`}
                    >
                      Pie
                    </button>
                    <button
                      type="button"
                      onClick={() => setByUserChart('bar')}
                      className={`rounded-full px-3 py-1 transition ${byUserChart === 'bar' ? 'bg-white shadow-sm' : 'hover:bg-white/60'}`}
                    >
                      Bar
                    </button>
                  </div>
                </div>
                {((forceTeamOnly ? teamByClient : clientTotals)?.length ?? 0) > 0 ? (
                  (() => {
                    const data = (forceTeamOnly ? teamByClient : clientTotals) || [];
                    const totalSum = data.reduce((sum, row) => sum + row.total, 0) || 1;
                    const colors = ['#2563eb', '#a855f7', '#22c55e', '#ef4444', '#f97316', '#14b8a6', '#8b5cf6', '#0ea5e9'];

                    if (byUserChart === 'bar') {
                      const max = Math.max(...data.map((row) => row.total), 1);
                      return (
                        <div className="space-y-3">
                          {data.map((row, idx) => {
                            const color = colors[idx % colors.length];
                            const pct = ((row.total / totalSum) * 100).toFixed(1);
                            const width = `${Math.max(4, (row.total / max) * 100)}%`;
                            return (
                              <div key={row.clientId} className="space-y-1">
                                <div className="flex items-center gap-2 text-sm text-zinc-700">
                                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                                  <span className="flex-1 truncate">{row.name?.trim() || row.contactName || 'Client'}</span>
                                  <span className="font-semibold text-zinc-900">{pct}%</span>
                                </div>
                                <div className="h-2 w-full rounded-full bg-zinc-100">
                                  <div className="h-2 rounded-full" style={{ width, backgroundColor: color }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    }

                    let acc = 0;
                    const stops = data.map((row, idx) => {
                      const pct = (row.total / totalSum) * 100;
                      const start = acc;
                      const end = acc + pct;
                      acc = end;
                      const color = colors[idx % colors.length];
                      return `${color} ${start.toFixed(2)}% ${end.toFixed(2)}%`;
                    });
                    const gradient = `conic-gradient(${stops.join(',')})`;
                    return (
                      <div className="flex flex-col gap-3">
                        <div
                          className="mx-auto h-40 w-40 rounded-full border border-zinc-200 shadow-inner"
                          style={{ backgroundImage: gradient }}
                        />
                        <div className="space-y-2">
                          {data.map((row, idx) => {
                            const color = colors[idx % colors.length];
                            const pct = ((row.total / totalSum) * 100).toFixed(1);
                            return (
                              <div key={row.clientId} className="flex items-center gap-2 text-sm text-zinc-700">
                                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
                                <span className="flex-1 truncate">{row.name?.trim() || row.contactName || 'Client'}</span>
                                <span className="font-semibold text-zinc-900">{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-sm text-zinc-500">No data yet for this period.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'recurring' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="rounded-2xl bg-gradient-to-br from-brand-primary-700 via-brand-secondary-700 to-brand-accent-700 p-8 shadow-2xl lg:col-span-3 text-[var(--color-brand-contrast)]">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-brand-contrast)]/80">
                Recurring Revenue (MRR)
              </p>
              <p className="mt-3 text-5xl font-bold text-[var(--color-brand-contrast)]">
                {formatCurrency(summary.recurring.currentAmount)}/mo
              </p>
              <p className="text-sm text-[var(--color-brand-contrast)]/80">
                {summary.recurring.changePercent >= 0 ? '+' : ''}
                {summary.recurring.changePercent}% from last month
              </p>
            </div>
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Active</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.recurring.activeCount}</p>
              </div>
              <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Pending</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.recurring.pendingCount}</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Paused</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.recurring.pausedCount}</p>
            </div>
            <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Cancelled</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.recurring.cancelledCount}</p>
            </div>
            <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Potential MRR</p>
              <p className="mt-2 text-3xl font-bold text-zinc-900">{formatCurrency(summary.recurring.potentialMRR)}/mo</p>
            </div>
          </div>
          <RevenueTable rows={tableRows} />
        </div>
      )}

      {activeTab === 'one-time' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
            <div className="rounded-2xl bg-gradient-to-br from-brand-primary-700 via-brand-secondary-700 to-brand-accent-700 p-8 text-white shadow-2xl lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-secondary-200">
                One-Time Revenue {period === 'yearly' ? filters.year : 'This Month'}
              </p>
              <p className="mt-3 text-5xl font-bold">{formatCurrency(summary.oneTime.totalAmount)}</p>
              <p className="text-sm text-brand-secondary-200">earned this {period === 'yearly' ? 'year' : 'period'}</p>
            </div>
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Paid Invoices</p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.oneTime.paidCount}</p>
              </div>
              <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">On Time Rate</p>
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
            <div className="rounded-2xl bg-gradient-to-br from-brand-primary-700 via-brand-secondary-700 to-brand-accent-700 p-8 text-white shadow-2xl lg:col-span-3">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-secondary-200">
                Total Revenue {period === 'yearly' ? filters.year : 'This Month'}
              </p>
              <p className="mt-3 text-5xl font-bold">{formatCurrency(summary.total.amount)}</p>
              <p className="text-sm text-brand-secondary-200">↑ {summary.total.changePercent}% vs last {period === 'yearly' ? 'year' : 'month'}</p>
            </div>
            <div className="space-y-4 lg:col-span-2">
              <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">
                  Active Subscriptions
                </p>
                <p className="mt-2 text-3xl font-bold text-zinc-900">{summary.total.activeSubscriptions}</p>
              </div>
              <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">
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
      <div className="rounded-2xl border border-dashed border-brand-primary-200 bg-white/80 p-8 text-center shadow-sm">
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

function YearlyBreakdownChart({ summary, year, isLoading }: { summary: ReportingSummary; year: number; isLoading: boolean }) {
  const monthlyTotals = useMemo(() => {
    const map = new Map<number, number>();
    for (const row of summary.tables.total) {
      const monthValue =
        row.month instanceof Date ? row.month : typeof row.month === 'string' ? new Date(row.month) : new Date(row.month);
      if (!(monthValue instanceof Date) || Number.isNaN(monthValue.getTime())) continue;
      if (monthValue.getUTCFullYear() !== year) continue;
      const key = monthValue.getUTCMonth() + 1;
      map.set(key, (map.get(key) ?? 0) + Number(row.total ?? 0));
    }
    return map;
  }, [summary.tables.total, year]);

  const totalSum = Array.from(monthlyTotals.values()).reduce((sum, value) => sum + value, 0);

  const chartData = MONTHS.map((entry, index) => {
    const amount = monthlyTotals.get(entry.value) ?? 0;
    const percent = totalSum > 0 ? (amount / totalSum) * 100 : 0;
    return {
      ...entry,
      amount,
      percent,
      color: PIE_COLORS[index % PIE_COLORS.length],
    };
  });

  const gradient = useMemo(() => {
    if (totalSum === 0) return undefined;
    const stops: string[] = [];
    let cursor = 0;
    chartData.forEach((item) => {
      if (item.amount <= 0) return;
      const start = cursor;
      const end = cursor + item.percent;
      stops.push(`${item.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
      cursor = end;
    });
    return stops.length ? `conic-gradient(${stops.join(', ')})` : undefined;
  }, [chartData, totalSum]);

  const currentYear = new Date().getFullYear();
  const yearLabel = year === currentYear ? ` ${year}` : `Business Trends ${year}`;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white/90 p-6 shadow-sm">
      <div className="flex flex-col gap-2 pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">{yearLabel}</p>
          <p className="text-3xl font-bold text-zinc-900">{formatCurrency(totalSum)}</p>
          <p className="text-sm text-zinc-500">Revenue split for {year}</p>
        </div>
        <div className="text-right">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-400">Total for {year}</p>
          <p className="text-sm font-semibold text-zinc-900">{formatCurrency(totalSum)}</p>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr,1.2fr]">
        <div className="flex items-center justify-center">
          {totalSum === 0 ? (
            <div className="relative h-40 w-40 rounded-full border-2 border-dashed border-zinc-300 bg-zinc-50">
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs uppercase tracking-[0.3em] text-zinc-400">{year}</span>
                <span className="text-sm text-zinc-400">No data yet</span>
              </div>
            </div>
          ) : (
            <div
              className="relative h-40 w-40 rounded-full border border-zinc-200 shadow-inner"
              style={{
                backgroundImage: gradient,
                backgroundColor: gradient ? undefined : '#f5f5f5',
              }}
            >
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xs uppercase tracking-[0.3em] text-zinc-900">{year}</span>
                <span className="text-lg font-semibold text-zinc-900">{formatCurrency(totalSum)}</span>
              </div>
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {totalSum === 0 ? (
            <div className="col-span-full flex items-center justify-center text-sm text-zinc-500">
              No invoices for {year}. Create an invoice to see data.
            </div>
          ) : (
            chartData.map((item) => (
              <div key={item.value} className="flex items-start gap-3 text-sm text-zinc-700">
                <span
                  className="mt-1 h-3 w-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <div className="flex-1">
                  <p className="font-semibold text-zinc-900">{item.label}</p>
                  <p className="text-xs text-zinc-500">
                    {formatCurrency(item.amount)} · {item.percent.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
