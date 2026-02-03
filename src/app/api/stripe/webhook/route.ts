import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { handleStripeEvent } from '@/lib/stripe-webhooks';
import { sendWebhookLogEmail } from '@/lib/webhook-logger';
import { getStripeWebhookSecret } from '@/lib/stripe-webhook-endpoints';
import prisma from '@/lib/prisma';

export async function GET() {
  return new NextResponse("Webhook route is active and reachable via GET!", { status: 200 });
}

export async function POST(req: NextRequest) {
  const accountId =
    req.headers.get('stripe-account') ??
    req.headers.get('Stripe-Account') ??
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

  let webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? null;
  if (accountId && companyMode) {
    const accountSecret = await getStripeWebhookSecret(accountId);
    if (accountSecret) {
      webhookSecret = accountSecret;
    } else {
      const status = companyMode === 'manual' ? 'pending' : 'error';
      const message = 'No webhook signing secret has been stored for this Stripe account.';
      await setWebhookStatus(status, message);
      await sendWebhookLogEmail('Stripe Webhook Error: Missing Secret', `${message}\nAccount: ${accountId}`);
      console.error('Stripe webhook error: missing secret.', { accountId, companyId, mode: companyMode });
      return NextResponse.json({ error: 'Config error' }, { status: 500 });
    }
  }

  if (!webhookSecret) {
    await sendWebhookLogEmail('Stripe Webhook Error: Missing Secret', 'Missing STRIPE_WEBHOOK_SECRET');
    console.error('Stripe webhook error: missing secret.', { accountId });
    return NextResponse.json({ error: 'Config error' }, { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  const payload = await req.text();

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
    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
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
