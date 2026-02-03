// src/app/dashboard/settings/page.tsx
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { describePlan } from '@/lib/plan';
import { UpgradeCard } from '../profile/UpgradeCard';
import { getAvailabilityForUser } from '../scheduling/actions';
import { buildBookingLink, normalizeSlug } from '../scheduling/helpers';
import prisma from '@/lib/prisma';
import SettingsTabsWrapper from './SettingsTabsWrapper';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const user = await getCurrentUser();
  return {
    title: 'Settings',
    icons: {
      icon: user?.logoDataUrl ?? '/favicon.ico',
    },
  };
}

export default async function SettingsPage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const user = await getCurrentUser();
  if (!user) {
    redirect('/');
  }
  const plan = describePlan(user);
  const upgradeParam = params.upgrade;
  const sessionParam = params.session_id;
  const tabParam = params.tab;
  const upgradeStatus = Array.isArray(upgradeParam) ? upgradeParam[0] ?? null : upgradeParam ?? null;
  const sessionId = Array.isArray(sessionParam) ? sessionParam[0] ?? null : sessionParam ?? null;
  const resolvedTabParam = Array.isArray(tabParam) ? tabParam[0] ?? null : tabParam ?? null;
  const initialTabLabel = typeof resolvedTabParam === 'string' ? resolvedTabParam : undefined;
  const companySettingsKey = `${user.company?.name ?? user.companyName ?? 'company'}|${user.company?.website ?? ''}`;

  const availability = await getAvailabilityForUser(user.id);
  const slug = normalizeSlug(user.name ?? user.companyName ?? user.email);
  const bookingLink = slug ? buildBookingLink(slug) : null;
  const stripeAccountId = user.company?.stripeAccountId ?? user.stripeAccountId ?? null;
  let initialStripeWebhookSecret: string | null = null;
  if (stripeAccountId) {
    const endpoint = await prisma.stripeWebhookEndpoint.findUnique({
      where: { accountId: stripeAccountId },
    });
    initialStripeWebhookSecret = endpoint?.signingSecret ?? null;
  }
  const stripeAccountType = user.company?.stripeAccountType ?? null;
  const stripeWebhookMode = user.company?.stripeWebhookMode ?? null;
  const stripeWebhookStatus = user.company?.stripeWebhookStatus ?? null;
  const stripeWebhookLastError = user.company?.stripeWebhookLastError ?? null;
  const storedSecretExists = Boolean(initialStripeWebhookSecret);
  const shouldShowManualStripeWebhookWarning =
    stripeWebhookMode === 'manual' || (!stripeWebhookMode && !storedSecretExists);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="px-4 sm:px-0">
        <h1 className="text-3xl font-semibold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500">Update your company profile, billing, and branding details here.</p>
      </div>

      <UpgradeCard currentPlan={plan} upgradeStatus={upgradeStatus} sessionId={sessionId} />

      {/* Tabbed settings UX */}
      <SettingsTabsWrapper
        user={user}
        company={user.company}
        availability={availability}
        bookingLink={bookingLink}
        shouldShowManualStripeWebhookWarning={shouldShowManualStripeWebhookWarning}
        initialStripeWebhookSecret={initialStripeWebhookSecret}
        stripeWebhookStatus={stripeWebhookStatus}
        stripeWebhookLastError={stripeWebhookLastError}
        initialTabLabel={initialTabLabel}
      />

    </div>
  );
}
