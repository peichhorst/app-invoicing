import prisma from '@/lib/prisma';

export async function getInvoiceTotals(companyId?: string, userId?: string) {
  // Helper to build where clause
  const baseWhere = companyId
    ? { user: { companyId } }
    : userId
    ? { userId }
    : {};

  const [total, paid, unpaid] = await Promise.all([
    prisma.invoice.aggregate({
      where: baseWhere,
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { ...baseWhere, status: 'PAID' },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { ...baseWhere, status: { not: 'PAID' } },
      _sum: { total: true },
    }),
  ]);

  return {
    total: total._sum.total ?? 0,
    paid: paid._sum.total ?? 0,
    unpaid: unpaid._sum.total ?? 0,
  };
}
