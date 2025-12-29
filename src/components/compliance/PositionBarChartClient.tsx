'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

type PositionBarChartProps = {
  data: {
    position: string;
    acknowledged: number;
    total: number;
    percentage: number;
  }[];
};

export function PositionBarChartClient({ data }: PositionBarChartProps) {
  const tooltipFormatter = (value: number, name: string, entry: any) => {
    if (!entry?.payload) return '';
    const { acknowledged, total } = entry.payload;
    return [`${acknowledged}/${total}`, 'Acknowledged'];
  };

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
          <XAxis dataKey="position" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip formatter={tooltipFormatter} />
          <Bar dataKey="percentage" fill="#16a34a" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
