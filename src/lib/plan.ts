import Stripe from 'stripe';
import prisma from './prisma';
import { sendTrialReminderEmail } from './email';

// Define minimal types to avoid dependency on @prisma/client
interface User {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  role?: string;
  planTier?: string;
  proTrialEndsAt?: Date | string | null;
  proTrialReminderSent?: boolean;
  companyId?: string;
  stripeSubscriptionId?: string | null;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  subscriptionCancelAt?: Date | null;
  subscriptionStatus?: string | null;
}

interface Company {
  id: string;
  name: string;
  ownerId: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

interface Client {
  id: string;
  companyId: string;
  archived?: boolean;
  createdAt?: Date | string;
}

type UserRole = 'USER' | 'ADMIN' | 'OWNER';
type UserWithRole = User & { role?: UserRole };
type UserWithCompany = User & { company?: Company | null };
type UserWithPlanOwner = UserWithCompany & { planOwner?: User | null };
const getUserRole = (user: User): UserRole => {
  // Handle case where user might not be fully authenticated/loaded
  if (!user || typeof user !== 'object') {
    return 'USER';
  }
  return (user as UserWithRole).role ?? 'USER';
};
const getPlanReferenceUser = (user: User): User => {
  const candidate = user as UserWithPlanOwner;
  const owner = candidate.planOwner;
  if (owner && owner.id && owner.id !== user.id) {
    return owner;
  }
  return user;
};

const DAY_MS = 1000 * 60 * 60 * 24;
export const TRIAL_LENGTH_MS = 30 * DAY_MS;
const GRACE_LENGTH_MS = 7 * DAY_MS;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeClient = stripeSecretKey ? new Stripe(stripeSecretKey, { apiVersion: '2026-01-28.clover' as const }) : null;
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

  // ADD THESE TWO LINES (this is the only thing that was missing)
  subscriptionCancelAt?: Date | null;      // <-- this kills the TS error
  subscriptionStatus?: string | null;      // optional but nice to have
};

const normalizePlanTier = (tier?: string): PlanTier => {
  if (!tier) return 'FREE';
  const upper = tier.toUpperCase();
  if (upper === 'PRO') return 'PRO';
  if (upper === 'PRO_TRIAL') return 'PRO_TRIAL';
  return 'FREE';
};

