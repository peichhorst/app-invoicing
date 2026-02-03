import { prisma } from './prisma';

// Define Prisma-like types locally
type PrismaQueryRaw = any;

// Define InvoiceStatus enum locally since @prisma/client may not be available in mock setup
enum InvoiceStatus {
  DRAFT = 'DRAFT',
  SENT = 'SENT',
  VIEWED = 'VIEWED',
  OVERDUE = 'OVERDUE',
  PAID = 'PAID',
  CANCELLED = 'CANCELLED',
}

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
  totalInvoiceCount: number;
  paidInvoiceCount: number;
  unpaidInvoiceCount: number;
  paidInvoiceTotal: number;
  unpaidInvoiceTotal: number;
};

export type ReportingScope = {
  userId: string;
  companyId?: string | null;
  includeCompany?: boolean;
};

export type UserTotal = {
  userId: string;
  name?: string | null;
  email?: string | null;
  total: number;
};

export type ClientTotal = {
  clientId: string;
  name?: string | null;
  contactName?: string | null;
  total: number;
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
  // Get total paid invoice amount
  const paidInvoiceTotal = await prisma.invoice.aggregate({
    where: {
      ...(userIds.length === 1 ? { userId: userIds[0] } : { userId: { in: userIds } }),
      status: 'PAID',
    },
    _sum: { total: true },
  });
  // Get total unpaid invoice amount
  const unpaidInvoiceTotal = await prisma.invoice.aggregate({
    where: {
      ...(userIds.length === 1 ? { userId: userIds[0] } : { userId: { in: userIds } }),
      status: { not: 'PAID' },
    },
    _sum: { total: true },
  });
  // Get unpaid invoice count for scope (no filters)
  const unpaidInvoiceCount = await prisma.invoice.count({
    where: {
      ...(userIds.length === 1 ? { userId: userIds[0] } : { userId: { in: userIds } }),
      status: { not: 'PAID' },
    },
  });
  const totalInvoiceCount = await prisma.invoice.count({
    where: userIds.length === 1 ? { userId: userIds[0] } : { userId: { in: userIds } },
  });
  // Get paid invoice count for scope (no filters)
  const paidInvoiceCount = await prisma.invoice.count({
    where: {
      ...(userIds.length === 1 ? { userId: userIds[0] } : { userId: { in: userIds } }),
      status: 'PAID',
    },
  });
  const now = new Date();
  const year = filters.year || now.getFullYear();
  const month = ensureMonth(filters.month, now.getMonth() + 1);
  const rawStatus = filters.status && filters.status !== 'ALL' ? filters.status : undefined;
  const statusFilter: InvoiceStatus | undefined = rawStatus && invoiceStatusSet.has(rawStatus as InvoiceStatus) ? (rawStatus as InvoiceStatus) : undefined;
  const period = filters.period || 'monthly';

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const prevMonthStart = new Date(Date.UTC(year, month - 2, 1));
  const prevMonthEnd = new Date(Date.UTC(year, month - 1, 1));
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
  const prevYearStart = new Date(Date.UTC(year - 1, 0, 1));
  const prevYearEnd = new Date(Date.UTC(year, 0, 1));

  // Use year boundaries when period is yearly, month boundaries when monthly
  const periodStart = period === 'yearly' ? yearStart : monthStart;
  const periodEnd = period === 'yearly' ? yearEnd : monthEnd;
  const prevPeriodStart = period === 'yearly' ? prevYearStart : prevMonthStart;
  const prevPeriodEnd = period === 'yearly' ? prevYearEnd : prevMonthEnd;
  const invoiceScopeFilter =
    userIds.length === 1 ? { userId: userIds[0] } : { userId: { in: userIds } };
  const recurringScopeFilter =
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
      paidAt: {
        gte: periodStart,
        lt: periodEnd,
      },
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    select: {
      total: true,
      dueDate: true,
      paidAt: true,
    },
  });

  const oneTimeTotal = oneTimeInvoices.reduce((sum, invoice) => sum + (invoice.total ?? 0), 0);
  const oneTimeOnTime = oneTimeInvoices.filter(
    (invoice) =>
      invoice.dueDate &&
      invoice.paidAt &&
      new Date(invoice.paidAt) <= new Date(invoice.dueDate),
  ).length;
  const oneTimePercent = oneTimeInvoices.length === 0 ? 0 : Math.round((oneTimeOnTime / oneTimeInvoices.length) * 100);

  const totalThisPeriod = await prisma.invoice.aggregate({
    where: {
      ...invoiceScopeFilter,
      paidAt: {
        gte: periodStart,
        lt: periodEnd,
      },
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    _sum: { total: true },
  });

  const totalPrevPeriod = await prisma.invoice.aggregate({
    where: {
      ...invoiceScopeFilter,
      paidAt: {
        gte: prevPeriodStart,
        lt: prevPeriodEnd,
      },
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    _sum: { total: true },
  });

  const totalAmount = Number(totalThisPeriod._sum.total ?? 0);
  const lastAmount = Number(totalPrevPeriod._sum.total ?? 0);
  const totalChangePercent =
    lastAmount === 0 ? (totalAmount === 0 ? 0 : 100) : Math.round(((totalAmount - lastAmount) / lastAmount) * 100);

  const userScopeCondition = '';

  // Replace raw SQL query with Prisma ORM methods to avoid direct SQL dependencies
  const tableStart = period === 'yearly' ? periodStart : yearStart;
  const tableEnd = period === 'yearly' ? periodEnd : yearEnd;

  const invoiceFilter = {
    ...(userIds.length === 1 ? { userId: userIds[0] } : { userId: { in: userIds } }),
    paidAt: {
      gte: tableStart,
      lt: tableEnd,
    },
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const allInvoices = await prisma.invoice.findMany({
    where: invoiceFilter,
    select: {
      paidAt: true,
      recurring: true,
      total: true,
    },
  });

  // Process invoices manually to create monthly breakdown
  const monthlyMap = new Map<string, { month: Date; invoice_type: string; invoices: number; total: number }>();
  
  for (const invoice of allInvoices) {
    if (!invoice.paidAt) continue;
    
    const monthKey = new Date(invoice.paidAt.getFullYear(), invoice.paidAt.getMonth(), 1).toISOString();
    const invoiceType = invoice.recurring ? 'subscription' : 'one_time';
    
    if (monthlyMap.has(monthKey)) {
      const existing = monthlyMap.get(monthKey)!;
      existing.invoices += 1;
      existing.total += invoice.total ?? 0;
    } else {
      monthlyMap.set(monthKey, {
        month: new Date(invoice.paidAt.getFullYear(), invoice.paidAt.getMonth(), 1),
        invoice_type: invoiceType,
        invoices: 1,
        total: invoice.total ?? 0,
      });
    }
  }
  
  const monthlyRows = Array.from(monthlyMap.values()).sort((a, b) => b.month.getTime() - a.month.getTime());

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
    totalInvoiceCount,
    paidInvoiceCount,
    unpaidInvoiceCount,
    paidInvoiceTotal: paidInvoiceTotal._sum.total ?? 0,
    unpaidInvoiceTotal: unpaidInvoiceTotal._sum.total ?? 0,
  };
}

export async function getPerUserTotals(scope: ReportingScope, filters: ReportingFilters): Promise<UserTotal[]> {
  if (!scope.includeCompany || !scope.companyId) return [];
  const userIds = await resolveReportingUserIds(scope);
  if (!userIds.length) return [];
  const now = new Date();
  const year = filters.year || now.getFullYear();
  const month = ensureMonth(filters.month, now.getMonth() + 1);
  const rawStatus = filters.status && filters.status !== 'ALL' ? filters.status : undefined;
  const statusFilter: InvoiceStatus | undefined =
    rawStatus && invoiceStatusSet.has(rawStatus as InvoiceStatus) ? (rawStatus as InvoiceStatus) : undefined;
  const period = filters.period || 'monthly';

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const periodStart = period === 'yearly' ? yearStart : monthStart;
  const periodEnd = period === 'yearly' ? yearEnd : monthEnd;

  const rows = await prisma.invoice.groupBy({
    by: ['userId'],
    where: {
      userId: { in: userIds },
      paidAt: {
        gte: periodStart,
        lt: periodEnd,
      },
      ...(statusFilter ? { status: statusFilter } : {}),
    },
    _sum: { total: true },
  });

  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true },
  });
  const userMap = new Map(users.map((u: any) => [u.id, u]));

  return rows
    .map((row: any) => {
      const user: any = userMap.get(row.userId);
      return {
        userId: row.userId,
        name: user?.name ?? null,
        email: user?.email ?? null,
        total: Number(row._sum.total ?? 0),
      };
    })
    .sort((a, b) => b.total - a.total);
}

