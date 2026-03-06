import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { ensureStripeWebhookForAccount } from '@/lib/stripe-webhook-endpoints';
import { stripeConnect } from '@/lib/stripe-connect';

export async function POST() {
  const hasPlatformSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role !== 'OWNER' && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Only owners/admins can sync Stripe webhooks' }, { status: 403 });
  }

  const companyId = user.companyId ?? null;
  const company = companyId
    ? await prisma.company.findUnique({
        where: { id: companyId },
        select: { stripeAccountId: true },
      })
    : null;
  const stripeAccountId = company?.stripeAccountId ?? null;

  if (!stripeAccountId) {
    return NextResponse.json({ error: 'Stripe account not connected yet' }, { status: 400 });
  }

  try {
    const account = await stripeConnect.accounts.retrieve(stripeAccountId);
    const accountType = account?.type ?? null;

    if (accountType === 'standard') {
      if (companyId) {
        await prisma.company.update({
          where: { id: companyId },
          data: {
            stripeAccountType: 'standard',
            stripeWebhookMode: 'manual',
            stripeWebhookStatus: 'pending',
            stripeWebhookLastError: null,
          },
        });
      }
      return NextResponse.json(
        {
          error:
            'Standard accounts require manual webhook setup. Add your webhook/signing secret in Stripe settings.',
        },
        { status: 400 },
      );
    }

    const result = await ensureStripeWebhookForAccount(stripeAccountId, {
      account,
      companyId,
    });

    const verifiedWithPlatformSecret =
      result.platformManaged && !result.signingSecret && hasPlatformSecret;
    const isVerified = Boolean(result.signingSecret || verifiedWithPlatformSecret);

    if (companyId) {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          stripeAccountType:
            accountType === 'express' || accountType === 'custom'
              ? accountType
              : undefined,
          stripeWebhookMode: result.platformManaged ? 'platform_managed' : 'manual',
          stripeWebhookStatus: isVerified ? 'verified' : 'pending',
          stripeWebhookLastError: isVerified
            ? null
            : 'Webhook setup did not return a signing secret yet. Retry after Stripe onboarding is complete.',
        },
      });
    }

    return NextResponse.json({
      success: true,
      status: isVerified ? 'verified' : 'pending',
      message: result.signingSecret
        ? 'Webhook signing secret generated and saved.'
        : verifiedWithPlatformSecret
          ? 'Using platform webhook secret for Stripe signature verification.'
          : 'Webhook endpoint created, but signing secret is not available yet.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to sync Stripe webhook';
    const connectedAccountWebhookNotAllowed = message.includes(
      'not permitted to configure webhook endpoints on a connected account'
    );
    if (companyId) {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          stripeWebhookMode: connectedAccountWebhookNotAllowed ? 'manual' : undefined,
          stripeWebhookStatus: connectedAccountWebhookNotAllowed ? 'pending' : 'error',
          stripeWebhookLastError: connectedAccountWebhookNotAllowed
            ? 'Stripe does not allow connected-account webhook endpoints for this account. Use your platform Connect webhook and, if needed, manual webhook secret settings.'
            : message,
        },
      });
    }
    if (connectedAccountWebhookNotAllowed) {
      return NextResponse.json(
        {
          error:
            'Stripe does not allow connected-account webhook endpoints for this account. Your platform webhook can still receive Connect events. If needed, use manual webhook mode.',
        },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
