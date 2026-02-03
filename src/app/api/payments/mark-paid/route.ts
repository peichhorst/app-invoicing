import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';
import { PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { reconcileInvoiceStatus } from '@/lib/payments';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const invoiceId = body.invoiceId as string | undefined;
    const sellerId = body.sellerId as string | undefined;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Missing invoiceId' }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        user: { include: { company: true } },
        items: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    if (sellerId && invoice.userId !== sellerId) {
      return NextResponse.json({ error: 'Invoice does not belong to seller' }, { status: 403 });
    }

    if (invoice.status === 'PAID') {
      return NextResponse.json({ ok: true, status: 'PAID', invoiceId });
    }

    const clientId = invoice.clientId ?? invoice.client?.id;
    if (!clientId) {
      return NextResponse.json({ error: 'Cannot mark invoice paid without a client', status: 400 });
    }

    const existingPayment = await prisma.payment.findFirst({
      where: {
        invoiceId,
        provider: PaymentProvider.manual,
        status: PaymentStatus.succeeded,
      },
    });

    if (!existingPayment) {
      await prisma.payment.create({
        data: {
          clientId,
          invoiceId,
          provider: PaymentProvider.manual,
          status: PaymentStatus.succeeded,
          amount: new Prisma.Decimal(invoice.total ?? 0),
          currency: invoice.currency ?? 'USD',
          paidAt: new Date(),
        },
      });
    }

    await reconcileInvoiceStatus(invoiceId);

    const refreshed = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        client: true,
        user: { include: { company: true } },
        items: true,
      },
    });

    if (!refreshed) {
      return NextResponse.json({ error: 'Invoice disappeared after update' }, { status: 500 });
    }

    void sendInvoiceEmail(
      { ...refreshed, status: refreshed.status },
      refreshed.client,
      refreshed.user
    ).catch((err) => console.error('Send paid receipt failed', err));

    return NextResponse.json({ ok: true, status: refreshed.status, invoiceId });
  } catch (error: any) {
    console.error('Mark paid failed:', error);
    return NextResponse.json(
      { error: 'Failed to update invoice status', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
