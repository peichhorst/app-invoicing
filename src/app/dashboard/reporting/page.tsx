import Link from 'next/link';
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

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const paidInvoicesThisMonth = await prisma.invoice.findMany({
    where: {
      userId: user.id,
      status: 'PAID',
      issueDate: {
        gte: startOfMonth,
        lt: endOfMonth,
      },
    },
    select: {
      total: true,
      dueDate: true,
      updatedAt: true,
    },
  });

  const paidThisMonthTotal = paidInvoicesThisMonth.reduce((sum, invoice) => sum + (invoice.total ?? 0), 0);
  const paidCount = paidInvoicesThisMonth.length;
  const onTimeCount = paidInvoicesThisMonth.filter(
    (invoice) =>
      invoice.dueDate &&
      invoice.updatedAt &&
      new Date(invoice.updatedAt) <= new Date(invoice.dueDate)
  ).length;
  const onTimePercentage = paidCount === 0 ? 0 : Math.round((onTimeCount / paidCount) * 100);

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

  const recurringGroups = await prisma.recurringInvoice.groupBy({
    by: ['status'],
    where: { userId: user.id },
    _count: { status: true },
    _sum: { amount: true },
  });

  const statusSummary: Record<
    'PENDING' | 'ACTIVE' | 'PAUSED' | 'CANCELLED',
    { count: number; amount: number }
  > = {
    PENDING: { count: 0, amount: 0 },
    ACTIVE: { count: 0, amount: 0 },
    PAUSED: { count: 0, amount: 0 },
    CANCELLED: { count: 0, amount: 0 },
  };

  for (const row of recurringGroups) {
    const key = row.status as keyof typeof statusSummary;
    if (statusSummary[key]) {
      statusSummary[key] = {
        count: row._count.status,
        amount: Number(row._sum.amount ?? 0),
      };
    }
  }

  const recurringCount = statusSummary.ACTIVE.count;
  const recurringAmount = statusSummary.ACTIVE.amount;
  const pendingCount = statusSummary.PENDING.count;
  const pausedCount = statusSummary.PAUSED.count;
  const potentialMRR =
    statusSummary.ACTIVE.amount +
    statusSummary.PENDING.amount +
    statusSummary.PAUSED.amount;

  const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 1);
  const previousActiveAmount = Number(
    (
      await prisma.recurringInvoice.aggregate({
        where: {
          userId: user.id,
          status: 'ACTIVE',
          firstPaidAt: {
            gte: previousMonthStart,
            lt: previousMonthEnd,
          },
        },
        _sum: { amount: true },
      })
    )._sum.amount ?? 0
  );

  const revenueChangePercent =
    previousActiveAmount === 0
      ? recurringAmount === 0
        ? 0
        : 100
      : Math.round(((recurringAmount - previousActiveAmount) / previousActiveAmount) * 100);

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-6 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white shadow-2xl">
          <h2 className="text-2xl font-bold">Recurring revenue (MRR)</h2>
          <p className="text-sm text-purple-100">Active subscriptions only</p>
          <div className="mt-4">
            <p className="text-5xl font-bold">{formatCurrency(recurringAmount)}/mo</p>
            <p className="text-sm text-purple-100">
              {revenueChangePercent >= 0 ? '↑' : '↓'} {Math.abs(revenueChangePercent)}% from last month
            </p>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.4em] text-purple-100">Active</p>
              <p className="text-3xl font-bold">{recurringCount}</p>
              <p className="text-purple-100 text-xs mt-1">{formatCurrency(statusSummary.ACTIVE.amount)}/mo</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.4em] text-purple-100">Pending</p>
              <p className="text-3xl font-bold">{pendingCount}</p>
              <p className="text-purple-100 text-xs mt-1">Not started yet</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.4em] text-purple-100">Paused</p>
              <p className="text-3xl font-bold">{pausedCount}</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-4">
              <p className="text-xs uppercase tracking-[0.4em] text-purple-100">Potential</p>
              <p className="text-3xl font-bold">{formatCurrency(potentialMRR)}/mo</p>
            </div>
          </div>
          <div className="mt-6 text-sm text-purple-100">
            <p>Cancelled: {statusSummary.CANCELLED.count}</p>
          </div>
        </div>

        <div className="rounded-xl border border-dashed border-purple-200 bg-white/50 p-6 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-900">Your business this month</p>
          <p className="text-sm text-zinc-500">
            Monthly recap of paid invoices and cashflow to help you understand performance.
          </p>
          <div className="mt-6 grid grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold">{formatCurrency(paidThisMonthTotal)}</p>
              <p className="text-zinc-500">earned</p>
            </div>
            <div>
              <p className="text-4xl font-bold">{paidCount}</p>
              <p className="text-zinc-500">paid invoices</p>
            </div>
            <div>
              <p className="text-4xl font-bold">{onTimePercentage}%</p>
              <p className="text-zinc-500">on time</p>
            </div>
          </div>
          <div className="mt-6">
            <Link
              href="/dashboard/profile"
              className="inline-flex justify-center rounded-full border border-purple-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-purple-700 transition hover:bg-purple-50"
            >
              Upgrade Now – $19/mo
            </Link>
          </div>
        </div>

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
          <div className="rounded-2xl border border-dashed border-purple-200 bg-white/80 p-8 text-center shadow-sm">
            <p className="text-lg font-semibold text-gray-900">No paid invoices yet</p>
            <p className="mt-2 text-sm text-zinc-500">
              Once you record paid invoices, this report will show totals per month.
            </p>
            <div className="mt-6">
              <Link
                href="/dashboard/invoices/new"
                className="inline-flex items-center rounded-full border border-purple-500 bg-white px-4 py-2 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50"
              >
                + Create your first invoice
              </Link>
            </div>
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
