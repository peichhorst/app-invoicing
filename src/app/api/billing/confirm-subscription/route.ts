import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const PRICE_ID = process.env.PRO_SUBSCRIPTION_PRICE_ID;
const SUBSCRIPTION_AMOUNT_CENTS = Number(process.env.PRO_SUBSCRIPTION_PRICE_CENTS ?? 1900);

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

    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      default_payment_method: paymentMethodId,
      items: [
        PRICE_ID
          ? { price: PRICE_ID }
          : {
              price_data: {
                currency: 'usd',
                product_data: { name: 'ClientWave Pro' },
                recurring: { interval: 'month' },
                unit_amount: SUBSCRIPTION_AMOUNT_CENTS,
              },
              quantity: 1,
            },
      ],
      metadata: { userId: user.id },
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        planTier: 'PRO',
        stripeSubscriptionId: subscription.id,
        stripeCustomerId: customerId,
        defaultPaymentMethodId: paymentMethodId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Confirm subscription failed', error);
    return NextResponse.json({ error: error?.message || 'Unable to confirm subscription' }, { status: 500 });
  }
}
