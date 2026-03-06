import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { handleStripeEvent } from '@/lib/stripe-webhooks';
import { sendWebhookLogEmail } from '@/lib/webhook-logger';
import { getStripeWebhookSecret, listStripeWebhookSecrets } from '@/lib/stripe-webhook-endpoints';
import prisma from '@/lib/prisma';

export async function GET() {
  return new NextResponse("Webhook route is active and reachable via GET!", { status: 200 });
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  let payloadAccountId: string | null = null;
  try {
    const parsed = JSON.parse(payload) as { account?: unknown };
    if (typeof parsed?.account === 'string' && parsed.account.trim()) {
      payloadAccountId = parsed.account.trim();
    }
  } catch {
    // Keep going; signature verification below is the source of truth.
  }

  const accountId =
    req.headers.get('stripe-account') ??
    req.headers.get('Stripe-Account') ??
    payloadAccountId ??
    null;

  let companyMode: 'platform_managed' | 'manual' | null = null;
  let companyId: string | null = null;
  if (accountId) {
    const record = await prisma.company.findFirst({
      where: { stripeAccountId: accountId },
      select: { id: true, stripeWebhookMode: true },
    });
    companyMode = record?.stripeWebhookMode ?? null;
    companyId = record?.id ?? null;
  }

  const setWebhookStatus = async (
    status: 'verified' | 'pending' | 'error',
    message: string | null = null
  ) => {
    if (!companyId) return;
    await prisma.company.update({
      where: { id: companyId },
      data: {
        stripeWebhookStatus: status,
        stripeWebhookLastError: message,
      },
    });
  };

  const webhookSecrets: string[] = [];
  const pushSecret = (value: string | null | undefined) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!webhookSecrets.includes(trimmed)) {
      webhookSecrets.push(trimmed);
    }
  };

  pushSecret(process.env.STRIPE_WEBHOOK_SECRET ?? null);
  if (accountId && companyMode) {
    const accountSecret = await getStripeWebhookSecret(accountId);
    if (accountSecret) {
      pushSecret(accountSecret);
    } else if (companyMode === 'manual') {
      const message = 'No webhook signing secret has been stored for this Stripe account.';
      await setWebhookStatus('pending', message);
      console.error('Stripe webhook warning: missing per-account secret for manual mode.', {
        accountId,
        companyId,
        mode: companyMode,
      });
    } else {
      // platform-managed without per-account secret: fall back to platform Connect webhook secret
      console.info('Falling back to platform webhook secret for connected-account event', {
        accountId,
        companyId,
      });
    }
  }

  if (!accountId) {
    const knownSecrets = await listStripeWebhookSecrets();
    knownSecrets.forEach((secret) => pushSecret(secret));
  }

  if (!webhookSecrets.length) {
    await sendWebhookLogEmail('Stripe Webhook Error: Missing Secret', 'Missing STRIPE_WEBHOOK_SECRET');
    console.error('Stripe webhook error: missing secret.', { accountId });
    return NextResponse.json({ error: 'Config error' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');

  const logMsg = `
Account: ${accountId ?? 'platform'}
Received webhook payload:
${payload}

Received signature:
${signature}
`;

  if (!signature) {
    await sendWebhookLogEmail('Stripe Webhook Error: Missing Signature', logMsg);
    console.error('Stripe webhook error: missing signature.', { accountId, companyId });
    await setWebhookStatus('error', 'Missing Stripe signature header.');
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  try {
    let event = null as Awaited<ReturnType<typeof stripe.webhooks.constructEvent>> | null;
    let lastError: Error | null = null;
    for (const secret of webhookSecrets) {
      try {
        event = stripe.webhooks.constructEvent(payload, signature, secret);
        break;
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error(String(error ?? 'Invalid signature'));
      }
    }
    if (!event) {
      throw lastError ?? new Error('Invalid signature');
    }
    await handleStripeEvent(event);
    await sendWebhookLogEmail('Stripe Webhook Received', logMsg + '\nEvent processed successfully.');
    await setWebhookStatus('verified', null);
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error: any) {
    const message = error?.message ?? 'unknown error';
    await sendWebhookLogEmail(
      'Stripe Webhook Error: Invalid Signature',
      logMsg + `\nError: ${message}`
    );
    console.error('Stripe webhook error: invalid signature', {
      accountId,
      companyId,
      message,
    });
    await setWebhookStatus('error', message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }
}
