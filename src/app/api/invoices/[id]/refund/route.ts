
import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { InvoiceStatus, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import { reconcileInvoiceStatus } from '@/lib/payments';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2026-01-28.clover',
});

type RefundRouteHandlerContext = {
  params: Promise<Record<string, string | string[] | undefined>>;
};



export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, context: RefundRouteHandlerContext) {
  const session = await getCurrentUser();
  if (!session?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const viewerRole = session.role?.toLowerCase() ?? '';
  const body = await req.json().catch(() => ({}));
  const amount = typeof body?.amount === 'number' ? Math.round(body.amount) : null;
  const rawReason = typeof body?.reason === 'string' ? body.reason.trim() : undefined;
  const normalizedReason = rawReason?.toLowerCase().replace(/\s+/g, '_');
  const reasonMap: Record<string, Stripe.RefundCreateParams.Reason> = {
    duplicate: 'duplicate',
    fraud: 'fraudulent',
    fraudulent: 'fraudulent',
    requested_by_customer: 'requested_by_customer',
  };
  const stripeReason = normalizedReason ? reasonMap[normalizedReason] : undefined;

  const resolvedParams = (await context.params) ?? {};
  const invoiceId = typeof resolvedParams.id === 'string' ? resolvedParams.id : undefined;

  if (!invoiceId) {
    return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      userId: true,
      clientId: true,
      currency: true,
      total: true,
      stripePaymentIntentId: true,
      stripeChargeId: true,
      amountPaid: true,
      amountRefunded: true,
      status: true,
    },
  });

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }

  const isAdmin = ['admin', 'owner', 'superadmin'].includes(viewerRole);
  const isOwner = invoice.userId === session.id;

  if (!isAdmin && !isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const refundableRemaining = Math.max(0, (invoice.amountPaid ?? 0) - (invoice.amountRefunded ?? 0));
  const refundableRemainingCents = Math.max(0, Math.round(refundableRemaining * 100));
  if (refundableRemainingCents <= 0) {
    return NextResponse.json({ error: 'Nothing left to refund.' }, { status: 400 });
  }

  const refundAmountCents = amount == null ? refundableRemainingCents : amount;
  if (!Number.isFinite(refundAmountCents) || refundAmountCents <= 0) {
    return NextResponse.json({ error: 'Invalid refund amount.' }, { status: 400 });
  }
  if (refundAmountCents > refundableRemainingCents) {
    return NextResponse.json({ error: 'Refund exceeds remaining refundable amount.' }, { status: 400 });
  }

  const payment_intent = invoice.stripePaymentIntentId ?? undefined;
  const charge = invoice.stripeChargeId ?? undefined;

  if (!payment_intent && !charge) {
    return NextResponse.json({ error: 'Missing Stripe payment intent or charge.' }, { status: 400 });
  }

  const metadata: Stripe.MetadataParam = { invoiceId: invoice.id };
  if (rawReason) {
    metadata.refundReason = rawReason;
  }

  const refund = await stripe.refunds.create({
    payment_intent,
    charge,
    amount: refundAmountCents,
    reason: stripeReason,
    metadata,
  });

  const refundDecimal = new Prisma.Decimal(refundAmountCents).dividedBy(100);
  const previousRefunded = new Prisma.Decimal(invoice.amountRefunded ?? 0);
  const newAmountRefundedDecimal = previousRefunded.plus(refundDecimal);
  const totalPaidDecimal = new Prisma.Decimal(invoice.amountPaid ?? 0);
  const newStatus =
    newAmountRefundedDecimal.greaterThanOrEqualTo(totalPaidDecimal)
      ? InvoiceStatus.REFUNDED
      : InvoiceStatus.PARTIALLY_REFUNDED;

  const paymentIntentId = invoice.stripePaymentIntentId ?? undefined;
  const chargeId = invoice.stripeChargeId ?? undefined;
  const refundChargeId =
    typeof refund.charge === 'string' ? refund.charge : refund.charge ? refund.charge.id : undefined;
  const balanceTransactionId =
    typeof refund.balance_transaction === 'string' ? refund.balance_transaction : undefined;

  let payment: any = null;
  if (paymentIntentId) {
    payment = await prisma.payment.findFirst({ where: { stripePaymentIntentId: paymentIntentId } });
  }
  if (!payment && chargeId) {
    payment = await prisma.payment.findFirst({ where: { stripeChargeId: chargeId } });
  }
  if (!payment) {
    payment = await prisma.payment.findFirst({
      where: {
        invoiceId: invoice.id,
        status: {
          in: [PaymentStatus.succeeded, PaymentStatus.partially_refunded, PaymentStatus.refunded],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  if (payment) {
    const existingRefunded = new Prisma.Decimal(payment.refundedAmount ?? 0);
    const updatedRefundedAmount = existingRefunded.plus(refundDecimal);
    const paymentAmount = new Prisma.Decimal(payment.amount ?? invoice.amountPaid ?? invoice.total ?? 0);
    const paymentStatus =
      updatedRefundedAmount.greaterThanOrEqualTo(paymentAmount)
        ? PaymentStatus.refunded
        : PaymentStatus.partially_refunded;

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        refundedAmount: updatedRefundedAmount,
        status: paymentStatus,
        stripePaymentIntentId: paymentIntentId ?? payment.stripePaymentIntentId ?? undefined,
        stripeChargeId: refundChargeId ?? chargeId ?? payment.stripeChargeId ?? undefined,
        stripeBalanceTransactionId: balanceTransactionId ?? payment.stripeBalanceTransactionId ?? undefined,
      },
    });
  } else if (invoice.clientId) {
    const fallbackAmountNumber = Math.max(refundDecimal.toNumber(), invoice.amountPaid ?? 0, invoice.total ?? 0);
    const fallbackAmount = new Prisma.Decimal(fallbackAmountNumber);
    const fallbackStatus = newAmountRefundedDecimal.greaterThanOrEqualTo(fallbackAmount)
      ? PaymentStatus.refunded
      : PaymentStatus.partially_refunded;

    await prisma.payment.create({
      data: {
        clientId: invoice.clientId,
        invoiceId: invoice.id,
        provider: PaymentProvider.stripe,
        status: fallbackStatus,
        amount: fallbackAmount,
        currency: invoice.currency ?? 'USD',
        refundedAmount: refundDecimal,
        paidAt: new Date(),
        stripePaymentIntentId: paymentIntentId,
        stripeChargeId: refundChargeId ?? chargeId,
        stripeBalanceTransactionId: balanceTransactionId,
      },
    });
  } else {
    console.warn('Refund could not be attached to a payment row for invoice', invoice.id);
  }

  await reconcileInvoiceStatus(invoice.id);

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      amountRefunded: Number(newAmountRefundedDecimal.toNumber()),
      status: newStatus,
    },
  });

  const response = NextResponse.json({
    ok: true,
    refund: { id: refund.id, amount: refund.amount, status: refund.status },
    invoice: {
      id: invoice.id,
      status: newStatus,
      amountRefunded: Number(newAmountRefundedDecimal.toNumber()),
    },
  });

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}

export async function OPTIONS() {
  const response = new NextResponse(null, { status: 200 });
  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');
  return response;
}
