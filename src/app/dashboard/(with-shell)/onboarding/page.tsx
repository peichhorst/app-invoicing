import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { OnboardingWizard } from './OnboardingWizard';
import type { OnboardingStep } from './OnboardingWizard';
import { getAvailabilityForUser } from '../scheduling/actions';
import { buildBookingLink, normalizeSlug } from '../scheduling/helpers';
import { getEmbedSnippet } from '@/components/EmbedSnippet';

export const metadata: Metadata = {
  title: 'Onboarding',
};

type PageProps = {
  searchParams?: Promise<{ mode?: string | string[]; step?: string | string[] }>;
};

export default async function DashboardOnboardingPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const mode = Array.isArray(params?.mode) ? params.mode[0] : params?.mode;
  const inviteMode = mode === 'invite';
  const showBusiness = !inviteMode;

  const rawStepParam = Array.isArray(params?.step) ? params.step[0] : params?.step;
  let initialStep: OnboardingStep | undefined;
  if (rawStepParam) {
    const parsedStep = Number(rawStepParam);
    if (!Number.isNaN(parsedStep) && [1, 2, 3].includes(parsedStep as OnboardingStep)) {
      initialStep = parsedStep as OnboardingStep;
    }
  }
  if (!showBusiness && initialStep === 3) {
    initialStep = 2;
  }
  const user = await getCurrentUser();
  if (!user) {
    redirect('/auth');
  }
  const company = user.company;
  if (!company) {
    redirect('/dashboard');
  }
  if (company.isOnboarded && !inviteMode) {
    redirect('/dashboard');
  }

  const serializedUser = {
    id: user.id,
    name: user.name ?? '',
    email: user.email ?? '',
    role: user.role ?? '',
    companyName: user.companyName ?? '',
    logoDataUrl: (user as any).logoDataUrl ?? '',
    signatureDataUrl: (user as any).signatureDataUrl ?? '',
    phone: user.phone ?? '',
    stripeAccountId: (user as any).stripeAccountId ?? '',
    stripePublishableKey: (user as any).stripePublishableKey ?? '',
    venmoHandle: (user as any).venmoHandle ?? '',
    zelleHandle: (user as any).zelleHandle ?? '',
    mailToAddressEnabled: (user as any).mailToAddressEnabled ?? null,
    mailToAddressTo: (user as any).mailToAddressTo ?? '',
    trackdriveLeadToken: (user as any).trackdriveLeadToken ?? '',
    trackdriveLeadEnabled: (user as any).trackdriveLeadEnabled ?? false,
    reportsToId: (user as any).reportsToId ?? null,
    positionId: (user as any).positionId ?? null,
    enablePhone: (user as any).enablePhone ?? false,
    enableVideo: (user as any).enableVideo ?? false,
    enableInPerson: (user as any).enableInPerson ?? false,
      company: company
        ? {
            id: company.id,
            name: company.name ?? '',
            website: company.website ?? '',
            logoUrl: company.logoUrl ?? '',
            iconUrl: company.iconUrl ?? '',
            phone: company.phone ?? '',
            email: company.email ?? '',
            slogan: company.slogan ?? '',
            addressLine1: company.addressLine1 ?? '',
            addressLine2: company.addressLine2 ?? '',
            city: company.city ?? '',
            state: company.state ?? '',
            postalCode: company.postalCode ?? '',
            country: company.country ?? 'USA',
            primaryColor: (company as any).primaryColor ?? null,
            useHeaderLogo: company.useHeaderLogo ?? null,
            industry: company.industry ?? '',
            updatedAt: company.updatedAt?.toISOString?.() ?? '',
            stripeAccountId: company.stripeAccountId ?? null,
            stripePublishableKey: company.stripePublishableKey ?? null,
            venmoHandle: company.venmoHandle ?? null,
            zelleHandle: company.zelleHandle ?? null,
          mailToAddressEnabled: company.mailToAddressEnabled ?? null,
          mailToAddressTo: company.mailToAddressTo ?? null,
          trackdriveLeadToken: company.trackdriveLeadToken ?? null,
          trackdriveLeadEnabled: company.trackdriveLeadEnabled ?? null,
        }
      : null,
  };

  const availability = await getAvailabilityForUser(user.id);
  const slug = normalizeSlug(user.name ?? user.email ?? user.companyName);
  const bookingLink = slug ? buildBookingLink(slug) : null;

  // Use shared embed snippet generator with user id
  const showEmbedSnippet = false;
  const meetingTypes = [
    ...(user.enablePhone ? ['phone'] : []),
    ...(user.enableVideo ? ['video'] : []),
    ...(user.enableInPerson ? ['inperson'] : []),
  ];
  const embedSnippet =
    showEmbedSnippet ? getEmbedSnippet({ userId: user.id, meetingTypes, baseUrl: undefined }) : null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="space-y-2 rounded-3xl border border-brand-primary-100 bg-white/80 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Welcome aboard to ClientWave!</p>
          <h1 className="text-3xl font-semibold text-zinc-900">Finish setting up your workspace</h1>
          <p className="text-sm text-zinc-600">
            Before getting started, we just need a few details.
          </p>
        </div>
        <OnboardingWizard
          user={serializedUser}
          showBusiness={showBusiness}
          initialStep={initialStep}
          onCompleteHref="/dashboard"
          availability={availability}
          bookingLink={bookingLink}
          showBookingLink={false}
          showEmbedSnippet={showEmbedSnippet}
          embedSnippet={embedSnippet}
        />
      </div>
    </div>
  );
}
