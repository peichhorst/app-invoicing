'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { SchedulingForm } from './SchedulingForm';
import { buildBookingLink, normalizeSlug } from './helpers';
import { getAvailabilityForUser } from './actions';
import { GoogleCalendarConnect } from '@/components/GoogleCalendarConnect';

type AdminBooking = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  notes: string | null;
  startTime: Date;
  endTime: Date;
  status: string;
  createdAt: Date;
};

export default async function SchedulingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/dashboard');
  }

  const availabilities = await getAvailabilityForUser(user.id);
  const baseSlug = normalizeSlug(user.name || user.companyName || user.email);
  const bookingLink = baseSlug ? buildBookingLink(baseSlug) : null;
  
  // Generate embed snippet with meeting types
  const meetingTypeConfig = [
    { key: 'phone', enabled: Boolean(user.enablePhone) },
    { key: 'video', enabled: Boolean(user.enableVideo) },
    { key: 'inperson', enabled: Boolean(user.enableInPerson) },
  ];
  const enabledTypes = meetingTypeConfig.filter(t => t.enabled).map(t => t.key);
  const dataTypeValue = enabledTypes.length > 0 ? enabledTypes.join(',') : 'phone,video,inperson';
  
  const embedSnippet = baseSlug 
    ? `<script src="${process.env.NEXT_PUBLIC_URL || 'https://clientwave-scheduling.vercel.app'}/embed.js" data-slug="${baseSlug}" data-type="${dataTypeValue}"></script>\n<div id="clientwave-scheduler"></div>`
    : null;

  // Fetch bookings directly from database instead of API call
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
            <h1 className="text-3xl font-semibold text-gray-900">Schedule</h1>
            <p className="text-sm text-gray-500">
              Manage your availability, booking settings, and upcoming appointments.
            </p>
          </div>
        </div>

        <OwnerBookingsTable bookings={adminBookings} timezone={user.timezone ?? 'UTC'} />
        <GoogleCalendarConnect
          initialConnected={user.googleCalendarConnected ?? false}
          initialEmail={user.googleCalendarEmail}
          userId={user.id}
        />
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
      </div>
  );
}

type OwnerBookingsTableProps = {
  bookings: AdminBooking[];
  timezone: string;
};

function OwnerBookingsTable({ bookings, timezone }: OwnerBookingsTableProps) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-bold uppercase tracking-[0.3em] text-brand-primary-600 text-center mb-4">Appointments</h2>
      {bookings.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center">
          <p className="text-sm text-zinc-500">No bookings yet. Share your booking link to get started.</p>
        </div>
      ) : (
        <>
          {/* Mobile card view */}
          <div className="mt-4 space-y-3 md:hidden">
            {bookings.map((booking) => {
              const start = new Date(booking.startTime);
              const end = booking.endTime ? new Date(booking.endTime) : null;
              const timeLabel = `${start.toLocaleString('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })} – ${end?.toLocaleTimeString('en-US', {
                timeZone: timezone,
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              }) ?? '…'}`;
              
              return (
                <div key={booking.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-brand-primary-600">{booking.clientName}</p>
                      <p className="text-sm text-zinc-600">{booking.clientEmail}</p>
                    </div>
                    <span className="text-xs font-medium capitalize px-2 py-1 rounded bg-zinc-100 text-zinc-700">
                      {booking.status.toLowerCase()}
                    </span>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-zinc-900 font-medium">{timeLabel}</p>
                    {booking.clientPhone && (
                      <p className="text-zinc-600">{booking.clientPhone}</p>
                    )}
                    {booking.notes && (
                      <p className="text-zinc-600 mt-2">{booking.notes}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop table view */}
          <div className="mt-4 hidden md:block overflow-x-auto">
            <table className="min-w-full text-left text-xs text-zinc-600">
              <thead>
                <tr>
                  <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Client</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Email</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Phone</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Slot</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Notes</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {bookings.map((booking) => {
                  const start = new Date(booking.startTime);
                  const end = booking.endTime ? new Date(booking.endTime) : null;
                  const timeLabel = `${start.toLocaleString('en-US', {
                    timeZone: timezone,
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })} – ${end?.toLocaleTimeString('en-US', {
                    timeZone: timezone,
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  }) ?? '…'}`;
                  return (
                    <tr key={booking.id}>
                      <td className="px-3 py-2 font-semibold text-zinc-900">{booking.clientName}</td>
                      <td className="px-3 py-2">{booking.clientEmail}</td>
                      <td className="px-3 py-2">{booking.clientPhone ?? '—'}</td>
                      <td className="px-3 py-2">
                        <span className="font-semibold text-zinc-900">{timeLabel}</span>
                      </td>
                      <td className="px-3 py-2">{booking.notes || '—'}</td>
                      <td className="px-3 py-2 capitalize">{booking.status.toLowerCase()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
