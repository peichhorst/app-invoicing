'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ReadinessSummary } from '@/lib/readiness';

const HEAT_COLORS = ['#fee2e2', '#fecaca', '#fdba74', '#fde68a', '#86efac', '#4ade80'];

function getHeatColor(percent: number) {
  if (percent >= 85) return HEAT_COLORS[5];
  if (percent >= 70) return HEAT_COLORS[4];
  if (percent >= 50) return HEAT_COLORS[3];
  if (percent >= 30) return HEAT_COLORS[2];
  if (percent >= 10) return HEAT_COLORS[1];
  return HEAT_COLORS[0];
}

type Props = {
  summary: ReadinessSummary;
};

export default function ReadinessDashboardClient({ summary }: Props) {
  const heatmapData = [...summary.todoSections, ...summary.qaSections]
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 12);

  const riskByModule = summary.qaSections.map((item) => ({
    module: item.name,
    score: item.percent,
    risk: 100 - item.percent,
  }));

  const qaCoverageData = [
    { name: 'Passed', value: summary.qaTotals.completed, color: '#16a34a' },
    { name: 'Pending', value: summary.qaTotals.pending, color: '#f59e0b' },
    { name: 'Failed sign-offs', value: summary.signoffs.fail, color: '#dc2626' },
  ];

  const burndownData = summary.todoSections.map((item) => ({
    bucket: item.name,
    done: item.completed,
    open: item.pending,
  }));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Release Readiness</p>
          <p className="mt-2 text-4xl font-bold text-zinc-900">{summary.releaseReadiness}%</p>
          <p className="mt-1 text-sm text-zinc-600">{summary.releaseStage}</p>
        </div>
        <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">QA Checklist</p>
          <p className="mt-2 text-4xl font-bold text-zinc-900">{summary.qaTotals.total}</p>
          <p className="mt-1 text-sm text-zinc-600">
            {summary.qaTotals.completed} complete, {summary.qaTotals.pending} pending
          </p>
        </div>
        <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">QA Sign-offs</p>
          <p className="mt-2 text-4xl font-bold text-zinc-900">{summary.signoffs.pass + summary.signoffs.fail}</p>
          <p className="mt-1 text-sm text-zinc-600">
            {summary.signoffs.pass} pass, {summary.signoffs.fail} fail
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-brand-primary-700">Feature Completion Heatmap</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {heatmapData.map((item) => (
            <div
              key={item.name}
              className="rounded-lg border border-zinc-200 p-3"
              style={{ backgroundColor: getHeatColor(item.percent) }}
            >
              <p className="text-sm font-semibold text-zinc-900">{item.name}</p>
              <p className="text-xs text-zinc-700">
                {item.completed}/{item.total} ({item.percent}%)
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-brand-primary-700">Stability / Risk by Module</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={riskByModule} margin={{ top: 10, right: 10, left: 0, bottom: 70 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="module" interval={0} angle={-30} textAnchor="end" height={70} fontSize={12} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {riskByModule.map((item) => (
                    <Cell
                      key={item.module}
                      fill={item.score >= 80 ? '#16a34a' : item.score >= 50 ? '#f59e0b' : '#dc2626'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-brand-primary-700">QA Pass / Fail Coverage</h2>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={qaCoverageData} dataKey="value" nameKey="name" outerRadius={100} innerRadius={55}>
                  {qaCoverageData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-primary-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-brand-primary-700">Priority Burndown (Now / Next / Later)</h2>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={burndownData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="bucket" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="done" stackId="a" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="open" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
