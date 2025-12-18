import { Prisma, InvoiceStatus } from '@prisma/client';
import { prisma } from '@lib/prisma';

export type ReportingFilters = {
  year: number;
  month: number;
  status?: string;
  period?: 'monthly' | 'yearly';
};

export type MonthlyRow = {
  month: Date;
  invoices: number;
  total: number;
  recurringInvoices?: number;
  recurringTotal?: number;
  oneTimeInvoices?: number;
  oneTimeTotal?: number;
};

export type ReportingSummary = {
  recurring: {
    currentAmount: number;
    changePercent: number;
    activeCount: number;
    pendingCount: number;
    pausedCount: number;
    potentialMRR: number;
    cancelledCount: number;
  };
  oneTime: {
    totalAmount: number;
    paidCount: number;
    onTimeCount: number;
    onTimePercentage: number;
  };
  total: {
    amount: number;
    changePercent: number;
    activeSubscriptions: number;
    oneTimeInvoices: number;
  };
  tables: {
    recurring: MonthlyRow[];
    oneTime: MonthlyRow[];
    total: MonthlyRow[];
  };
};

export type ReportingScope = {
  userId: string;
  companyId?: string | null;
  includeCompany?: boolean;
};

const ensureMonth = (value?: number | null, fallback?: number) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback ?? 1;
  }
  if (value < 1) return 1;
  if (value > 12) return 12;
  return Math.floor(value);
};

const resolveReportingUserIds = async (scope: ReportingScope): Promise<string[]> => {
  if (scope.includeCompany && scope.companyId) {
    const companyUsers = await prisma.user.findMany({
      where: { companyId: scope.companyId },
      select: { id: true },
    });
    const ids = companyUsers.map((entry) => entry.id).filter(Boolean);
    if (ids.length > 0) {
      return ids;
    }
  }
  return [scope.userId];
};

export async function getInvoiceStatuses(scope: ReportingScope) {
  const userIds = await resolveReportingUserIds(scope);
  const userFilter =
    userIds.length === 1 ? { userId: userIds[0] } : { userId: { in: userIds } };
  const rawStatuses = await prisma.invoice.findMany({
    where: userFilter,
    select: { status: true },
    distinct: ['status'],
  });
  const unique = Array.from(
    new Set(
      rawStatuses
        .map((entry) => entry.status as InvoiceStatus | null)
        .filter((status): status is InvoiceStatus => Boolean(status)),
    ),
  );
  unique.sort();
  return ['ALL', ...unique];
}

const invoiceStatusSet = new Set(Object.values(InvoiceStatus));

