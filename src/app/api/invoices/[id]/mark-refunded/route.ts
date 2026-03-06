import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { InvoiceStatus, PaymentProvider, PaymentStatus } from '@prisma/client';
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
      select: {
        id: true,
        userId: true,
        total: true,
        dueDate: true,
        status: true,
      },
    });
    if (!invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const manualPayments = await prisma.payment.findMany({
      where: {
        invoiceId: id,
        provider: PaymentProvider.manual,
        status: {
          in: [PaymentStatus.succeeded, PaymentStatus.partially_refunded],
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!manualPayments.length) {
      return NextResponse.json({ error: 'No manual paid amount found to mark refunded.' }, { status: 400 });
    }

    await prisma.$transaction(
      manualPayments.map((payment) =>
        prisma.payment.update({
          where: { id: payment.id },
          data: {
            status: PaymentStatus.refunded,
            refundedAmount: payment.amount,
          },
        }),
      ),
    );

    await reconcileInvoiceStatus(id);

    const aggregateRefunded = await prisma.payment.aggregate({
      where: {
        invoiceId: id,
        status: { in: [PaymentStatus.refunded, PaymentStatus.partially_refunded] },
      },
      _sum: {
        refundedAmount: true,
      },
    });

    const refundedTotal = Number(aggregateRefunded._sum.refundedAmount ?? 0);

    await prisma.invoice.update({
      where: { id },
      data: {
        status: InvoiceStatus.REFUNDED,
        amountRefunded: refundedTotal,
      },
    });

    return NextResponse.json({ ok: true, status: InvoiceStatus.REFUNDED });
  } catch (err) {
    console.error('Mark invoice refunded failed', err);
    return NextResponse.json({ error: toErrorMessage(err) }, { status: 500 });
  }
}

