// src/app/dashboard/settings/page.tsx
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { describePlan } from '@/lib/plan';
import { UpgradeCard } from '../profile/UpgradeCard';
import CompanySettings from '../profile/CompanySettings';

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export async function generateMetadata(): Promise<Metadata> {
  const user = await getCurrentUser();
  return {
    title: 'Business settings',
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
  if (user.role !== 'OWNER') {
    redirect('/dashboard');
  }
  const plan = describePlan(user);
  const upgradeParam = params.upgrade;
  const sessionParam = params.session_id;
  const upgradeStatus = Array.isArray(upgradeParam) ? upgradeParam[0] ?? null : upgradeParam ?? null;
  const sessionId = Array.isArray(sessionParam) ? sessionParam[0] ?? null : sessionParam ?? null;
  const companySettingsKey = `${user.company?.name ?? user.companyName ?? 'company'}|${user.company?.website ?? ''}`;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="px-4 sm:px-0">
          <h1 className="text-3xl font-semibold text-gray-900">Business settings</h1>
          <p className="text-sm text-gray-500">Update your company profile, billing, and branding details here.</p>
        </div>

        <UpgradeCard currentPlan={plan} upgradeStatus={upgradeStatus} sessionId={sessionId} />

        <CompanySettings
          key={companySettingsKey}
          initialName={user.company?.name ?? user.companyName}
          initialWebsite={user.company?.website ?? null}
          initialLogoUrl={user.company?.logoUrl ?? user.logoDataUrl ?? null}
          initialPhone={user.company?.phone ?? null}
          initialEmail={user.company?.email ?? null}
          initialStripeAccountId={user.company?.stripeAccountId ?? null}
          initialStripePublishableKey={user.company?.stripePublishableKey ?? null}
          initialVenmoHandle={user.company?.venmoHandle ?? null}
          initialZelleHandle={user.company?.zelleHandle ?? null}
          initialMailToAddressEnabled={user.company?.mailToAddressEnabled ?? null}
          initialMailToAddressTo={user.company?.mailToAddressTo ?? null}
          initialTrackdriveToken={user.company?.trackdriveLeadToken ?? null}
          initialTrackdriveEnabled={user.company?.trackdriveLeadEnabled ?? null}
          initialAddress={{
            addressLine1: user.company?.addressLine1 ?? null,
            addressLine2: user.company?.addressLine2 ?? null,
            city: user.company?.city ?? null,
            state: user.company?.state ?? null,
            postalCode: user.company?.postalCode ?? null,
            country: user.company?.country ?? null,
          }}
          role={user.role}
        />
      </div>
    </div>
  );
}
