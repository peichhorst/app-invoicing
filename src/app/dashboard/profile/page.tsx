// src/app/dashboard/profile/page.tsx
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { ProfileForm } from './ProfileForm';
import { UpgradeCard } from './UpgradeCard';
import { describePlan } from '@/lib/plan';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function ProfilePage({ searchParams }: PageProps) {
  const params = (await searchParams) ?? {};
  const user = await getCurrentUser();
  if (!user) redirect('/');
  const plan = describePlan(user);
  const upgradeParam = params.upgrade;
  const sessionParam = params.session_id;
  const upgradeStatus = Array.isArray(upgradeParam) ? upgradeParam[0] ?? null : upgradeParam ?? null;
  const sessionId = Array.isArray(sessionParam) ? sessionParam[0] ?? null : sessionParam ?? null;
  const isPro = plan.effectiveTier === 'PRO';

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="px-4 sm:px-0">
          <h1 className="text-3xl font-semibold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-500">Update your account profile, invoice details, and lead tracking here.</p>
        </div>

        <UpgradeCard
          currentPlan={plan}
          subscriptionId={(user as any).stripeSubscriptionId ?? null}
          upgradeStatus={upgradeStatus}
          sessionId={sessionId}
        />

        <ProfileForm
          initial={{
            name: user.name,
            email: user.email,
            companyName: user.companyName,
          logoDataUrl: user.logoDataUrl,
          phone: user.phone,
          addressLine1: user.addressLine1,
          addressLine2: user.addressLine2,
          city: user.city,
          state: user.state,
          postalCode: user.postalCode,
          country: user.country,
          stripeAccountId: user.stripeAccountId,
          stripePublishableKey: user.stripePublishableKey,
          venmoHandle: user.venmoHandle,
          zelleHandle: user.zelleHandle,
          mailToAddressEnabled: user.mailToAddressEnabled,
          mailToAddressTo: user.mailToAddressTo,
          trackdriveLeadToken: user.trackdriveLeadToken,
          trackdriveLeadEnabled: user.trackdriveLeadEnabled,
        }}
        canAcceptPayments={isPro}
      />
      </div>
    </div>
  );
}
