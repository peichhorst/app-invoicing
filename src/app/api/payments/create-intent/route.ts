// src/app/api/payments/create-intent/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' })
  : null;

export async function POST(request: Request) {
  const userFromSession = await getCurrentUser().catch(() => null);

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe secret key not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email : '';
    const sellerId = typeof body?.sellerId === 'string' ? body.sellerId : null;
    const invoiceId = typeof body?.invoiceId === 'string' ? body.invoiceId : null;
    const amountFromBody = Number(body?.amount);

    let targetUser = userFromSession;
    let amount = amountFromBody;

    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { id: true, userId: true, total: true, status: true },
      });
      if (!invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      if (sellerId && invoice.userId !== sellerId) {
        return NextResponse.json({ error: 'Invoice does not belong to seller' }, { status: 400 });
      }
      if (invoice.status === 'PAID') {
        return NextResponse.json({ error: 'Invoice already paid' }, { status: 400 });
      }
      targetUser = (await prisma.user.findUnique({ where: { id: invoice.userId } })) || targetUser;
      amount = Math.max(1, Math.round((invoice.total || 0) * 100));
    }

    if (sellerId && !targetUser) {
      targetUser = await prisma.user.findUnique({ where: { id: sellerId } });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!targetUser?.stripeAccountId) {
      return NextResponse.json({ error: 'Stripe account not configured for seller' }, { status: 500 });
    }

    const stripeAccountId = targetUser.stripeAccountId;

    const params: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount),
      currency: 'usd',
      receipt_email: email || undefined,
    metadata: {
      userId: targetUser?.id || 'guest',
      invoiceId: invoiceId || '',
      source: 'clientwave-app',
    },
  };

    const intent = await stripe.paymentIntents.create(params, {
      stripeAccount: stripeAccountId,
    });

    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (error: any) {
    console.error('Create intent failed', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
