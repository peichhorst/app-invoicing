import prisma from '@/lib/prisma';

export async function getUnpaidInvoiceCount(companyId?: string, userId?: string) {
  // Count all unpaid invoices for the company or user
  if (companyId) {
    return prisma.invoice.count({ where: { user: { companyId }, status: { not: 'PAID' } } });
  }
  if (userId) {
    return prisma.invoice.count({ where: { userId, status: { not: 'PAID' } } });
  }
  return prisma.invoice.count({ where: { status: { not: 'PAID' } } });
}