export async function getReportingSummary(scope: ReportingScope, filters: ReportingFilters) {
  const userIds = await resolveReportingUserIds(scope);
  const now = new Date();
  const year = filters.year || now.getFullYear();
  const month = ensureMonth(filters.month, now.getMonth() + 1);
  const rawStatus = filters.status && filters.status !== 'ALL' ? filters.status : undefined;
  const statusFilter: InvoiceStatus | undefined = rawStatus && invoiceStatusSet.has(rawStatus as InvoiceStatus) ? (rawStatus as InvoiceStatus) : undefined;
  const period = filters.period || 'monthly';

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const prevMonthStart = new Date(year, month - 2, 1);
  const prevMonthEnd = new Date(year, month - 1, 1);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const prevYearStart = new Date(year - 1, 0, 1);
  const prevYearEnd = new Date(year, 0, 1);

  // Use year boundaries when period is yearly, month boundaries when monthly
  const periodStart = period === 'yearly' ? yearStart : monthStart;
  const periodEnd = period === 'yearly' ? yearEnd : monthEnd;
  const prevPeriodStart = period === 'yearly' ? prevYearStart : prevMonthStart;
  const prevPeriodEnd = period === 'yearly' ? prevYearEnd : prevMonthEnd;
  const invoiceScopeFilter: Prisma.InvoiceWhereInput =
    userIds.length === 1 ? { userId: userIds[0] } : { userId: { in: userIds } };
  const recurringScopeFilter: Prisma.RecurringInvoiceWhereInput =
    userIds.length === 1 ? { userId: userIds[0] } : { userId: { in: userIds } };

  const recurringGroups = await prisma.recurringInvoice.groupBy({
    by: ['status'],
    where: recurringScopeFilter,
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

  const recurringActiveAmount = statusSummary.ACTIVE.amount;

  const previousActiveAmount = Number(
    (
      await prisma.recurringInvoice.aggregate({
        where: {
          ...recurringScopeFilter,
          status: 'ACTIVE',
          firstPaidAt: {
            gte: prevMonthStart,
            lt: prevMonthEnd,
          },
        },
        _sum: { amount: true },
      })
    )._sum.amount ?? 0,
  );

  const recurringChangePercent =
    previousActiveAmount === 0
      ? recurringActiveAmount === 0
        ? 0
        : 100
      : Math.round(((recurringActiveAmount - previousActiveAmount) / previousActiveAmount) * 100);

  const potentialMRR =
    statusSummary.ACTIVE.amount + statusSummary.PENDING.amount + statusSummary.PAUSED.amount;

  const oneTimeInvoices = await prisma.invoice.findMany({
    where: {
      ...invoiceScopeFilter,
      recurring: false,
      issueDate: {
        gte: periodStart,
        lt: periodEnd,
      },
      status: statusFilter || 'PAID',
    },
    select: {
      total: true,
      dueDate: true,
      updatedAt: true,
    },
  });

  const oneTimeTotal = oneTimeInvoices.reduce((sum, invoice) => sum + (invoice.total ?? 0), 0);
  const oneTimeOnTime = oneTimeInvoices.filter(
    (invoice) =>
      invoice.dueDate &&
      invoice.updatedAt &&
      new Date(invoice.updatedAt) <= new Date(invoice.dueDate),
  ).length;
  const oneTimePercent = oneTimeInvoices.length === 0 ? 0 : Math.round((oneTimeOnTime / oneTimeInvoices.length) * 100);

  const totalThisPeriod = await prisma.invoice.aggregate({
    where: {
      ...invoiceScopeFilter,
      issueDate: {
        gte: periodStart,
        lt: periodEnd,
      },
      status: statusFilter || 'PAID',
    },
    _sum: { total: true },
  });

  const totalPrevPeriod = await prisma.invoice.aggregate({
    where: {
      ...invoiceScopeFilter,
      issueDate: {
        gte: prevPeriodStart,
        lt: prevPeriodEnd,
      },
      status: statusFilter || 'PAID',
    },
    _sum: { total: true },
  });

  const totalAmount = Number(totalThisPeriod._sum.total ?? 0);
  const lastAmount = Number(totalPrevPeriod._sum.total ?? 0);
  const totalChangePercent =
    lastAmount === 0 ? (totalAmount === 0 ? 0 : 100) : Math.round(((totalAmount - lastAmount) / lastAmount) * 100);

  const userScopeCondition =
    userIds.length === 1
      ? Prisma.sql`"userId" = ${userIds[0]}`
      : Prisma.sql`"userId" IN (${Prisma.join(userIds.map((id) => Prisma.sql`${id}`))})`;

  const truncFunc = period === 'yearly' ? Prisma.sql`date_trunc('year', "issueDate")` : Prisma.sql`date_trunc('month', "issueDate")`;
  const tableStart = period === 'yearly' ? new Date(year - 4, 0, 1) : yearStart;
  const tableEnd = period === 'yearly' ? yearEnd : yearEnd;
  
  // Use statusFilter if provided, otherwise default to PAID
  const effectiveStatus = statusFilter || 'PAID';

  const monthlyRows = await prisma.$queryRaw<
    { month: Date; invoice_type: string; invoices: number; total: number }[]
  >(
    Prisma.sql`
      SELECT
        ${truncFunc} AS month,
        CASE WHEN "recurring" THEN 'subscription' ELSE 'one_time' END AS invoice_type,
        COUNT(*) AS invoices,
        SUM("total") AS total
      FROM "Invoice"
      WHERE ${userScopeCondition}
        AND "issueDate" >= ${tableStart}
        AND "issueDate" < ${tableEnd}
        AND "status" = ${effectiveStatus}
      GROUP BY month, invoice_type
      ORDER BY month DESC
    `,
  );

  const recurringMap = new Map<string, MonthlyRow>();
  const oneTimeMap = new Map<string, MonthlyRow>();
  const totalMap = new Map<string, MonthlyRow>();

  for (const row of monthlyRows) {
    const key = row.month.toISOString();
    const targetMap = row.invoice_type === 'subscription' ? recurringMap : oneTimeMap;
    const existingTarget = targetMap.get(key);
    const amount = Number(row.total ?? 0);
    const invoices = Number(row.invoices ?? 0);
    const baseRow = {
      month: new Date(row.month),
      invoices,
      total: amount,
    };
    if (existingTarget) {
      existingTarget.invoices += invoices;
      existingTarget.total += amount;
    } else {
      targetMap.set(key, baseRow);
    }

    const totalRow = totalMap.get(key);
    if (totalRow) {
      totalRow.invoices += invoices;
      totalRow.total += amount;
      // Update breakdown fields
      if (row.invoice_type === 'subscription') {
        totalRow.recurringInvoices = (totalRow.recurringInvoices || 0) + invoices;
        totalRow.recurringTotal = (totalRow.recurringTotal || 0) + amount;
      } else {
        totalRow.oneTimeInvoices = (totalRow.oneTimeInvoices || 0) + invoices;
        totalRow.oneTimeTotal = (totalRow.oneTimeTotal || 0) + amount;
      }
    } else {
      const newTotalRow: MonthlyRow = {
        ...baseRow,
        recurringInvoices: row.invoice_type === 'subscription' ? invoices : 0,
        recurringTotal: row.invoice_type === 'subscription' ? amount : 0,
        oneTimeInvoices: row.invoice_type === 'one_time' ? invoices : 0,
        oneTimeTotal: row.invoice_type === 'one_time' ? amount : 0,
      };
      totalMap.set(key, newTotalRow);
    }
  }

  const toArray = (map: Map<string, MonthlyRow>) =>
    Array.from(map.values()).sort((a, b) => b.month.getTime() - a.month.getTime());

  return {
    recurring: {
      currentAmount: recurringActiveAmount,
      changePercent: recurringChangePercent,
      activeCount: statusSummary.ACTIVE.count,
      pendingCount: statusSummary.PENDING.count,
      pausedCount: statusSummary.PAUSED.count,
      potentialMRR,
      cancelledCount: statusSummary.CANCELLED.count,
    },
    oneTime: {
      totalAmount: oneTimeTotal,
      paidCount: oneTimeInvoices.length,
      onTimeCount: oneTimeOnTime,
      onTimePercentage: oneTimePercent,
    },
    total: {
      amount: totalAmount,
      changePercent: totalChangePercent,
      activeSubscriptions: statusSummary.ACTIVE.count,
      oneTimeInvoices: oneTimeInvoices.length,
    },
    tables: {
      recurring: toArray(recurringMap),
      oneTime: toArray(oneTimeMap),
      total: toArray(totalMap),
    },
  };
}
