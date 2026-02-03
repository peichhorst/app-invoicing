import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { stripe } from '@/lib/stripe';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const subscriptionId = user.stripeSubscriptionId;
    if (!subscriptionId) {
      return NextResponse.json({ error: 'No active subscription found' }, { status: 400 });
    }

    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    await prisma.user.update({
      where: { id: user.id },
      data: {
        subscriptionCancelAt: null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Resume subscription failed', error);
    return NextResponse.json(
      { error: error?.message || 'Unable to resume subscription' },
      { status: 500 }
    );
  }
}
