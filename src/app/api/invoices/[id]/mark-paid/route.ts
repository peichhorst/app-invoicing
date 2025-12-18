// src/app/api/invoices/[id]/mark-paid/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';
import { getCurrentUser } from '@/lib/auth';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const companyId = user.companyId ?? user.company?.id ?? null;

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: isOwnerOrAdmin
      ? { id, user: { companyId: companyId ?? undefined } }
      : { id, userId: user.id },
    include: { client: true, items: true, user: { include: { company: true } } },
  });
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  if (invoice.status === 'PAID') {
    return NextResponse.json({ ok: true, status: 'PAID' });
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: 'PAID' },
    include: { client: true, items: true, user: { include: { company: true } } },
  });

  // Auto-activate the recurring subscription if this is from a recurring invoice
  if (invoice.recurringParentId) {
    await prisma.recurringInvoice.updateMany({
      where: {
        id: invoice.recurringParentId,
        status: 'PENDING',
      },
      data: {
        status: 'ACTIVE',
        firstPaidAt: new Date(),
      },
    });
  }

  const dueDays =
    updated.dueDate != null
      ? Math.max(
          0,
          Math.round(
            (new Date(updated.dueDate).getTime() - new Date(updated.issueDate).getTime()) /
              (1000 * 60 * 60 * 24)
          )
        )
      : 0;

  const emailInvoice = {
    ...updated,
    dueDays,
    items: updated.items.map((item) => ({
      ...item,
      amount: item.total ?? Number(item.unitPrice) * Number(item.quantity),
    })),
  };

  void sendInvoiceEmail(emailInvoice, updated.client, updated.user).catch((err) => {
    console.error('Failed to send paid receipt', err);
  });

  return NextResponse.json({ ok: true, status: 'PAID' });
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const companyId = user.companyId ?? user.company?.id ?? null;

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: isOwnerOrAdmin
      ? { id, user: { companyId: companyId ?? undefined } }
      : { id, userId: user.id },
    include: { client: true, items: true, user: { include: { company: true } } },
  });
  if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  if (invoice.status !== 'PAID') {
    return NextResponse.json({ ok: true, status: invoice.status });
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: 'SENT' },
    include: { client: true, items: true, user: { include: { company: true } } },
  });

  return NextResponse.json({ ok: true, status: 'SENT' });
}
