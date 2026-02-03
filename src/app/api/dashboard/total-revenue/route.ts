import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const companyId = searchParams.get('companyId');
  if (!companyId) {
    return NextResponse.json({ error: 'Missing companyId' }, { status: 400 });
  }
  const user = await getCurrentUser();
  if (!user || (user.companyId !== companyId && user.company?.id !== companyId)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  // Return all paid invoices and their paid date for inspection
  const companyFilter: Prisma.InvoiceWhereInput = {
    status: 'PAID',
    OR: [{ client: { companyId } }, { user: { companyId } }],
  };
  const paidInvoices = await prisma.invoice.findMany({
    where: companyFilter,
    orderBy: [
      { paidAt: 'asc' },
      { createdAt: 'asc' },
    ],
    select: { id: true, createdAt: true, paidAt: true, status: true, total: true },
  });
  // Find the earliest paidAt (or fallback to createdAt)
  let sinceDate: Date | null = null;
  for (const inv of paidInvoices) {
    if (inv.paidAt) {
      sinceDate = inv.paidAt;
      break;
    }
  }
  if (!sinceDate && paidInvoices.length > 0) {
    sinceDate = paidInvoices[0].createdAt;
  }
  // Calculate total revenue from all paid invoices for this company
  const totalRevenue = await prisma.invoice.aggregate({
    _sum: { total: true },
    where: companyFilter,
  });
  return NextResponse.json({
    total: totalRevenue._sum.total ?? 0,
    sinceDate,
    invoices: paidInvoices,
  });
}