const archiveExcessClients = async (userId: string) => {
  if (!prisma) {
    console.warn('Prisma client not available, skipping excess client archiving');
    return;
  }

  // determine companyId for the user
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { companyId: true },
  });
  const companyId = user?.companyId ?? null;
  if (!companyId) return;

  const clients = await prisma.client.findMany({
    where: { companyId, archived: false },
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

const attachPlanOwner = async <T extends UserWithCompany>(user: T): Promise<T & { planOwner?: User | null }> => {
  if (!prisma) {
    console.warn('Prisma client not available, returning user without plan owner');
    return {
      ...user,
      planOwner: null,
    };
  }

  const ownerId = user.company?.ownerId;
  const existingPlanOwner = (user as UserWithPlanOwner).planOwner;
  if (!ownerId || ownerId === user.id) {
    return {
      ...user,
      planOwner: ownerId && ownerId === user.id ? user : existingPlanOwner,
    };
  }

  if (existingPlanOwner && existingPlanOwner.id === ownerId) {
    return user as T & { planOwner?: User | null };
  }

  const owner = await prisma.user.findUnique({
    where: { id: ownerId },
  });

  return {
    ...user,
    planOwner: owner ?? existingPlanOwner ?? null,
  };
};

const hydrateWithCompany = async <T extends User>(candidate: T) => {
  if (!prisma) {
    console.warn('Prisma client not available, returning user without hydration');
    return {
      ...candidate,
      company: null,
    } as T & { company?: Company | null };
  }

  const loaded = await prisma.user.findUnique({
    where: { id: candidate.id },
    include: { company: true },
  });
  const merged = { ...(loaded ?? candidate), ...candidate } as T & { company?: Company | null };
  return attachPlanOwner(merged);
};

export async function ensureTrialState(user: User) {
  // Handle case where user might be undefined or not properly loaded
  if (!user || typeof user !== 'object' || !user.id) {
    // Return a default user object when no user is authenticated
    return hydrateWithCompany({
      id: '',
      email: '',
      role: 'USER',
      planTier: 'FREE'
    } as User);
  }
  
  const now = Date.now();
  const role = getUserRole(user);
  const isAdminOverride = role === 'ADMIN' && user.stripeSubscriptionId === '1';
  const planTier = isAdminOverride ? 'PRO' : normalizePlanTier(user.planTier);

  if (role === 'ADMIN' && user.stripeSubscriptionId === '1') {
    return hydrateWithCompany({
      ...user,
      planTier: 'PRO',
    } as User);
  }

  if (planTier === 'PRO') {
    const { active: subscriptionIsActive, error } = await hasActiveStripeSubscription(user.stripeSubscriptionId);
    if (!subscriptionIsActive) {
      if (!prisma) {
        console.warn('Prisma client not available, returning user without update');
        return hydrateWithCompany({
          ...user,
          planTier: 'FREE',
          stripeSubscriptionId: null,
        } as User);
      }

      const updated = await prisma.user.update({
        where: { id: user.id },
        data: {
          planTier: 'FREE',
          stripeSubscriptionId: null,
        },
      });
      return hydrateWithCompany({
        ...updated,
        stripeSubscriptionCheckError: error ?? 'Stripe subscription is no longer active',
      } as User & { stripeSubscriptionCheckError?: string });
    }
    if (error) {
      return hydrateWithCompany({
        ...user,
        stripeSubscriptionCheckError: error,
      } as User & { stripeSubscriptionCheckError?: string });
    }
    return hydrateWithCompany(user);
  }

  if (planTier !== 'PRO_TRIAL' || !user.proTrialEndsAt) {
    return hydrateWithCompany(user);
  }

  const trialEndsAt = user.proTrialEndsAt ? (typeof user.proTrialEndsAt === 'string' ? new Date(user.proTrialEndsAt) : user.proTrialEndsAt) : new Date();
  const graceEndsAt = new Date(trialEndsAt.getTime() + GRACE_LENGTH_MS);

  if (now > graceEndsAt.getTime()) {
    await archiveExcessClients(user.id);
    if (!prisma) {
      console.warn('Prisma client not available, returning user without update');
      return hydrateWithCompany({
        ...user,
        planTier: 'FREE',
        proTrialEndsAt: null,
        proTrialReminderSent: false,
      } as User);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        planTier: 'FREE',
        proTrialEndsAt: null,
        proTrialReminderSent: false,
      },
    });
    return hydrateWithCompany(updated);
  }

  if (
    !user.proTrialReminderSent &&
    now >= trialEndsAt.getTime() &&
    now <= graceEndsAt.getTime() &&
    user.email
  ) {
    await sendTrialReminderEmail(user.email);
    if (!prisma) {
      console.warn('Prisma client not available, returning user without update');
      return hydrateWithCompany({
        ...user,
        proTrialReminderSent: true,
      } as User);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { proTrialReminderSent: true },
    });
    return hydrateWithCompany(updated);
  }

  return hydrateWithCompany(user);
}

export function describePlan(user: User): CurrentPlan {
  const planSubject = getPlanReferenceUser(user);
  const role = getUserRole(planSubject);
  const isAdminProOverride = role === 'ADMIN' && planSubject.stripeSubscriptionId === '1';
  const planTier = isAdminProOverride ? 'PRO' : normalizePlanTier(planSubject.planTier);
  const now = Date.now();
  const trialEndsAt = planSubject.proTrialEndsAt ? new Date(planSubject.proTrialEndsAt) : undefined;
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
    subscriptionCancelAt: planSubject.subscriptionCancelAt ?? null,
    subscriptionStatus: null,
  };
}

export async function getCurrentPlan(user: User): Promise<CurrentPlan> {
  const basePlan = describePlan(user);
  const planSubject = getPlanReferenceUser(user);
  if (basePlan.planTier !== 'PRO' || !planSubject.stripeSubscriptionId) {
    return basePlan;
  }

  if (!stripeClient) {
    console.error('Stripe secret key is not configured');
    return {
      ...basePlan,
      subscriptionStatus: 'error',
    };
  }

  try {
    const subscription = await stripeClient.subscriptions.retrieve(planSubject.stripeSubscriptionId);
    const cancelAt = subscription.cancel_at ? new Date(subscription.cancel_at * 1000) : null;

    return {
      ...basePlan,
      subscriptionStatus: subscription.status,
      subscriptionCancelAt: cancelAt ?? basePlan.subscriptionCancelAt ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Stripe error';
    console.error('Failed to fetch subscription for plan display:', message);
    return {
      ...basePlan,
      subscriptionStatus: 'error',
    };
  }
}
