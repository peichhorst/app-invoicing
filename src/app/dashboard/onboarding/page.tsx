import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import CompanySettings from '../(with-shell)/profile/CompanySettings';
import { getCurrentUser } from '@/lib/auth';

export const metadata: Metadata = {
  title: 'Business Onboarding',
};

export default async function DashboardOnboardingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth');
  }
  const company = user.company;
  if (!company) {
    redirect('/dashboard');
  }
  if (company.isOnboarded) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2 rounded-3xl border border-purple-100 bg-white/80 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-600">Welcome aboard to ClientWave!</p>
          <h1 className="text-3xl font-semibold text-zinc-900">Finish setting up your workspace</h1>
          <p className="text-sm text-zinc-600">
            Before getting started, we just need a few details.
          </p>
        </div>

        {(() => {
          const userName = user.name?.trim() || '';
          const email = user.email?.trim() || '';
          const emailLocal = email.split('@')[0] || '';
          const shouldPrefillName =
            Boolean(userName) &&
            userName.toLowerCase() !== email.toLowerCase() &&
            userName.toLowerCase() !== emailLocal.toLowerCase();
          const initialUserName = shouldPrefillName ? userName : null;
          const positionLabel =
            user.positionCustom?.name ??
            (user.position ? user.position.toLowerCase().replace(/_/g, ' ') : 'Owner');
          return (
            <CompanySettings
              key={`${company.id}-${company.updatedAt.toISOString()}`}
              initialName={company.name}
              initialUserName={initialUserName}
              initialPositionName={positionLabel}
              initialWebsite={company.website ?? null}
              initialLogoUrl={company.logoUrl ?? null}
              initialPhone={company.phone ?? null}
              initialEmail={user.email ?? company.email ?? null}
              initialStripeAccountId={company.stripeAccountId ?? null}
              initialStripePublishableKey={company.stripePublishableKey ?? null}
              initialVenmoHandle={company.venmoHandle ?? null}
              initialZelleHandle={company.zelleHandle ?? null}
              initialMailToAddressEnabled={company.mailToAddressEnabled ?? null}
              initialMailToAddressTo={company.mailToAddressTo ?? null}
              initialTrackdriveToken={company.trackdriveLeadToken ?? null}
              initialTrackdriveEnabled={company.trackdriveLeadEnabled ?? null}
              initialAddress={{
                addressLine1: company.addressLine1 ?? null,
                addressLine2: company.addressLine2 ?? null,
                city: company.city ?? null,
                state: company.state ?? null,
                postalCode: company.postalCode ?? null,
                country: company.country ?? null,
              }}
              role={user.role}
              onboardingMode
            />
          );
        })()}
      </div>
    </div>
  );
}
