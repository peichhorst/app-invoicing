"use client";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function PaidUnpaidPieChart({ paid, unpaid }: { paid: number; unpaid: number }) {
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600 mb-2">Paid vs Unpaid</p>
      <ResponsiveContainer width={120} height={120}>
        <PieChart>
          <Pie
            data={[{ name: 'Paid', value: paid }, { name: 'Unpaid', value: unpaid }]}
            dataKey="value"
            cx="50%"
            cy="50%"
            outerRadius={50}
            innerRadius={30}
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            <Cell key="paid" fill="#22c55e" />
            <Cell key="unpaid" fill="#ef4444" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
