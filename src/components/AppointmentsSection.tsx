import React from 'react';

export type AdminBooking = {
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

type AppointmentsSectionProps = {
  bookings: AdminBooking[];
  timezone: string;
};

export function AppointmentsSection({ bookings, timezone }: AppointmentsSectionProps) {
  return (
    <div className="rounded-2xl border border-brand-primary-600 bg-white shadow-sm mb-6">
      <h2 className="text-xl font-bold uppercase tracking-[0.3em] bg-brand-primary-600 text-[var(--color-brand-contrast)] rounded-t-2xl px-4 py-2 text-center">Appointment Schedule</h2>
      <div className="pt-6 pb-2 px-4">
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
                })}${end ? ` - ${end.toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}`;
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
                      {booking.notes && (
                        <p className="text-xs text-zinc-600">{booking.notes}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop table view */}
            <div className="hidden md:block mt-4">
              <table className="min-w-full divide-y divide-zinc-200">
                <thead>
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 uppercase">Client</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 uppercase">Email</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 uppercase">Phone</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 uppercase">Time</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 uppercase">Notes</th>
                    <th className="px-3 py-2 text-left text-xs font-semibold text-zinc-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody>
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
                    })}${end ? ` - ${end.toLocaleTimeString('en-US', { timeZone: timezone, hour: 'numeric', minute: '2-digit', hour12: true })}` : ''}`;
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
    </div>
  );
}
