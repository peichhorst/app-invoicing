import prisma from '@/lib/prisma';

export async function getPaidInvoiceCount(companyId?: string, userId?: string) {
  // Count all paid invoices for the company or user
  if (companyId) {
    return prisma.invoice.count({ where: { user: { companyId }, status: 'PAID' } });
  }
  if (userId) {
    return prisma.invoice.count({ where: { userId, status: 'PAID' } });
  }
  return prisma.invoice.count({ where: { status: 'PAID' } });
}
