'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProfileForm } from '@/app/dashboard/(with-shell)/profile/ProfileForm';
import CompanySettings from '@/app/dashboard/(with-shell)/profile/CompanySettings';
import { SchedulingForm } from '../scheduling/SchedulingForm';
import type { AvailabilityEntry } from '../scheduling/actions';

type OnboardingUser = {
  id: string;
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
  enablePhone?: boolean | null;
  enableVideo?: boolean | null;
  enableInPerson?: boolean | null;
    company?: {
      id: string;
      name?: string | null;
      website?: string | null;
      logoUrl?: string | null;
      iconUrl?: string | null;
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
    industry?: string | null;
  } | null;
};

type OnboardingWizardProps = {
  user: OnboardingUser;
  showBusiness?: boolean;
  onCompleteHref?: string;
  availability?: AvailabilityEntry[];
  bookingLink?: string | null;
  embedSnippet?: string | null;
  initialStep?: OnboardingStep;
  showBookingLink?: boolean;
  showEmbedSnippet?: boolean;
};

export type OnboardingStep = 1 | 2 | 3;

export function OnboardingWizard({
  user,
  showBusiness = true,
  onCompleteHref,
  availability = [],
  bookingLink,
  embedSnippet,
  initialStep,
  showBookingLink = true,
  showEmbedSnippet = false,
}: OnboardingWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState<OnboardingStep>(initialStep ?? 1);
  const initialStepRef = useRef<OnboardingStep | undefined>(initialStep);
  const [businessPrimaryColor, setBusinessPrimaryColor] = useState<string | null>(
    user.company?.primaryColor ?? null
  );

  useEffect(() => {
    if (initialStep && initialStep !== initialStepRef.current) {
      initialStepRef.current = initialStep;
      setStep(initialStep);
    }
  }, [initialStep]);

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
      <div className={`grid gap-3 text-xs font-semibold uppercase tracking-[0.3em] ${showBusiness ? 'grid-cols-3' : 'grid-cols-2'}`}>
        <button
          type="button"
          onClick={() => setStep(1)}
          className={`rounded-xl border-2 px-6 py-4 text-center transition ${
            step === 1
              ? 'border-brand-primary-600 bg-brand-primary-600 text-white shadow-lg'
              : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-brand-primary-300 hover:bg-brand-primary-50 dark:hover:bg-zinc-700'
          }`}
          aria-current={step === 1 ? 'step' : undefined}
        >
          <div className="space-y-1">
            <div className={`text-xl font-bold ${step === 1 ? 'text-white' : 'text-brand-primary-600'}`}>1</div>
            <div>Profile Details</div>
          </div>
        </button>
        {showBusiness && (
          <button
            type="button"
            onClick={() => setStep(2)}
            className={`rounded-xl border-2 px-6 py-4 text-center transition ${
              step === 2
                ? 'border-brand-primary-600 bg-brand-primary-600 text-white shadow-lg'
                : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-brand-primary-300 hover:bg-brand-primary-50 dark:hover:bg-zinc-700'
            }`}
            aria-current={step === 2 ? 'step' : undefined}
          >
            <div className="space-y-1">
              <div className={`text-xl font-bold ${step === 2 ? 'text-white' : 'text-brand-primary-600'}`}>2</div>
              <div>Settings</div>
            </div>
          </button>
        )}
        <button
          type="button"
          onClick={() => setStep(showBusiness ? 3 : 2)}
          className={`rounded-xl border-2 px-6 py-4 text-center transition ${
            step === (showBusiness ? 3 : 2)
              ? 'border-brand-primary-600 bg-brand-primary-600 text-white shadow-lg'
              : 'border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:border-brand-primary-300 hover:bg-brand-primary-50 dark:hover:bg-zinc-700'
          }`}
          aria-current={step === (showBusiness ? 3 : 2) ? 'step' : undefined}
        >
          <div className="space-y-1">
            <div className={`text-xl font-bold ${step === (showBusiness ? 3 : 2) ? 'text-white' : 'text-brand-primary-600'}`}>{showBusiness ? 3 : 2}</div>
            <div>Availability</div>
          </div>
        </button>
      </div>

      {step === 1 && (
        <div className="rounded-3xl border border-brand-primary-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900 p-6 shadow-sm">
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
            onSaveSuccess={() => setStep(showBusiness ? 2 : 2)}
            simplePositionInput
            allowSetAsAdministrator={Boolean(user.role)}
            initialRole={user.role ?? null}
          />
        </div>
      )}

      {showBusiness && step === 2 && company && (
        <div className="rounded-3xl border border-brand-primary-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900 p-6 shadow-sm">
          <CompanySettings
            key={`${company.id}-${company.updatedAt ?? ''}`}
            initialName={company.name ?? ''}
            initialWebsite={company.website ?? null}
            initialLogoUrl={company.logoUrl ?? null}
            initialIconUrl={company.iconUrl ?? null}
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
            initialIndustry={company.industry ?? null}
            onboardingMode
            onSaveSuccess={() => setStep(3)}
            hidePersonalFields
          />
        </div>
      )}

      {step === (showBusiness ? 3 : 2) && (
        <div className="rounded-3xl border border-brand-primary-100 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900 p-6 shadow-sm">
          <SchedulingForm
            availability={availability}
            bookingLink={bookingLink}
            heading="Availability"
            initialMeetingTypes={{
              enablePhone: user.enablePhone ?? false,
              enableVideo: user.enableVideo ?? false,
              enableInPerson: user.enableInPerson ?? false,
            }}
            userId={user.id}
            embedSnippet={embedSnippet}
            isOnboarding={true}
            showBookingLink={showBookingLink}
            showEmbedSnippet={showEmbedSnippet}
            onSubmit={() => {
              // Always redirect to dashboard on completion
              router.push(onCompleteHref || '/dashboard');
            }}
          />
        </div>
      )}
    </div>
  );
}
