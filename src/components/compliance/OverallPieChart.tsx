 'use client';

import { PieChart, Pie, Cell } from 'recharts';

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

  return (
    <div className="h-64 w-full overflow-hidden">
      <PieChart width={256} height={256}>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          startAngle={90}
          endAngle={-270}
          innerRadius={80}
          outerRadius={110}
          paddingAngle={2}
          dataKey="value"
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
          className="text-sm font-semibold text-zinc-700"
        >
          {percentage}%
        </text>
      </PieChart>
    </div>
  );
}
