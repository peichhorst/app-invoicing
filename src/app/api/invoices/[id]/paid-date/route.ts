import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { user: { select: { id: true, companyId: true } } },
  });
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const isPlatformAdmin = user.role === 'SUPERADMIN';
  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  if (
    !isPlatformAdmin &&
    !(
      isOwnerOrAdmin &&
      user.companyId &&
      invoice.user.companyId &&
      user.companyId === invoice.user.companyId
    ) &&
    invoice.userId !== user.id
  ) {
    console.error('Forbidden paid-date update', {
      actor: user.id,
      invoiceUser: invoice.userId,
      company: user.companyId,
      invoiceCompany: invoice.user.companyId,
    });
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await request.json().catch(() => null);
  const paidAtRaw = payload?.paidAt;
  const paidAt = paidAtRaw ? new Date(paidAtRaw) : null;
  if (!paidAt || Number.isNaN(paidAt.getTime())) {
    console.error('Invalid paid date payload', payload);
    return NextResponse.json({ error: 'Invalid paid date' }, { status: 400 });
  }

  const updated = await prisma.invoice.update({
    where: { id: invoice.id },
    data: { paidAt },
  });

  return NextResponse.json({ paidAt: updated.paidAt?.toISOString() });
}

export function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
