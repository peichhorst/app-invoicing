'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileForm } from '@/app/dashboard/(with-shell)/profile/ProfileForm';
import CompanySettings from '@/app/dashboard/(with-shell)/profile/CompanySettings';

type OnboardingUser = {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  companyName?: string | null;
  logoDataUrl?: string | null;
  signatureDataUrl?: string | null;
  phone?: string | null;
  stripeAccountId?: string | null;
  stripePublishableKey?: string | null;
  venmoHandle?: string | null;
  zelleHandle?: string | null;
  mailToAddressEnabled?: boolean | null;
  mailToAddressTo?: string | null;
  trackdriveLeadToken?: string | null;
  trackdriveLeadEnabled?: boolean | null;
  reportsToId?: string | null;
  positionId?: string | null;
  company?: {
    id: string;
    name?: string | null;
    website?: string | null;
    logoUrl?: string | null;
    phone?: string | null;
    email?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    primaryColor?: string | null;
    useHeaderLogo?: boolean | null;
    updatedAt?: string | null;
    stripeAccountId?: string | null;
    stripePublishableKey?: string | null;
    venmoHandle?: string | null;
    zelleHandle?: string | null;
    mailToAddressEnabled?: boolean | null;
    mailToAddressTo?: string | null;
    trackdriveLeadToken?: string | null;
    trackdriveLeadEnabled?: boolean | null;
  } | null;
};

type OnboardingWizardProps = {
  user: OnboardingUser;
  showBusiness?: boolean;
  onCompleteHref?: string;
};

export function OnboardingWizard({
  user,
  showBusiness = true,
  onCompleteHref,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [businessPrimaryColor, setBusinessPrimaryColor] = useState<string | null>(
    user.company?.primaryColor ?? null
  );

  useEffect(() => {
    setBusinessPrimaryColor(user.company?.primaryColor ?? null);
  }, [user.company?.primaryColor]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string | null | undefined>).detail;
      if (typeof detail === 'string' && detail.trim()) {
        setBusinessPrimaryColor(detail.trim());
      }
    };
    window.addEventListener('accent-color-updated', handler);
    return () => window.removeEventListener('accent-color-updated', handler);
  }, []);
  const company = user.company;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-700">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`px-4 py-2 rounded-full border transition uppercase ${step === 1 ? 'bg-brand-primary-600 border-transparent text-white' : 'bg-white border border-brand-primary-500 text-brand-primary-700 hover:bg-brand-primary-50'}`}
          aria-current={step === 1 ? 'step' : undefined}
        >
          Profile Details
        </button>
        {showBusiness && (
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`px-4 py-2 rounded-full border transition uppercase ${step === 2 ? 'bg-brand-primary-600 border-transparent text-white' : 'bg-white border border-brand-primary-500 text-brand-primary-700 hover:bg-brand-primary-50'}`}
            aria-current={step === 2 ? 'step' : undefined}
          >
            Business Details
          </button>
        )}
      </div>

      {step === 1 && (
        <div className="rounded-3xl border border-brand-primary-100 bg-white/80 p-6 shadow-sm">
          <ProfileForm
            initial={{
              name: user.name ?? '',
              email: user.email ?? '',
              companyName: user.companyName ?? '',
              logoDataUrl: user.logoDataUrl ?? '',
              signatureDataUrl: user.signatureDataUrl ?? '',
              phone: user.phone ?? '',
              stripeAccountId: user.stripeAccountId ?? '',
              stripePublishableKey: user.stripePublishableKey ?? '',
              venmoHandle: user.venmoHandle ?? '',
              zelleHandle: user.zelleHandle ?? '',
              mailToAddressEnabled: user.mailToAddressEnabled ?? null,
              mailToAddressTo: user.mailToAddressTo ?? '',
              trackdriveLeadToken: user.trackdriveLeadToken ?? '',
              trackdriveLeadEnabled: user.trackdriveLeadEnabled ?? false,
              reportsToId: user.reportsToId ?? null,
              positionId: user.positionId ?? null,
            }}
            canAcceptPayments={true}
            isOwner={user.role === 'OWNER'}
            isAdmin={user.role === 'ADMIN'}
            positions={[]}
            showPaymentAndLead={false}
            showProfileDetails={true}
            skipRedirect
            onSaveSuccess={() => {
              if (showBusiness) {
                setStep(2);
              } else if (onCompleteHref) {
                router.replace(onCompleteHref);
              }
            }}
            simplePositionInput
            allowSetAsAdministrator={Boolean(user.role)}
            initialRole={user.role ?? null}
          />
        </div>
      )}

      {showBusiness && step === 2 && company && (
        <div className="rounded-3xl border border-brand-primary-100 bg-white/80 p-6 shadow-sm">
          <CompanySettings
            key={`${company.id}-${company.updatedAt ?? ''}`}
            initialName={company.name ?? ''}
            initialWebsite={company.website ?? null}
            initialLogoUrl={company.logoUrl ?? null}
            initialPhone={company.phone ?? null}
            initialEmail={company.email ?? user.email ?? null}
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
            initialPrimaryColor={businessPrimaryColor ?? null}
            initialUseHeaderLogo={company.useHeaderLogo ?? null}
            onboardingMode
            hidePersonalFields
          />
        </div>
      )}
    </div>
  );
}
