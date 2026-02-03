import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const companyId = user.companyId ?? user.company?.id ?? null;
  const { id } = await params;
  const recurring = await prisma.recurringInvoice.findFirst({
    where: isOwnerOrAdmin
      ? { id, user: { companyId: companyId ?? undefined } }
      : { id, userId: user.id },
  });
  if (!recurring) {
    return NextResponse.json({ error: 'Recurring invoice not found' }, { status: 404 });
  }

  await prisma.recurringInvoice.update({
    where: { id },
    data: {
      status: 'ACTIVE',
      firstPaidAt: recurring.firstPaidAt ?? new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