export async function getPerClientTotals(scope: ReportingScope, filters: ReportingFilters): Promise<ClientTotal[]> {
  const userIds = await resolveReportingUserIds(scope);
  if (!userIds.length) return [];
  const now = new Date();
  const year = filters.year || now.getFullYear();
  const month = ensureMonth(filters.month, now.getMonth() + 1);
  const rawStatus = filters.status && filters.status !== 'ALL' ? filters.status : undefined;
  const statusFilter: InvoiceStatus | undefined =
    rawStatus && invoiceStatusSet.has(rawStatus as InvoiceStatus) ? (rawStatus as InvoiceStatus) : undefined;
  const period = filters.period || 'monthly';

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year + 1, 0, 1);
  const periodStart = period === 'yearly' ? yearStart : monthStart;
  const periodEnd = period === 'yearly' ? yearEnd : monthEnd;

  const rows = await prisma.invoice.groupBy({
    by: ['clientId'],
      where: {
        userId: userIds.length === 1 ? userIds[0] : { in: userIds },
        paidAt: {
          gte: periodStart,
          lt: periodEnd,
        },
        status: statusFilter || 'PAID',
      },
    _sum: { total: true },
  });

  const clientIds = rows.map((r: any) => r.clientId).filter(Boolean) as string[];
  const clients = await prisma.client.findMany({
    where: { id: { in: clientIds } },
    select: { id: true, companyName: true, contactName: true },
  });
  const clientMap = new Map(clients.map((c: any) => [c.id, c]));

  return rows
    .map((row: any, idx: number) => {
      const id = row.clientId ?? `unassigned-${idx}`;
      const client: any = row.clientId ? clientMap.get(row.clientId) : null;
      return {
        clientId: id,
        name: client?.companyName ?? (row.clientId ? null : 'Unassigned'),
        contactName: client?.contactName ?? null,
        total: Number(row._sum.total ?? 0),
      };
    })
    .sort((a, b) => b.total - a.total);
}
