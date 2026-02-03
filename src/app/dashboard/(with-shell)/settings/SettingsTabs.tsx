"use client";
import { useEffect, useState } from 'react';
import { ProfileForm } from '../profile/ProfileForm';
import CompanySettings from '../profile/CompanySettings';
import { SchedulingForm } from '../scheduling/SchedulingForm';
import { getEmbedSnippet } from '@/components/EmbedSnippet';
import { QuickBooksSettings } from '@/components/QuickBooksSettings';
import { GoogleCalendarConnect } from '@/components/GoogleCalendarConnect';
import type { StripeWebhookStatus } from '@prisma/client';

import type { AvailabilityEntry } from '../scheduling/actions';

export type SettingsTabsProps = {
  user: any;
  company: any;
  availability: AvailabilityEntry[];
  bookingLink?: string | null;
  shouldShowManualStripeWebhookWarning?: boolean;
  initialStripeWebhookSecret?: string | null;
  stripeWebhookStatus?: StripeWebhookStatus | null;
  stripeWebhookLastError?: string | null;
  initialTabLabel?: string | null;
};

export default function SettingsTabs({
  user,
  company,
  availability,
  bookingLink,
  shouldShowManualStripeWebhookWarning = false,
  initialStripeWebhookSecret = null,
  stripeWebhookStatus = null,
  stripeWebhookLastError = null,
  initialTabLabel,
}: SettingsTabsProps) {
  const normalizedInitialTabLabel =
    typeof initialTabLabel === 'string' ? initialTabLabel.trim().toLowerCase() : undefined;
  const isSuperAdmin = user?.isSuperAdmin;
  const canShowBusinessTab =
    Boolean(company) && (user.role === 'OWNER' || user.role === 'ADMIN' || isSuperAdmin);
  const getInitialTabIndex = () => {
    if (normalizedInitialTabLabel === 'business' && canShowBusinessTab) {
      return 1;
    }
    if (normalizedInitialTabLabel === 'availability') {
      return canShowBusinessTab ? 2 : 1;
    }
    return 0;
  };
  const [tab, setTab] = useState(getInitialTabIndex);
  useEffect(() => {
    setTab(getInitialTabIndex());
  }, [normalizedInitialTabLabel, canShowBusinessTab]);
  const tabs = [
    { label: 'Profile', content: (
      <>
            <ProfileForm
              initial={{
                name: user.name,
                email: user.email,
            companyName: user.companyName,
            logoDataUrl: user.logoDataUrl,
            signatureDataUrl: user.signatureDataUrl,
            phone: user.phone,
            stripeAccountId: user.stripeAccountId,
            stripePublishableKey: user.stripePublishableKey,
            venmoHandle: user.venmoHandle,
            zelleHandle: user.zelleHandle,
            mailToAddressEnabled: user.mailToAddressEnabled,
            mailToAddressTo: user.mailToAddressTo,
            trackdriveLeadToken: user.trackdriveLeadToken,
            trackdriveLeadEnabled: user.trackdriveLeadEnabled,
            reportsToId: user.reportsToId,
            positionId: user.positionId,
            timezone: user.timezone,
          }}
          canAcceptPayments={true}
          isOwner={user.role === 'OWNER'}
          isAdmin={user.role === 'ADMIN'}
          positions={[]}
          showPaymentAndLead={false}
          showProfileDetails={true}
          skipRedirect
          simplePositionInput
          allowSetAsAdministrator={Boolean(user.role)}
          initialRole={user.role ?? null}
          shouldShowManualStripeWebhookWarning={shouldShowManualStripeWebhookWarning}
        />
      </>
    ) },
    ...(canShowBusinessTab ? [{ label: 'Business', content: (
      <>
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
            initialPrimaryColor={company.primaryColor ?? null}
            initialUseHeaderLogo={company.useHeaderLogo ?? null}
            initialIndustry={company.industry ?? null}
            initialSlogan={company.slogan ?? null}
            hidePersonalFields={true}
            shouldShowManualStripeWebhookWarning={shouldShowManualStripeWebhookWarning}
            initialStripeWebhookSecret={initialStripeWebhookSecret}
            stripeWebhookStatus={stripeWebhookStatus}
            stripeWebhookLastError={stripeWebhookLastError}
          />
        <div className="mt-8">
          <QuickBooksSettings
            isConnected={company?.quickbooksConnected ?? false}
            realmId={company?.quickbooksRealmId}
          />
        </div>
      </>
    ) }] : []),
    { label: 'Availability', content: (
      <>
        <div className="mb-8">
          <GoogleCalendarConnect
            initialConnected={user.googleCalendarConnected ?? false}
            initialEmail={user.googleCalendarEmail}
            userId={user.id}
          />
        </div>
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
          embedSnippet={user?.id
              ? getEmbedSnippet({
                  userId: user.id,
                  meetingTypes: [
                    ...(user.enablePhone ? ['phone'] : []),
                    ...(user.enableVideo ? ['video'] : []),
                    ...(user.enableInPerson ? ['inperson'] : []),
                  ],
                })
              : null}
          onSubmit={async () => Promise.resolve()}
        />
      </>
    ) },
  ];

  return (
    <div>
      <div className="grid gap-3 mb-4 md:grid-cols-3">
        {tabs.map((t, i) => (
          <button
            key={t.label}
            className={`rounded-xl border-2 px-6 py-4 text-center font-semibold transition ${
              tab === i
                ? 'border-brand-primary-600 bg-brand-primary-600 text-white shadow-lg'
                : 'border-zinc-200 bg-white text-zinc-600 hover:border-brand-primary-300 hover:bg-brand-primary-50'
            }`}
            onClick={() => setTab(i)}
            aria-current={tab === i ? 'step' : undefined}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="rounded-3xl border border-brand-primary-100 bg-white/80 p-6 shadow-sm">
        {tabs[tab].content}
      </div>
    </div>
  );
}
