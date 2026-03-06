// src/app/api/payments/dashboard-link/route.ts
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' }) : null;

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!stripe) return NextResponse.json({ error: 'Stripe secret key not configured' }, { status: 500 });
  if (!user.companyId) return NextResponse.json({ error: 'No company found for user' }, { status: 400 });

  const company = await prisma.company.findUnique({
    where: { id: user.companyId },
    select: { stripeAccountId: true },
  });
  const stripeAccountId = company?.stripeAccountId ?? null;
  if (!stripeAccountId) return NextResponse.json({ error: 'Stripe account not linked yet' }, { status: 400 });

  try {
    const link = await stripe.accounts.createLoginLink(stripeAccountId);
    return NextResponse.json({ url: link.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to create dashboard link';
    console.error('Dashboard link failed', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
