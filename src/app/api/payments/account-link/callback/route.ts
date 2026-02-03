// src/app/api/payments/account-link/callback/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { stripeConnect } from '@/lib/stripe-connect';
import { ensureStripeWebhookForAccount } from '@/lib/stripe-webhook-endpoints';
import type Stripe from 'stripe';
import type { Prisma } from '@prisma/client';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.clientwave.app').replace(/\/$/, '');
const STATE_COOKIE = 'stripe_oauth_state';
const RETURN_URL_COOKIE = 'stripe_return_url';
const TOKEN_URL = 'https://connect.stripe.com/oauth/token';

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderPage = (
  message: string,
  success = false,
  tokenData?: { stripe_user_id?: string; stripe_publishable_key?: string },
  appUrl: string = APP_URL,
  returnUrl: string = '/dashboard/settings'
) => {
  const accountId = tokenData?.stripe_user_id ?? null;
  const publishableKey = tokenData?.stripe_publishable_key ?? null;
  const script = success
    ? `<script>
        const payload = {
          type: 'stripe-connected',
          payload: {
            accountId: ${JSON.stringify(accountId)},
            publishableKey: ${JSON.stringify(publishableKey)}
          }
        };
        if (window.opener) {
          window.opener.postMessage(payload, window.location.origin);
        }
        const profileUrl = '${appUrl}${returnUrl}';
        setTimeout(() => {
          if (window.opener) {
            window.opener.location.replace(profileUrl);
            window.close();
          } else {
            window.location.replace(profileUrl);
          }
        }, 1500);
      </script>`
    : '';

  const body = `
    <!doctype html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Stripe Connect</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          body {
            font-family: system-ui,-apple-system,Segoe UI,Roboto,sans-serif;
            background: #111827;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            padding: 24px;
            text-align: center;
          }
          .panel {
            background: rgba(17, 24, 39, 0.85);
            border: 1px solid rgba(255,255,255,0.2);
            border-radius: 16px;
            padding: 32px;
            max-width: 420px;
            box-shadow: 0 20px 60px rgba(15, 23, 42, 0.6);
          }
          a {
            color: #1d4ed8;
            text-decoration: underline;
          }
        </style>
      </head>
      <body>
        <div class="panel">
          <h1>${success ? 'Connected!' : 'Stripe Connect'}</h1>
          <p>${escapeHtml(message)}</p>
          ${success ? '<p>Closing this window now.</p>' : '<p><a href="/dashboard/settings">Return to settings</a> once you close this tab.</p>'}
        </div>
        ${script}
      </body>
    </html>`;

  return new NextResponse(body, { headers: { 'Content-Type': 'text/html' } });
};

export async function GET(request: NextRequest) {
  const host = request.headers.get('host')?.toLowerCase() ?? '';
  const appUrl = host.startsWith('localhost') ? 'http://localhost:3000' : APP_URL;
  const url = new URL(request.url);
  const params = url.searchParams;
  const code = params.get('code');
  const error = params.get('error');
  const errorDescription = params.get('error_description');
  const state = params.get('state');

  const cookieStore = await cookies();
  const storedState = cookieStore.get(STATE_COOKIE)?.value;
  const returnUrl = cookieStore.get(RETURN_URL_COOKIE)?.value || '/dashboard/settings';
  cookieStore.delete(STATE_COOKIE);
  cookieStore.delete(RETURN_URL_COOKIE);

  if (error) {
    const message = errorDescription ?? 'Stripe authentication was canceled.';
    return renderPage(message, false, undefined, appUrl, returnUrl);
  }

  if (!code) {
    return renderPage('Missing authorization code from Stripe.', false, undefined, appUrl, returnUrl);
  }

  if (!state || !storedState || state !== storedState) {
    return renderPage('Stripe returned an invalid session state.', false, undefined, appUrl, returnUrl);
  }

  if (!STRIPE_SECRET_KEY) {
    return renderPage('Stripe secret key is not configured.', false, undefined, appUrl, returnUrl);
  }

  try {
    const tokenResponse = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_secret: STRIPE_SECRET_KEY,
      }).toString(),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.stripe_user_id) {
      const message =
        tokenData.error_description ?? tokenData.error ?? 'Unable to exchange code for Stripe account.';
      return renderPage(message, false, undefined, appUrl, returnUrl);
    }

    const user = await getCurrentUser();
    if (!user) {
      return renderPage('Unauthenticated session. Please sign in and try again.', false, undefined, appUrl, returnUrl);
    }

    const stripeAccountId = tokenData.stripe_user_id;
    const publishableKeyUpdate = tokenData.stripe_publishable_key ?? undefined;

    let accountType: Stripe.Account['type'] | null = null;
    let retrievedAccount: Stripe.Account | null = null;
    let webhookMode: 'platform_managed' | 'manual' | null = null;
    let webhookStatus: 'verified' | 'pending' | 'error' | null = null;
    let webhookLastError: string | null = null;

    try {
      retrievedAccount = await stripeConnect.accounts.retrieve(stripeAccountId);
      accountType = retrievedAccount?.type ?? null;
      if (accountType === 'standard') {
        webhookMode = 'manual';
        webhookStatus = 'pending';
      } else if (accountType) {
        webhookMode = 'platform_managed';
        try {
          const result = await ensureStripeWebhookForAccount(stripeAccountId, {
            account: retrievedAccount,
            companyId: user.companyId ?? null,
          });
          webhookStatus = result.signingSecret ? 'verified' : 'error';
          if (!result.signingSecret) {
            webhookLastError = 'Stripe webhook endpoint did not return a signing secret.';
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unknown error creating webhook endpoint.';
          webhookStatus = 'error';
          webhookLastError = message;
          console.error('Stripe webhook registration failed', {
            stripeAccountId,
            companyId: user.companyId,
            message,
          });
        }
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to retrieve the Stripe account type.';
      console.error('Failed to read Stripe account type during Stripe Connect callback', {
        stripeAccountId,
        companyId: user.companyId,
        message,
      });
    }

    const updates: Prisma.PrismaPromise<unknown>[] = [
      prisma.user.update({
        where: { id: user.id },
        data: {
          stripeAccountId,
          ...(publishableKeyUpdate !== undefined ? { stripePublishableKey: publishableKeyUpdate } : {}),
        },
      }),
    ];

    if (user.companyId) {
      const companyData: Prisma.CompanyUpdateInput = {
        stripeAccountId,
        ...(publishableKeyUpdate !== undefined ? { stripePublishableKey: publishableKeyUpdate } : {}),
      };
      if (accountType === 'standard' || accountType === 'express' || accountType === 'custom') {
        companyData.stripeAccountType = accountType;
      }
      if (webhookMode) {
        companyData.stripeWebhookMode = webhookMode;
      }
      if (webhookStatus) {
        companyData.stripeWebhookStatus = webhookStatus;
      }
      if (webhookMode || webhookStatus) {
        companyData.stripeWebhookLastError = webhookLastError ?? null;
      }
      updates.push(
        prisma.company.update({
          where: { id: user.companyId },
          data: companyData,
        }),
      );
    }

    await prisma.$transaction(updates);

    return renderPage('Stripe account linked! This window will close shortly.', true, tokenData, appUrl, returnUrl);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error connecting to Stripe.';
    console.error('Stripe OAuth callback failed', message);
    return renderPage('Unable to complete the Stripe connection.', false, undefined, appUrl, '/dashboard/settings');
  }
}
