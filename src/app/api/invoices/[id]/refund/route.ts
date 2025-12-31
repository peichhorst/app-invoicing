import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { InvoiceStatus } from '@prisma/client';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: '2024-06-20',
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, context: any) {
  const session = await getCurrentUser();
  if (!session?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const viewerRole = session.role?.toLowerCase() ?? '';
  const body = await req.json().catch(() => ({}));
  const amount = body?.amount ? Number(body.amount) : null;
  const reason = body?.reason ? String(body.reason) : undefined;

  const { params } = context;
  const invoiceId = (params as { id: string }).id;

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    select: {
      id: true,
      userId: true,
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
  if (refundableRemaining <= 0) {
    return NextResponse.json({ error: 'Nothing left to refund.' }, { status: 400 });
  }

  const refundAmount = amount == null ? refundableRemaining : amount;
  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    return NextResponse.json({ error: 'Invalid refund amount.' }, { status: 400 });
  }
  if (refundAmount > refundableRemaining) {
    return NextResponse.json({ error: 'Refund exceeds remaining refundable amount.' }, { status: 400 });
  }

  const payment_intent = invoice.stripePaymentIntentId ?? undefined;
  const charge = invoice.stripeChargeId ?? undefined;

  if (!payment_intent && !charge) {
    return NextResponse.json({ error: 'Missing Stripe payment intent or charge.' }, { status: 400 });
  }

  const refund = await stripe.refunds.create({
    payment_intent,
    charge,
    amount: refundAmount,
    reason: reason as any,
    metadata: { invoiceId: invoice.id },
  });

  const newAmountRefunded = (invoice.amountRefunded ?? 0) + refundAmount;
  const totalPaid = invoice.amountPaid ?? 0;
  const newStatus =
    newAmountRefunded >= totalPaid ? InvoiceStatus.REFUNDED : InvoiceStatus.PARTIALLY_REFUNDED;

  await prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      amountRefunded: newAmountRefunded,
      status: newStatus,
    },
  });

  const response = NextResponse.json({
    ok: true,
    refund: { id: refund.id, amount: refund.amount, status: refund.status },
    invoice: { id: invoice.id, status: newStatus, amountRefunded: newAmountRefunded },
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
