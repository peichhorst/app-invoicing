// src/app/api/payments/account-link/route.ts
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const CALLBACK_PATH = '/api/payments/account-link/callback';
const STATE_COOKIE = 'stripe_oauth_state';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!STRIPE_CLIENT_ID) {
    return NextResponse.json({ error: 'Stripe client ID is not configured' }, { status: 500 });
  }

  const state = crypto.randomUUID();
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 5 * 60,
  });

  const redirectUri = `${APP_URL}${CALLBACK_PATH}`;
  const url = new URL('https://connect.stripe.com/oauth/authorize');
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', STRIPE_CLIENT_ID);
  url.searchParams.set('scope', 'read_write');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('state', state);
  if (user.email) {
    url.searchParams.set('stripe_user[email]', user.email);
  }
  if (user.companyName) {
    url.searchParams.set('stripe_user[business_name]', user.companyName);
  }

  return NextResponse.json({ url: url.toString() });
}
