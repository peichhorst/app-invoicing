'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { SchedulingForm } from './SchedulingForm';
import { buildBookingLink, normalizeSlug } from './helpers';
import { getAvailabilityForUser } from './actions';
import { GoogleCalendarConnect } from '@/components/GoogleCalendarConnect';
import { AppointmentScheduleTable } from '@/components/AppointmentScheduleTable';
import { getEmbedSnippet } from '@/components/EmbedSnippet';

export default async function SchedulingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/dashboard');
  }

  const availabilities = await getAvailabilityForUser(user.id);
  const baseSlug = normalizeSlug(user.name || user.companyName || user.email);
  const bookingLink = baseSlug ? buildBookingLink(baseSlug) : null;

  const meetingTypeConfig = [
    { key: 'phone', enabled: Boolean(user.enablePhone) },
    { key: 'video', enabled: Boolean(user.enableVideo) },
    { key: 'inperson', enabled: Boolean(user.enableInPerson) },
  ];
  const enabledTypes = meetingTypeConfig.filter((t) => t.enabled).map((t) => t.key);

  const embedSnippet = getEmbedSnippet({
    userId: user.id,
    meetingTypes: enabledTypes,
  });

  const adminBookings = await prisma.booking.findMany({
    where: { userId: user.id },
    orderBy: { startTime: 'asc' },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      clientName: true,
      clientEmail: true,
      clientPhone: true,
      notes: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold text-gray-900">Scheduling</h1>
          <p className="text-sm text-gray-500">
            Manage your availability, booking settings, and upcoming appointments.
          </p>
        </div>
      </div>

      <SchedulingForm
        availability={availabilities}
        bookingLink={bookingLink}
        embedSnippet={embedSnippet}
        heading="Scheduling"
        initialMeetingTypes={{
          enablePhone: user.enablePhone ?? false,
          enableVideo: user.enableVideo ?? false,
          enableInPerson: user.enableInPerson ?? false,
        }}
        userId={user.id}
      />

      <GoogleCalendarConnect
        initialConnected={user.googleCalendarConnected ?? false}
        initialEmail={user.googleCalendarEmail}
        userId={user.id}
      />

      <AppointmentScheduleTable
        bookings={adminBookings}
        timezone={user.timezone ?? 'UTC'}
        userSlug={baseSlug || user.id}
        canCancel
      />
    </div>
  );
}
