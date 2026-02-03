import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import type { Stripe } from 'stripe';

const PRICE_ID = process.env.PRO_SUBSCRIPTION_PRICE_ID;
const PRODUCT_ID = process.env.PRO_SUBSCRIPTION_PRODUCT_ID;
const SUBSCRIPTION_AMOUNT_CENTS = Number(process.env.PRO_SUBSCRIPTION_PRICE_CENTS ?? 999);

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const paymentIntentId = body?.paymentIntentId;
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Missing payment intent ID' }, { status: 400 });
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['payment_method'] });
    const customerId = typeof paymentIntent.customer === 'string' ? paymentIntent.customer : paymentIntent.customer?.id;
    const paymentMethodId =
      typeof paymentIntent.payment_method === 'string'
        ? paymentIntent.payment_method
        : paymentIntent.payment_method?.id;

    if (!customerId || !paymentMethodId) {
      return NextResponse.json({ error: 'Incomplete payment data' }, { status: 400 });
    }

    const interval: Stripe.SubscriptionCreateParams.Item.PriceData.Recurring.Interval = 'month';
    const items =
      PRICE_ID
        ? [{ price: PRICE_ID }]
        : PRODUCT_ID
          ? [
              {
                price_data: {
                  currency: 'usd',
                  product: PRODUCT_ID,
                  recurring: { interval },
                  unit_amount: SUBSCRIPTION_AMOUNT_CENTS,
                },
                quantity: 1,
              },
            ]
          : null;

    if (!items) {
      return NextResponse.json(
        { error: 'Subscription price or product not configured' },
        { status: 500 }
      );
    }

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      default_payment_method: paymentMethodId,
      items,
      metadata: { userId: user.id },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        planTier: 'PRO',
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        defaultPaymentMethodId: paymentMethodId,
        subscriptionCancelAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Confirm subscription failed', error);
    return NextResponse.json({ error: error?.message || 'Unable to confirm subscription' }, { status: 500 });
  }
}
