import prisma from '@/lib/prisma';
import { stripeConnect } from '@/lib/stripe-connect';
import type Stripe from 'stripe';

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.clientwave.app').replace(/\/$/, '');
const WEBHOOK_URL = `${APP_URL}/api/stripe/webhook`;
const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
  'checkout.session.completed',
  'checkout.session.async_payment_failed',
  'payment_intent.succeeded',
  'payment_intent.payment_failed',
  'payment_intent.canceled',
  'checkout.session.expired',
  'charge.refunded',
  'refund.updated',
  'charge.refund.updated',
  'invoice.payment_succeeded',
];

type EnsureStripeWebhookResult = {
  endpointId: string | null;
  signingSecret: string | null;
  platformManaged: boolean;
};

type EnsureStripeWebhookOptions = {
  account?: Stripe.Account;
  companyId?: string | null;
};

async function createStripeWebhook(accountId: string) {
  return await stripeConnect.webhookEndpoints.create(
    {
      url: WEBHOOK_URL,
      enabled_events: WEBHOOK_EVENTS,
    },
    { stripeAccount: accountId }
  );
}

function logContext(message: string, context: { accountId: string; companyId?: string | null }) {
  const payload = { accountId: context.accountId };
  if (context.companyId) {
    (payload as any).companyId = context.companyId;
  }
  console.error(message, payload);
}

export async function ensureStripeWebhookForAccount(
  accountId: string,
  options?: EnsureStripeWebhookOptions
): Promise<EnsureStripeWebhookResult> {
  if (APP_URL.startsWith('http://localhost')) {
    console.info('Skipping webhook registration because APP_URL points to localhost', { appUrl: APP_URL });
    return { endpointId: null, signingSecret: null, platformManaged: false };
  }

  const account = options?.account ?? (await stripeConnect.accounts.retrieve(accountId));
  if (account.type === 'standard') {
    console.info('Skipping webhook registration for standard connected account', {
      accountId,
      companyId: options?.companyId,
    });
    return { endpointId: null, signingSecret: null, platformManaged: false };
  }

  let endpoint: Stripe.WebhookEndpoint | null = null;
  const existing = await prisma.stripeWebhookEndpoint.findUnique({ where: { accountId } });

  if (existing?.endpointId) {
    try {
      endpoint = await stripeConnect.webhookEndpoints.retrieve(existing.endpointId, {
        stripeAccount: accountId,
      });
    } catch (error: any) {
      logContext('Failed to retrieve Stripe webhook endpoint', { accountId, companyId: options?.companyId });
      console.error('Stripe webhook retrieval error', {
        accountId,
        companyId: options?.companyId,
        error: error?.message ?? error,
      });
    }
  }

  if (!endpoint) {
    endpoint = await createStripeWebhook(accountId);
  }

  if (!endpoint.secret) {
    logContext('Stripe webhook endpoint did not return a signing secret', {
      accountId,
      companyId: options?.companyId,
    });
    throw new Error('Stripe webhook endpoint did not return a signing secret');
  }

  await prisma.stripeWebhookEndpoint.upsert({
    where: { accountId },
    update: {
      endpointId: endpoint.id,
      signingSecret: endpoint.secret,
    },
    create: {
      accountId,
      endpointId: endpoint.id,
      signingSecret: endpoint.secret,
    },
  });

  return { endpointId: endpoint.id, signingSecret: endpoint.secret, platformManaged: true };
}

export async function getStripeWebhookSecret(accountId: string) {
  const record = await prisma.stripeWebhookEndpoint.findUnique({ where: { accountId } });
  return record?.signingSecret ?? null;
}
