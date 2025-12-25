import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SUBSCRIPTION_AMOUNT_CENTS = Number(process.env.PRO_SUBSCRIPTION_PRICE_CENTS ?? 999);
const PRICE_ID = process.env.PRO_SUBSCRIPTION_PRICE_ID;
const PRODUCT_ID = process.env.PRODUCT_ID;

export async function POST(_request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const customerId = await ensureStripeCustomer(user);

    console.log('Subscription intent env', { PRICE_ID, PRODUCT_ID, SUBSCRIPTION_AMOUNT_CENTS });

    const intent = await stripe.paymentIntents.create({
      amount: SUBSCRIPTION_AMOUNT_CENTS,
      currency: 'usd',
      customer: customerId,
      payment_method_types: ['card'],
      metadata: { userId: user.id, purpose: 'subscription', priceId: PRICE_ID ?? null },
      setup_future_usage: 'off_session',
    });

    return NextResponse.json({
      clientSecret: intent.client_secret,
      priceId: PRICE_ID ?? null,
      productId: PRODUCT_ID ?? null,
      envAmount: SUBSCRIPTION_AMOUNT_CENTS,
    });
  } catch (error: any) {
    console.error('Create subscription intent failed', error);
    return NextResponse.json({ error: error?.message || 'Unable to create subscription intent' }, { status: 500 });
  }
}

async function ensureStripeCustomer(user: { id: string; stripeCustomerId?: string | null; email?: string | null; name?: string | null }) {
  const existingId = user.stripeCustomerId?.toString().trim();
  if (existingId && existingId.toLowerCase() !== 'null') {
    try {
      await stripe.customers.retrieve(existingId);
      return existingId;
    } catch (error: any) {
      console.warn('Stored Stripe customer invalid, creating new one', { existingId, message: error?.message });
    }
  }

  const customer = await stripe.customers.create({
    email: user.email ?? undefined,
    name: user.name ?? undefined,
    metadata: { userId: user.id },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}
