"use client";
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

export default function PaidUnpaidPieChartClient({ paid, unpaid, total }: { paid: number; unpaid: number; total: number }) {
    const [chartType, setChartType] = useState<'pie' | 'bar'>('pie');
    const chartData = [
      { name: 'Paid', value: paid },
      { name: 'Unpaid', value: unpaid },
    ];
    return (
      <div className="flex flex-col justify-center h-full gap-2">
        {/* Toggle buttons above chart, no squares */}
        <div className="flex flex-row items-center gap-2 mb-2">
          <button
            className={`px-3 py-1 rounded border text-xs font-semibold transition-all duration-150
              ${chartType === 'pie'
                ? 'bg-green-500 text-white border-green-700 shadow-lg ring-2 ring-green-300'
                : 'bg-green-500 text-white border-green-700 opacity-70'}
            `}
            onClick={() => setChartType('pie')}
          >Pie</button>
          <button
            className={`px-3 py-1 rounded border text-xs font-semibold transition-all duration-150
              ${chartType === 'bar'
                ? 'bg-red-500 text-white border-red-700 shadow-lg ring-2 ring-red-300'
                : 'bg-red-500 text-white border-red-700 opacity-70'}
            `}
            onClick={() => setChartType('bar')}
          >Bar</button>
        </div>
        <div className="flex flex-row items-center gap-4">
          {/* Distribution legend on the left */}
          <div className="flex flex-col gap-2">
            {(() => {
              const total = paid + unpaid;
              const paidPct = total > 0 ? Math.round((paid / total) * 100) : 0;
              const unpaidPct = total > 0 ? Math.round((unpaid / total) * 100) : 0;
              return (
                <>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-5 h-5 rounded bg-green-500 border border-green-700"></span>
                    <span className="text-green-700 font-medium">Paid</span>
                    <span className="text-green-700 font-semibold">{paidPct}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-5 h-5 rounded bg-red-500 border border-red-700"></span>
                    <span className="text-red-700 font-medium">Unpaid</span>
                    <span className="text-red-700 font-semibold">{unpaidPct}%</span>
                  </div>
                </>
              );
            })()}
          </div>
          {/* Chart */}
          {chartType === 'pie' ? (
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie
                  data={chartData}
                  dataKey="value"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  innerRadius={40}
                  label={false}
                >
                  <Cell key="paid" fill="#22c55e" />
                  <Cell key="unpaid" fill="#ef4444" />
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <ResponsiveContainer width={320} height={220}>
              <BarChart data={chartData} margin={{ top: 30, right: 30, left: 0, bottom: 30 }}>
                <XAxis dataKey="name" tick={{ fontSize: 16 }} />
                <YAxis tick={{ fontSize: 16 }} allowDecimals={false} domain={[0, total]} />
                <Tooltip formatter={(value: number) => value.toLocaleString()} />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={60}>
                  <Cell fill="#22c55e" />
                  <Cell fill="#ef4444" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    );
}
