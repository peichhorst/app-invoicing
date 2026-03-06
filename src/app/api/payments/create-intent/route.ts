// src/app/api/payments/create-intent/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Payment, PaymentProvider, PaymentStatus, Prisma } from '@prisma/client';
import {
  buildStripeFeeBreakdown,
  getStripeFeeConfigForMethod,
  isTruthyFlag,
  type StripeFeePaymentMethod,
} from '@/lib/payments/stripe-fees';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' })
  : null;

export async function POST(request: Request) {
  let paymentRecord: Payment | null = null;
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
    const applyStripeFeeFromBody = isTruthyFlag(body?.applyStripeFee);
    const requestedPaymentMethod: StripeFeePaymentMethod | null =
      body?.paymentMethod === 'us_bank_account'
        ? 'us_bank_account'
        : body?.paymentMethod === 'card'
          ? 'card'
          : null;

    let targetUser = userFromSession;
    let amount = amountFromBody;
    let invoiceTotal = 0;
    let invoiceCurrency = 'USD';
    let clientId: string | null = null;

    let companyStripeFeeResponsibility: 'business_absorbs' | 'client_pays' = 'business_absorbs';
    let companyAllowCard = true;
    let companyAllowAch = false;
    let companyStripeAccountId: string | null = null;
    if (invoiceId) {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: { clientId: true, id: true, userId: true, total: true, status: true, currency: true },
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
      targetUser = (await prisma.user.findUnique({ where: { id: invoice.userId } })) || targetUser;
      if (targetUser?.companyId) {
        const company = await prisma.company.findUnique({
          where: { id: targetUser.companyId },
          select: {
            stripeAccountId: true,
            stripeFeeResponsibility: true,
            stripePaymentMethodCard: true,
            stripePaymentMethodAch: true,
          },
        });
        companyStripeAccountId = company?.stripeAccountId ?? null;
        companyStripeFeeResponsibility =
          company?.stripeFeeResponsibility === 'client_pays' ? 'client_pays' : 'business_absorbs';
        companyAllowCard = company?.stripePaymentMethodCard !== false;
        companyAllowAch = Boolean(company?.stripePaymentMethodAch);
      }
      amount = Math.max(1, Math.round((invoice.total || 0) * 100));
      invoiceTotal = invoice.total ?? 0;
      invoiceCurrency = invoice.currency ?? 'USD';
      clientId = invoice.clientId ?? null;
      paymentRecord = await prisma.payment.findFirst({
        where: {
          invoiceId,
          provider: PaymentProvider.stripe,
          status: PaymentStatus.initiated,
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!paymentRecord) {
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
      }
    }

    if (sellerId && !targetUser) {
      targetUser = await prisma.user.findUnique({ where: { id: sellerId } });
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 });
    }

    const enabledMethods: Array<'card' | 'us_bank_account'> = [];
    if (companyAllowCard) enabledMethods.push('card');
    if (companyAllowAch) enabledMethods.push('us_bank_account');
    if (!enabledMethods.length) {
      return NextResponse.json(
        { error: 'No online payment methods are enabled for this business.' },
        { status: 400 },
      );
    }

    const selectedMethod: StripeFeePaymentMethod =
      requestedPaymentMethod ??
      (enabledMethods.includes('us_bank_account') ? 'us_bank_account' : 'card');

    if (selectedMethod === 'card' && !companyAllowCard) {
      return NextResponse.json({ error: 'Card payments are disabled for this business.' }, { status: 400 });
    }
    if (selectedMethod === 'us_bank_account' && !companyAllowAch) {
      return NextResponse.json({ error: 'ACH payments are disabled for this business.' }, { status: 400 });
    }

    const applyStripeFee =
      invoiceId != null ? companyStripeFeeResponsibility === 'client_pays' : applyStripeFeeFromBody;
    let effectiveMethod: StripeFeePaymentMethod = selectedMethod;
    let feeBreakdown = buildStripeFeeBreakdown(
      amount,
      applyStripeFee,
      getStripeFeeConfigForMethod(effectiveMethod),
    );
    let finalAmountCents = Math.max(1, feeBreakdown.totalAmountCents);

    if (!companyStripeAccountId && targetUser?.companyId) {
      const company = await prisma.company.findUnique({
        where: { id: targetUser.companyId },
        select: { stripeAccountId: true },
      });
      companyStripeAccountId = company?.stripeAccountId ?? null;
    }

    const sellerStripeAccountId = companyStripeAccountId ?? null;

    if (!sellerStripeAccountId) {
      return NextResponse.json({ error: 'Stripe account not configured for seller' }, { status: 500 });
    }

    const stripeAccountId = sellerStripeAccountId;
    console.info('Creating payment intent', {
      stripeAccountId,
      invoiceId,
      amount: finalAmountCents,
      baseAmount: feeBreakdown.baseAmountCents,
      stripeFee: feeBreakdown.stripeFeeCents,
      applyStripeFee: feeBreakdown.applyStripeFee,
    });

    const buildIntentMetadata = (breakdown: typeof feeBreakdown): Stripe.MetadataParam => ({
      userId: targetUser?.id || 'guest',
      invoiceId: invoiceId || '',
      source: 'clientwave-app',
      applyStripeFee: breakdown.applyStripeFee ? 'true' : 'false',
      baseAmountCents: String(breakdown.baseAmountCents),
      stripeFeeCents: String(breakdown.stripeFeeCents),
    });
    const metadata: Stripe.MetadataParam = buildIntentMetadata(feeBreakdown);
    if (paymentRecord) {
      metadata.paymentId = paymentRecord.id;
    }

    const methodSensitivePricing = feeBreakdown.applyStripeFee;
    const allowedPaymentMethods: Array<'card' | 'us_bank_account'> = methodSensitivePricing
      ? [selectedMethod]
      : enabledMethods;

    const params: Stripe.PaymentIntentCreateParams = {
      amount: finalAmountCents,
      currency: 'usd',
      receipt_email: email || undefined,
      metadata,
      payment_method_types: allowedPaymentMethods,
    };

    if (allowedPaymentMethods.includes('us_bank_account')) {
      params.payment_method_options = {
        us_bank_account: {
          verification_method: 'automatic',
        },
      };
    }

    let intent: Stripe.PaymentIntent;
    let achFallbackToCard = false;
    try {
      intent = await stripe.paymentIntents.create(params, {
        stripeAccount: stripeAccountId,
      });
    } catch (createError: any) {
      const message = String(createError?.message ?? '');
      const achMethodRejected =
        message.includes('payment method type "us_bank_account" is invalid') ||
        message.includes('payment method type `us_bank_account` is invalid') ||
        message.toLowerCase().includes('us_bank_account');

      // If ACH is unavailable for this connected account but card is enabled in settings,
      // retry with card only so checkout still works.
      if (achMethodRejected && allowedPaymentMethods.includes('us_bank_account') && companyAllowCard) {
        effectiveMethod = 'card';
        feeBreakdown = buildStripeFeeBreakdown(
          amount,
          applyStripeFee,
          getStripeFeeConfigForMethod(effectiveMethod),
        );
        finalAmountCents = Math.max(1, feeBreakdown.totalAmountCents);
        const retryParams: Stripe.PaymentIntentCreateParams = {
          ...params,
          amount: finalAmountCents,
          metadata: buildIntentMetadata(feeBreakdown),
          payment_method_types: ['card'],
        };
        delete retryParams.payment_method_options;
        achFallbackToCard = true;
        intent = await stripe.paymentIntents.create(retryParams, {
          stripeAccount: stripeAccountId,
        });
      } else if (achMethodRejected) {
        return NextResponse.json(
          {
            error:
              'ACH is enabled in ClientWave settings, but this Stripe account does not currently support us_bank_account. Enable Card as a fallback or activate ACH in Stripe payment method settings.',
          },
          { status: 400 },
        );
      } else {
        throw createError;
      }
    }

    if (paymentRecord) {
      await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          stripePaymentIntentId: intent.id,
          metadata: {
            ...(typeof paymentRecord.metadata === 'object' && paymentRecord.metadata ? paymentRecord.metadata : {}),
            requestedPaymentMethod: selectedMethod,
          },
        },
      });
    }

    return NextResponse.json({
      clientSecret: intent.client_secret,
      amountCents: finalAmountCents,
      baseAmountCents: feeBreakdown.baseAmountCents,
      stripeFeeCents: feeBreakdown.stripeFeeCents,
      applyStripeFee: feeBreakdown.applyStripeFee,
      selectedPaymentMethod: achFallbackToCard ? 'card' : effectiveMethod,
      achFallbackToCard,
      checkoutWarning: achFallbackToCard
        ? 'ACH is currently unavailable for this Stripe account. Card checkout is shown instead.'
        : null,
    });
  } catch (error: any) {
    console.error('Create intent failed', error);
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
