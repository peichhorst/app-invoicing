import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

const stripeSecret = process.env.STRIPE_SECRET_KEY;

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!stripeSecret) return NextResponse.json({ error: 'Stripe secret key not configured' }, { status: 500 });

    const url = new URL(request.url);
    const sessionId = url.searchParams.get('session_id');
    if (!sessionId) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 });

    const stripe = new Stripe(stripeSecret, { apiVersion: '2025-12-15.clover' });
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });

    const subscription = session.subscription && typeof session.subscription === 'object' ? session.subscription : null;
    const subscriptionId =
      typeof session.subscription === 'string' ? session.subscription : session.subscription?.id || null;
    const customerId =
      typeof session.customer === 'string' ? session.customer : session.customer?.id || user.stripeCustomerId || null;

    if (!subscriptionId) {
      return NextResponse.json({ error: 'No subscription found on session' }, { status: 400 });
    }

    const subStatus = subscription?.status || null;
    const isActive =
      session.payment_status === 'paid' ||
      (subStatus && !['canceled', 'incomplete_expired'].includes(subStatus));

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        planTier: isActive ? 'PRO' : 'FREE',
        stripeCustomerId: customerId || undefined,
        stripeSubscriptionId: subscriptionId,
        proTrialEndsAt: null,
        proTrialReminderSent: false,
      },
    });

    return NextResponse.json({ plan: updated.planTier, subscriptionId, customerId, status: subStatus });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to confirm subscription';
    console.error('Confirm subscription failed:', message);
    return NextResponse.json(
      { error: 'Failed to confirm subscription', details: message },
      { status: 500 }
    );
  }
}
