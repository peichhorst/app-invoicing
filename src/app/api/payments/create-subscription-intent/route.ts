import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const SUBSCRIPTION_AMOUNT_CENTS = Number(process.env.PRO_SUBSCRIPTION_PRICE_CENTS ?? 1900);

export async function POST(_request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId: customer.id },
      });
    }

    const intent = await stripe.paymentIntents.create({
      amount: SUBSCRIPTION_AMOUNT_CENTS,
      currency: 'usd',
      customer: customerId,
      payment_method_types: ['card'],
      metadata: { userId: user.id, purpose: 'subscription' },
      setup_future_usage: 'off_session',
    });

    return NextResponse.json({ clientSecret: intent.client_secret });
  } catch (error: any) {
    console.error('Create subscription intent failed', error);
    return NextResponse.json({ error: error?.message || 'Unable to create subscription intent' }, { status: 500 });
  }
}
