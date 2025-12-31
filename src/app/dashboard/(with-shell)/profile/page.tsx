// src/app/dashboard/profile/page.tsx
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { ProfileForm } from './ProfileForm';
import { describePlan, ensureTrialState } from '@/lib/plan';
import { prisma } from '@/lib/prisma';
import { EnableNotificationsButton } from '@/components/EnableNotificationsButton';
import { SchedulingForm } from '../../scheduling/SchedulingForm';
import { getAvailabilityForUser } from '../../scheduling/actions';
import { buildBookingLink, normalizeSlug } from '../../scheduling/helpers';
import { MeetingTypeSettings } from './MeetingTypeSettings';
import { DEFAULT_BUSINESS_TIME_ZONE } from '@/lib/timezone';

export async function generateMetadata(): Promise<Metadata> {
  const user = await getCurrentUser();
  return {
    title: 'Profile',
    icons: {
      icon: user?.logoDataUrl ?? '/favicon.ico',
    },
  };
}

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/');
  const hydratedUser = await ensureTrialState(user);
  const plan = describePlan(hydratedUser);
  const isPro = plan.effectiveTier === 'PRO';
  const isOwner = user.role === 'OWNER';
  const isAdmin = user.role === 'ADMIN';
  const planLabel = plan.planTier === 'PRO_TRIAL' ? 'Pro Trial' : plan.planTier === 'PRO' ? 'Pro' : 'Free';
  const roleLabel = user.role === 'OWNER' ? 'Owner' : user.role === 'ADMIN' ? 'Admin' : 'Member';
  const showPlan = isOwner || isAdmin;
  const positions = isOwner && user.companyId
    ? await prisma.position.findMany({
        where: { companyId: user.companyId },
        orderBy: { order: 'asc' },
      })
    : [];
  const initials = (user.name || user.email || 'U')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const availability = await getAvailabilityForUser(user.id);
  const slug = normalizeSlug(user.name ?? user.companyName ?? user.email);
  const bookingLink = slug ? buildBookingLink(slug) : null;
  const meetingTypeConfig = [
    { key: 'phone', label: 'Phone call', enabled: Boolean(user.enablePhone) },
    { key: 'video', label: 'Video call', enabled: Boolean(user.enableVideo) },
    { key: 'inperson', label: 'In-person visit', enabled: Boolean(user.enableInPerson) },
  ];
  const activeMeetingTypes = meetingTypeConfig.filter((entry) => entry.enabled);
  const allowedMeetingTypes = activeMeetingTypes.length ? activeMeetingTypes : meetingTypeConfig;
  const allowedTypeKeys = allowedMeetingTypes.map((entry) => entry.key);
  const allowedTypeLabels = allowedMeetingTypes.map((entry) => entry.label);
  const EMBED_SCRIPT_SRC = 'https://clientwave-scheduling.vercel.app/embed.js';
  const embedSnippet =
    slug && allowedTypeKeys.length
      ? `<div id="clientwave-scheduler" data-user-id="${slug}" data-type="${allowedTypeKeys.join(',')}"></div>\n<script src="${EMBED_SCRIPT_SRC}" async></script>`
      : null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">Profile</p>
          <h1 className="text-3xl font-semibold text-zinc-900">Edit Profile</h1>
          <p className="text-sm text-zinc-600">Update your personal info profile picture and signature.</p>
        </div>
        <div className="w-full">
          <EnableNotificationsButton />
        </div>
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
            timezone: user.timezone ?? DEFAULT_BUSINESS_TIME_ZONE,
          }}
          canAcceptPayments={isPro}
          isOwner={isOwner}
          isAdmin={isAdmin}
          showPaymentAndLead={false}
          positions={positions}
          allowSetAsAdministrator={isOwner || isAdmin}
          initialRole={user.role}
        />
        <div className="space-y-4">
          <SchedulingForm
            availability={availability}
            bookingLink={bookingLink}
            heading="Scheduling"
            embedSnippet={embedSnippet}
            allowedTypeLabels={allowedTypeLabels}
          />
          <MeetingTypeSettings
            initial={{
              enablePhone: Boolean(user.enablePhone),
              phoneNumber: user.phoneNumber ?? "",
              enableVideo: Boolean(user.enableVideo),
              videoLink: user.videoLink ?? "",
              enableInPerson: Boolean(user.enableInPerson),
              location: user.location ?? "",
            }}
          />
        </div>
      </div>
    </div>
  );
}
