import { prisma } from '@lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));

const formatMonthLabel = (date: Date) =>
  date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

export default async function ReportingPage() {
  const user = await getCurrentUser();
  if (!user) {
    return <div className="px-4 py-6 text-sm text-red-600">Unauthorized</div>;
  }

  const paidByMonth = (await prisma.$queryRaw<
    { month: Date; total: string; invoices: string }[]
  >`
    SELECT
      date_trunc('month', "issueDate") AS month,
      COUNT(*) AS invoices,
      SUM("total") AS total
    FROM "Invoice"
    WHERE "userId" = ${user.id} AND "status" = 'PAID'
    GROUP BY month
    ORDER BY month DESC
  `) ?? [];

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Reporting</h1>
            <p className="text-sm text-zinc-500">
              Monthly recap of all paid invoices to help you understand cashflow.
            </p>
          </div>
          <Link
            href="/dashboard/invoices"
            className="inline-flex items-center justify-center rounded-full border border-purple-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-700 transition hover:bg-purple-50"
          >
            View invoices
          </Link>
        </div>

        {paidByMonth.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-purple-200 bg-white/70 p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-900">No paid invoices yet</p>
            <p className="mt-2 text-sm text-gray-500">
              Once you record paid invoices, this report will show totals per month.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Month
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Paid invoices
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {paidByMonth.map((row) => (
                    <tr key={row.month.toISOString()}>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                        {formatMonthLabel(new Date(row.month))}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {Number(row.invoices).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-green-600">
                        {formatCurrency(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
