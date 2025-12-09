import Stripe from 'stripe';
import { prisma } from '@/lib/prisma';
import { sendTrialReminderEmail } from '@/lib/email';
import type { User } from '@prisma/client';

const DAY_MS = 1000 * 60 * 60 * 24;
export const TRIAL_LENGTH_MS = 30 * DAY_MS;
const GRACE_LENGTH_MS = 7 * DAY_MS;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeClient = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2024-06-20' }) : null;
const stripeInactiveStatuses = new Set(['canceled', 'incomplete', 'incomplete_expired', 'unpaid']);

type StripeSubscriptionCheck = { active: boolean; error?: string };

const hasActiveStripeSubscription = async (subscriptionId?: string | null): Promise<StripeSubscriptionCheck> => {
  if (!subscriptionId) return { active: false };
  if (subscriptionId === 'ALWAYS') return { active: true };
  if (!stripeClient) return { active: false, error: 'Stripe secret key is not configured' };
  try {
    const subscription = await stripeClient.subscriptions.retrieve(subscriptionId);
    if (!subscription) return { active: false, error: 'Subscription not found' };
    if (stripeInactiveStatuses.has(subscription.status)) {
      return { active: false, error: `Subscription status is ${subscription.status}` };
    }
    if (subscription.cancel_at && subscription.cancel_at * 1000 <= Date.now()) {
      return { active: false, error: 'Subscription is scheduled to cancel or already canceled' };
    }
    return { active: true };
  } catch (error: any) {
    const message = error instanceof Error ? error.message : 'Unknown Stripe error';
    console.error('Stripe subscription check failed:', message);
    return { active: false, error: message };
  }
};

export type PlanTier = 'FREE' | 'PRO' | 'PRO_TRIAL';

export type CurrentPlan = {
  planTier: PlanTier;
  effectiveTier: 'FREE' | 'PRO';
  isTrialActive: boolean;
  isInGracePeriod: boolean;
  trialEndsAt?: Date;
  graceEndsAt?: Date;
};

const normalizePlanTier = (tier?: string): PlanTier => {
  if (!tier) return 'FREE';
  const upper = tier.toUpperCase();
  if (upper === 'PRO') return 'PRO';
  if (upper === 'PRO_TRIAL') return 'PRO_TRIAL';
  return 'FREE';
};

const archiveExcessClients = async (userId: string) => {
  const clients = await prisma.client.findMany({
    where: { userId, archived: false },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  });

  if (clients.length <= 3) return;
  const toArchive = clients.slice(3).map((client) => client.id);
  await prisma.client.updateMany({
    where: { id: { in: toArchive } },
    data: { archived: true },
  });
};

export async function ensureTrialState(user: User) {
  const now = Date.now();
  const planTier = normalizePlanTier(user.planTier);

  if (planTier === 'PRO') {
    const { active: subscriptionIsActive, error } = await hasActiveStripeSubscription(user.stripeSubscriptionId);
    if (!subscriptionIsActive) {
      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          planTier: 'FREE',
          stripeSubscriptionId: null,
        },
      });
      return {
        ...updated,
        stripeSubscriptionCheckError: error ?? 'Stripe subscription is no longer active',
      } as User & { stripeSubscriptionCheckError?: string };
    }
    if (error) {
      return {
        ...user,
        stripeSubscriptionCheckError: error,
      } as User & { stripeSubscriptionCheckError?: string };
    }
    return user;
  }

  if (planTier !== 'PRO_TRIAL' || !user.proTrialEndsAt) {
    return user;
  }

  const trialEndsAt = user.proTrialEndsAt;
  const graceEndsAt = new Date(trialEndsAt.getTime() + GRACE_LENGTH_MS);

  if (now > graceEndsAt.getTime()) {
    await archiveExcessClients(user.id);
    return prisma.user.update({
      where: { id: user.id },
      data: {
        planTier: 'FREE',
        proTrialEndsAt: null,
        proTrialReminderSent: false,
      },
    });
  }

  if (
    !user.proTrialReminderSent &&
    now >= trialEndsAt.getTime() &&
    now <= graceEndsAt.getTime() &&
    user.email
  ) {
    await sendTrialReminderEmail(user.email);
    return prisma.user.update({
      where: { id: user.id },
      data: { proTrialReminderSent: true },
    });
  }

  return user;
}

export function describePlan(user: User): CurrentPlan {
  const planTier = normalizePlanTier(user.planTier);
  const now = Date.now();
  const trialEndsAt = user.proTrialEndsAt ? new Date(user.proTrialEndsAt) : undefined;
  const graceEndsAt = trialEndsAt ? new Date(trialEndsAt.getTime() + GRACE_LENGTH_MS) : undefined;
  const isTrialActive =
    planTier === 'PRO_TRIAL' && trialEndsAt !== undefined && now < trialEndsAt.getTime();
  const isInGracePeriod =
    planTier === 'PRO_TRIAL' &&
    trialEndsAt !== undefined &&
    graceEndsAt !== undefined &&
    now >= trialEndsAt.getTime() &&
    now < graceEndsAt.getTime();
  const effectiveTier = planTier === 'PRO' || planTier === 'PRO_TRIAL' ? 'PRO' : 'FREE';

  return {
    planTier,
    effectiveTier,
    isTrialActive,
    isInGracePeriod,
    trialEndsAt,
    graceEndsAt,
  };
}
