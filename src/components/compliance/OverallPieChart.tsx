'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

type OverallPieChartProps = {
  acknowledged: number;
  total: number;
};

const COLORS = ['#16a34a', '#f59e0b'];

export function OverallPieChart({ acknowledged, total }: OverallPieChartProps) {
  const pending = Math.max(total - acknowledged, 0);
  const percentage = total ? Math.round((acknowledged / total) * 100) : 0;
  const data = [
    { name: 'Acknowledged', value: acknowledged },
    { name: 'Pending', value: pending },
  ];
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-72 w-full">
        <div className="relative h-40 w-40 rounded-full border-2 border-dashed border-zinc-300 bg-zinc-50">
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xs uppercase tracking-[0.3em] text-zinc-400">No data yet</span>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="relative flex items-center justify-center h-72 w-full">
      <ResponsiveContainer width={280} height={280}>
        <PieChart>
          <defs>
            <linearGradient id="complianceGreen" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#22d3ee" />
              <stop offset="100%" stopColor="#16a34a" />
            </linearGradient>
            <linearGradient id="complianceYellow" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#f59e0b" />
            </linearGradient>
          </defs>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            startAngle={90}
            endAngle={-270}
            innerRadius={90}
            outerRadius={130}
            paddingAngle={2}
            dataKey="value"
            stroke="#fff"
            strokeWidth={3}
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="text-4xl font-extrabold text-zinc-900"
          >
            {percentage}%
          </text>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
