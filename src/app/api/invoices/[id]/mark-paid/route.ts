// src/app/api/invoices/[id]/mark-paid/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';
import { getCurrentUser } from '@/lib/auth';
import { PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { reconcileInvoiceStatus } from '@/lib/payments';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const toErrorMessage = (err: unknown) => (err instanceof Error ? err.message : 'Unknown error');

export async function POST(_req: Request, { params }: RouteContext) {
  try {
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

    const clientId = invoice.clientId ?? invoice.client?.id;
    if (!clientId) {
      return NextResponse.json({ error: 'Invoice missing client record' }, { status: 400 });
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        invoiceId: id,
        provider: PaymentProvider.manual,
        status: PaymentStatus.succeeded,
      },
    });

    if (!existingPayment) {
      await prisma.payment.create({
        data: {
          clientId,
          invoiceId: id,
          provider: PaymentProvider.manual,
          status: PaymentStatus.succeeded,
          amount: new Prisma.Decimal(invoice.total ?? 0),
          currency: invoice.currency ?? 'USD',
          paidAt: new Date(),
        },
      });
    }

    await reconcileInvoiceStatus(id);

    const updated = await prisma.invoice.findUnique({
      where: { id },
      include: { client: true, items: true, user: { include: { company: true } } },
    });

    if (!updated) {
      return NextResponse.json({ error: 'Invoice disappeared after update' }, { status: 500 });
    }

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
      items: (updated.items as any[]).map((item: any) => ({
        ...item,
        amount: item.total ?? Number(item.unitPrice) * Number(item.quantity),
      })),
    };

    // Fire-and-forget: send paid receipt email after responding
    setTimeout(() => {
      sendInvoiceEmail(emailInvoice, updated.client, updated.user).catch((err) => {
        console.error('Failed to send paid receipt', err);
      });
    }, 0);

    return NextResponse.json({ ok: true, status: 'PAID' });
  } catch (err) {
    console.error('Mark invoice paid failed', err);
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
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

    await prisma.payment.deleteMany({
      where: {
        invoiceId: id,
        provider: PaymentProvider.manual,
        status: PaymentStatus.succeeded,
      },
    });

    await reconcileInvoiceStatus(id);
    const refreshed = await prisma.invoice.findUnique({ where: { id } });
    const nextStatus = refreshed?.status ?? 'UNPAID';
    return NextResponse.json({ ok: true, status: nextStatus });
  } catch (err) {
    console.error('Unmark invoice paid failed', err);
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}
