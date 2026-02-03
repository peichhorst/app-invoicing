import { NextRequest, NextResponse } from 'next/server';
import { Prisma, PaymentProvider, PaymentStatus, InvoiceStatus } from '@prisma/client';
import { stripe } from '@/lib/stripe';
import prisma from '@/lib/prisma';
import { computeInvoicePaidAmounts, reconcileInvoiceStatus } from '@/lib/payments';

const PAYABLE_STATUSES = new Set<InvoiceStatus>([
  InvoiceStatus.UNPAID,
  InvoiceStatus.OPEN,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
]);

export async function POST(
  req: NextRequest,
  context: { params: Promise<Record<string, string | string[] | undefined>> },
) {
  const params = await context.params;
  const invoiceId = typeof params?.id === 'string' ? params.id : undefined;
  if (!invoiceId) {
    return NextResponse.json({ error: 'Missing invoice ID' }, { status: 400 });
  }

  await reconcileInvoiceStatus(invoiceId);

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      total: true,
      amountPaid: true,
      currency: true,
      clientId: true,
      invoiceNumber: true,
      client: { select: { email: true } },
      status: true,
      user: { select: { id: true, stripeAccountId: true } },
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  if (!invoice.clientId) {
    return NextResponse.json({ error: 'Invoice is missing an associated client' }, { status: 400 });
  }

  if (!PAYABLE_STATUSES.has(invoice.status)) {
    return NextResponse.json(
      { error: 'Invoice is not currently payable', status: invoice.status },
      { status: 400 }
    );
  }

  let invoiceForPayment = invoice;
  if (invoice.status === InvoiceStatus.UNPAID) {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: InvoiceStatus.OPEN },
    });
    invoiceForPayment = { ...invoice, status: InvoiceStatus.OPEN };
  }

  const { paidAmount } = await computeInvoicePaidAmounts(invoiceId);
  const total = new Prisma.Decimal(invoiceForPayment.total ?? 0);
  const amountDue = total.minus(paidAmount);

  if (!amountDue.isPositive()) {
    return NextResponse.json({ error: 'Invoice is already paid' }, { status: 400 });
  }

  const amountDueNumber = amountDue.toNumber();
  if (!Number.isFinite(amountDueNumber) || amountDueNumber <= 0) {
    return NextResponse.json({ error: 'Invalid amount due' }, { status: 400 });
  }

  const currency = (invoiceForPayment.currency ?? 'USD').toLowerCase();
  const amountInCents = Math.max(1, Math.round(amountDueNumber * 100));
  const stripeAccountId = invoice.user?.stripeAccountId;
  if (!stripeAccountId) {
    return NextResponse.json({ error: 'Stripe account not configured for seller' }, { status: 500 });
  }

  const payment = await prisma.payment.create({
    data: {
      invoiceId: invoice.id,
      clientId: invoice.clientId,
      amount: new Prisma.Decimal(amountDueNumber),
      currency: invoice.currency ?? 'USD',
      provider: PaymentProvider.stripe,
      status: PaymentStatus.initiated,
    },
  });

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency,
              product_data: {
                name: `Invoice #${invoice.invoiceNumber}`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        success_url: `${appUrl}/dashboard/invoices/${invoice.id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/dashboard/invoices/${invoice.id}?payment=cancelled`,
        metadata: {
          invoiceId: invoice.id,
          paymentId: payment.id,
        },
        customer_email: invoice.client?.email ?? undefined,
      },
      {
        stripeAccount: stripeAccountId,
      },
    );

    if (!session.url || !session.id) {
      throw new Error('Failed to create Stripe checkout session');
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        stripeCheckoutSessionId: session.id,
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Failed to start payment';
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: PaymentStatus.failed,
        lastError: message,
      },
    });
    console.error('Invoice pay attempt failed', { invoiceId, message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
