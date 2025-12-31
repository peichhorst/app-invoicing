'use server';

import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import { SchedulingForm } from './SchedulingForm';
import { buildBookingLink, normalizeSlug } from './helpers';
import { getAvailabilityForUser } from './actions';

type AdminBooking = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  notes: string | null;
  startTime: string;
  endTime: string;
  status: string;
  createdAt: string;
};

const OWNER_BOOKINGS_ENDPOINT =
  process.env.NEXT_PUBLIC_APP_URL ??
  process.env.NEXTAUTH_URL ??
  process.env.NEXT_PUBLIC_BASE_URL ??
  'http://localhost:3000';

export default async function SchedulingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/dashboard');
  }

  const availabilities = await getAvailabilityForUser(user.id);
  const baseSlug = normalizeSlug(user.name || user.companyName || user.email);
  const bookingLink = baseSlug ? buildBookingLink(baseSlug) : null;
  const EMBED_SCRIPT_SRC = 'https://clientwave-scheduling.vercel.app/embed.js';
  const meetingTypeConfig = [
    { key: 'phone', label: 'Phone call', enabled: Boolean(user.enablePhone) },
    { key: 'video', label: 'Video call', enabled: Boolean(user.enableVideo) },
    { key: 'inperson', label: 'In-person visit', enabled: Boolean(user.enableInPerson) },
  ];
  const activeMeetingTypes = meetingTypeConfig.filter((entry) => entry.enabled);
  const allowedMeetingTypes = activeMeetingTypes.length ? activeMeetingTypes : meetingTypeConfig;
  const allowedTypeKeys = allowedMeetingTypes.map((entry) => entry.key);
  const allowedTypeLabels = allowedMeetingTypes.map((entry) => entry.label);
  const embedSnippet =
    baseSlug && allowedTypeKeys.length
      ? `<div id="clientwave-scheduler" data-user-id="${baseSlug}" data-type="${allowedTypeKeys.join(
          ','
        )}"></div>\n<script src="${EMBED_SCRIPT_SRC}" async></script>`
      : null;

  let adminBookings: AdminBooking[] = [];
  if (baseSlug) {
    const endpoint = new URL(`/api/scheduling/${baseSlug}/admin-bookings`, OWNER_BOOKINGS_ENDPOINT);
    const headerStore = await headers();
    const cookieHeader = headerStore.get('cookie') ?? undefined;

    const cookieStore = await cookies();
    const fallbackCookie =
      Array.from(cookieStore.getAll())
        .map((entry) => `${entry.name}=${entry.value}`)
        .join('; ') || undefined;

    const response = await fetch(endpoint.toString(), {
      headers: {
        cookie: cookieHeader ?? fallbackCookie ?? '',
      },
      cache: 'no-store',
    });
    if (response.ok) {
      const payload = await response.json().catch(() => null);
      if (Array.isArray(payload?.bookings)) {
        adminBookings = payload.bookings;
      }
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <SchedulingForm
          availability={availabilities}
          bookingLink={bookingLink}
          embedSnippet={embedSnippet}
          allowedTypeLabels={allowedTypeLabels}
          heading="Scheduling"
        />
        <OwnerBookingsTable bookings={adminBookings} timezone={user.timezone ?? 'UTC'} />
      </div>
    </div>
  );
}

type OwnerBookingsTableProps = {
  bookings: AdminBooking[];
  timezone: string;
};

function OwnerBookingsTable({ bookings, timezone }: OwnerBookingsTableProps) {
  if (!bookings.length) return null;

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Recent bookings</h2>
      <div className="mt-4 overflow-x-auto">
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
    </div>
  );
}
