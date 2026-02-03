// src/app/api/stripe/v1/create-payment-intent/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import prisma from '@/lib/prisma';
import { Payment, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })
  : null;

export async function POST(request: Request) {
  let paymentRecord: Payment | null = null;

  if (!stripe) {
    return NextResponse.json({ error: 'Stripe secret key not configured' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email : '';
    const sellerId = typeof body?.sellerId === 'string' ? body.sellerId : null;
    const invoiceId = typeof body?.invoiceId === 'string' ? body.invoiceId : null;
    const amountFromBody = Number(body?.amount);

    let targetUser: any = null;
    let amount = amountFromBody;
    let invoiceTotal = 0;
    let invoiceCurrency = 'USD';
    let clientId: string | null = null;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID required' }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: {
        clientId: true,
        id: true,
        userId: true,
        total: true,
        status: true,
        currency: true,
      },
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

    if (!invoice.clientId) {
      return NextResponse.json({ error: 'Invoice missing client' }, { status: 400 });
    }

    targetUser = await prisma.user.findUnique({ where: { id: invoice.userId } });
    amount = Math.max(1, Math.round((invoice.total || 0) * 100));
    invoiceTotal = invoice.total ?? 0;
    invoiceCurrency = invoice.currency ?? 'USD';
    clientId = invoice.clientId ?? null;

    paymentRecord = await prisma.payment.create({
      data: {
        invoiceId,
        clientId,
        amount: new Prisma.Decimal(invoiceTotal),
        currency: invoiceCurrency,
        provider: PaymentProvider.stripe,
        status: PaymentStatus.initiated,
      },
    });

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    if (!targetUser?.stripeAccountId) {
      return NextResponse.json(
        { error: 'Stripe account not configured for seller' },
        { status: 500 }
      );
    }

    const stripeAccountId = targetUser.stripeAccountId;
    console.info('Creating payment intent', {
      stripeAccountId,
      invoiceId,
      amount: Math.round(amount),
    });

    const metadata: Stripe.MetadataParam = {
      userId: targetUser?.id || 'guest',
      invoiceId: invoiceId || '',
      source: 'clientwave-app',
    };

    if (paymentRecord) {
      metadata.paymentId = paymentRecord.id;
    }

    const params: Stripe.PaymentIntentCreateParams = {
      amount: Math.round(amount),
      currency: invoiceCurrency.toLowerCase(),
      receipt_email: email || undefined,
      metadata,
    };

    const intent = await stripe.paymentIntents.create(params, {
      stripeAccount: stripeAccountId,
    });

    if (paymentRecord) {
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: { stripePaymentIntentId: intent.id },
      });
    }

    return NextResponse.json({
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
    });
  } catch (error: any) {
    console.error('Create payment intent failed', error);

    if (paymentRecord) {
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: PaymentStatus.failed,
          lastError: error?.message ?? 'Payment intent creation failed',
        },
      });
    }

    return NextResponse.json(
      { error: error?.message || 'Failed to create payment intent' },
      { status: 500 }
    );
  }
}
