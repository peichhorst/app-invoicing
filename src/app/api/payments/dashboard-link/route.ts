// src/app/api/payments/dashboard-link/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUser } from '@/lib/auth';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' }) : null;

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!stripe) return NextResponse.json({ error: 'Stripe secret key not configured' }, { status: 500 });
  if (!user.stripeAccountId) return NextResponse.json({ error: 'Stripe account not linked yet' }, { status: 400 });

  try {
    const link = await stripe.accounts.createLoginLink(user.stripeAccountId);
    return NextResponse.json({ url: link.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create dashboard link';
    console.error('Dashboard link failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
