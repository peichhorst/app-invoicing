// src/app/api/payments/account-link/route.ts
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { stripeConnect } from '@/lib/stripe-connect';
import { ensureStripeWebhookForAccount } from '@/lib/stripe-webhook-endpoints';

const STRIPE_CLIENT_ID = process.env.STRIPE_CLIENT_ID;
const PLATFORM_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;

const resolveAppUrl = () => {
  return (
    process.env.STRIPE_REDIRECT_BASE ??
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://www.clientwave.app'
  ).replace(/\/$/, '');
};
const CALLBACK_PATH = '/api/payments/account-link/callback';
const STATE_COOKIE = 'stripe_oauth_state';
const RETURN_URL_COOKIE = 'stripe_return_url';

const sanitizeReturnUrl = (value: unknown) => {
  if (typeof value !== 'string') return '/dashboard/settings';
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) return '/dashboard/settings';
  if (trimmed.startsWith('//')) return '/dashboard/settings';
  return trimmed;
};

export async function POST(request: NextRequest) {
  const hasPlatformSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get return URL from request body
    const body = await request.json().catch(() => ({}));
    const returnUrl = sanitizeReturnUrl(body.returnUrl);
    const requestedMode = body.mode === 'standard' ? 'standard' : 'express';
    const appBase = resolveAppUrl();

    if (requestedMode === 'express') {
      if (!user.companyId) {
        return NextResponse.json({ error: 'No company found for user' }, { status: 400 });
      }
      const companyRecord = user.companyId
        ? await prisma.company.findUnique({
            where: { id: user.companyId },
            select: { stripeAccountId: true },
          })
        : null;
      const connectedAccountId = companyRecord?.stripeAccountId ?? null;
      let accountId = connectedAccountId;

      if (!accountId) {
        const account = await stripeConnect.accounts.create({
          type: 'express',
          email: user.email ?? undefined,
          metadata: {
            userId: user.id,
            companyId: user.companyId ?? '',
          },
        });
        accountId = account.id;
      }

      const refreshUrl = `${appBase}${returnUrl}`;
      const returnToUrl = `${appBase}${returnUrl}`;
      const accountLink = await stripeConnect.accountLinks.create({
        account: accountId,
        refresh_url: refreshUrl,
        return_url: returnToUrl,
        type: 'account_onboarding',
      });

      const updates: Promise<unknown>[] = [
        prisma.company.update({
          where: { id: user.companyId },
          data: {
            stripeAccountId: accountId,
            stripeAccountType: 'express',
            ...(PLATFORM_PUBLISHABLE_KEY ? { stripePublishableKey: PLATFORM_PUBLISHABLE_KEY } : {}),
          },
        }),
      ];

      await Promise.all(updates);

      try {
        const account = await stripeConnect.accounts.retrieve(accountId);
        if (account.type !== 'standard') {
          const result = await ensureStripeWebhookForAccount(accountId, {
            account,
            companyId: user.companyId ?? null,
          });
          const verifiedWithPlatformSecret =
            result.platformManaged && !result.signingSecret && hasPlatformSecret;
          const isVerified = Boolean(result.signingSecret || verifiedWithPlatformSecret);
          if (user.companyId) {
            await prisma.company.update({
              where: { id: user.companyId },
              data: {
                stripeWebhookMode: 'platform_managed',
                stripeWebhookStatus: isVerified ? 'verified' : 'pending',
                stripeWebhookLastError: isVerified
                  ? null
                  : 'Stripe webhook endpoint did not return a signing secret.',
              },
            });
          }
        }
      } catch (error) {
        console.error('Stripe Express webhook registration/read failed', error);
      }

      return NextResponse.json({ url: accountLink.url });
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
    
    // Store return URL in cookie
    cookieStore.set(RETURN_URL_COOKIE, returnUrl, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 5 * 60,
    });

    const redirectUri = `${appBase}${CALLBACK_PATH}`;
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
    url.searchParams.set('stripe_user[type]', requestedMode);

    return NextResponse.json({ url: url.toString() });
  } catch (error: unknown) {
    console.error('Stripe account-link POST failed', error);
    const rawMessage = error instanceof Error ? error.message : 'Unexpected error';
    const lossDoc = 'https://dashboard.stripe.com/settings/connect/platform-profile';
    const normalizedMessage = rawMessage.includes(lossDoc)
      ? `Please review the responsibilities of managing losses for connected accounts at ${lossDoc}.`
      : rawMessage;
    return NextResponse.json({ error: normalizedMessage }, { status: 500 });
  }
}
