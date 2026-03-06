'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { fromZonedTime } from 'date-fns-tz';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';
import { Trash2 } from 'lucide-react';

export type AdminBooking = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  notes: string | null;
  startTime: string | Date;
  endTime: string | Date;
  status: string;
  createdAt: string | Date;
};

type OwnerBookingsTableClientProps = {
  bookings: AdminBooking[];
  timezone: string;
  userSlug: string;
  canCancel?: boolean;
};

type AvailabilityEntry = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  duration?: number;
  buffer?: number;
};

type BusySlot = {
  date: string;
  startTime: string;
};

type RescheduleSlot = {
  start: string;
  end: string;
  label: string;
};

const CANCELLED_STATUSES = new Set(['CANCELLED', 'CANCELED', 'cancelled', 'canceled']);

const isCancelled = (status: string) => CANCELLED_STATUSES.has(status);

const WEEKDAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const parseTime = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  return hours * 60 + minutes;
};

const formatTime = (minutes: number) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const formatTime12 = (minutes: number) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const suffix = hrs >= 12 ? 'PM' : 'AM';
  const normalizedHour = hrs % 12 === 0 ? 12 : hrs % 12;
  return `${normalizedHour}:${String(mins).padStart(2, '0')} ${suffix}`;
};


const getHostDateParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const [year, month, day] = formatter.format(date).split('-');
  return `${year}-${month}-${day}`;
};

const getHostTimeParts = (date: Date, timeZone: string) => {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  return `${hour}:${minute}`;
};

export function OwnerBookingsTableClient({
  bookings: initialBookings,
  timezone,
  userSlug,
  canCancel = false,
}: OwnerBookingsTableClientProps) {
  const sortBookingsByStartAsc = useCallback((entries: AdminBooking[]) => {
    return [...entries].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime() ||
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  }, []);
  const [bookings, setBookings] = useState<AdminBooking[]>(() => sortBookingsByStartAsc(initialBookings));
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [selectedDeleteBooking, setSelectedDeleteBooking] = useState<AdminBooking | null>(null);
  const [rescheduleBooking, setRescheduleBooking] = useState<AdminBooking | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleStartTime, setRescheduleStartTime] = useState('');
  const [rescheduleEndTime, setRescheduleEndTime] = useState('');
  const [rescheduleSlotsByDate, setRescheduleSlotsByDate] = useState<Record<string, RescheduleSlot[]>>({});
  const [isLoadingRescheduleSlots, setIsLoadingRescheduleSlots] = useState(false);
  const [isRescheduling, setIsRescheduling] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBookings = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/scheduling/${encodeURIComponent(userSlug)}/admin-bookings`,
        {
          cache: 'no-store',
          credentials: 'include',
        }
      );
      if (!response.ok) {
        throw new Error('Failed to refresh bookings');
      }
      const payload = await response.json().catch(() => null);
      const latest = (payload?.bookings ?? []) as AdminBooking[];
      setBookings(sortBookingsByStartAsc(latest));
    } catch (err) {
      setError((prev) => prev ?? (err instanceof Error ? err.message : 'Failed to refresh bookings'));
    }
  }, [sortBookingsByStartAsc, userSlug]);

  useEffect(() => {
    setBookings(sortBookingsByStartAsc(initialBookings));
  }, [initialBookings, sortBookingsByStartAsc]);

  useEffect(() => {
    void refreshBookings();
  }, [refreshBookings]);

  const selectedLabel = useMemo(() => {
    if (!selectedBooking) return '';
    const start = new Date(selectedBooking.startTime);
    const end = new Date(selectedBooking.endTime);
    return `${start.toLocaleString('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })} - ${end.toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })}`;
  }, [selectedBooking, timezone]);

  const cancelBooking = async () => {
    if (!selectedBooking || isCancelling) return;
    setIsCancelling(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/scheduling/${encodeURIComponent(userSlug)}/admin-bookings?bookingId=${encodeURIComponent(selectedBooking.id)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to cancel booking');
      }

      await refreshBookings();
      setSelectedBooking(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  const deleteBooking = async () => {
    if (!selectedDeleteBooking || isDeleting) return;
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/scheduling/${encodeURIComponent(userSlug)}/admin-bookings?bookingId=${encodeURIComponent(selectedDeleteBooking.id)}&hard=true`,
        {
          method: 'DELETE',
          credentials: 'include',
        },
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to fully delete booking');
      }

      await refreshBookings();
      setSelectedDeleteBooking(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fully delete booking');
    } finally {
      setIsDeleting(false);
    }
  };

  const buildRescheduleSlotMap = (
    availability: AvailabilityEntry[],
    busySlots: BusySlot[],
    booking: AdminBooking,
  ) => {
    const blocked = new Map<string, Set<string>>();
    busySlots.forEach((slot) => {
      if (!slot.date || !slot.startTime) return;
      if (!blocked.has(slot.date)) blocked.set(slot.date, new Set());
      blocked.get(slot.date)?.add(slot.startTime);
    });

    const currentStart = new Date(booking.startTime);
    const currentDateKey = getHostDateParts(currentStart, timezone);
    const currentStartKey = getHostTimeParts(currentStart, timezone);
    const weekdayFormatter = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' });

    const result: Record<string, RescheduleSlot[]> = {};
    const now = new Date();
    for (let offset = 0; offset < 120; offset += 1) {
      const date = new Date(now);
      date.setDate(now.getDate() + offset);
      const dateKey = getHostDateParts(date, timezone);
      const dayOfWeek = WEEKDAY_MAP[weekdayFormatter.format(date)] ?? date.getDay();
      const dayConfig = availability.find((entry) => entry.dayOfWeek === dayOfWeek);
      if (!dayConfig) continue;

      const startMin = parseTime(dayConfig.startTime);
      const endMin = parseTime(dayConfig.endTime);
      if (startMin === null || endMin === null || startMin >= endMin) continue;

      const duration = Number.isFinite(dayConfig.duration) && (dayConfig.duration ?? 0) > 0 ? (dayConfig.duration as number) : 30;
      const buffer = Number.isFinite(dayConfig.buffer) && (dayConfig.buffer ?? 0) >= 0 ? (dayConfig.buffer as number) : 0;
      const step = duration + buffer;
      const daySlots: RescheduleSlot[] = [];

      let cursor = startMin;
      while (cursor + duration <= endMin) {
        const start = formatTime(cursor);
        const end = formatTime(cursor + duration);
        const isCurrentSlot = dateKey === currentDateKey && start === currentStartKey;
        const isBlocked = blocked.get(dateKey)?.has(start) ?? false;
        if (!isBlocked || isCurrentSlot) {
          daySlots.push({
            start,
            end,
            label: `${formatTime12(cursor)} - ${formatTime12(cursor + duration)}`,
          });
        }
        cursor += step;
      }

      if (daySlots.length > 0) {
        result[dateKey] = daySlots;
      }
    }

    return result;
  };

  const openRescheduleModal = async (booking: AdminBooking) => {
    const start = new Date(booking.startTime);
    const end = new Date(booking.endTime);
    setRescheduleBooking(booking);
    setRescheduleDate(getHostDateParts(start, timezone));
    setRescheduleStartTime(getHostTimeParts(start, timezone));
    setRescheduleEndTime(getHostTimeParts(end, timezone));
    setRescheduleSlotsByDate({});
    setError(null);

    setIsLoadingRescheduleSlots(true);
    try {
      const response = await fetch(`/api/scheduling/${encodeURIComponent(userSlug)}/availability`, {
        cache: 'no-store',
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to load live availability for reschedule');
      }
      const payload = await response.json().catch(() => null);
      const availability = (payload?.availability ?? []) as AvailabilityEntry[];
      const busy = (payload?.bookedSlots ?? []) as BusySlot[];
      const slotMap = buildRescheduleSlotMap(availability, busy, booking);
      setRescheduleSlotsByDate(slotMap);

      const currentDateKey = getHostDateParts(start, timezone);
      const currentStartKey = getHostTimeParts(start, timezone);
      const currentEndKey = getHostTimeParts(end, timezone);
      const currentStillValid = (slotMap[currentDateKey] ?? []).some(
        (slot) => slot.start === currentStartKey && slot.end === currentEndKey,
      );
      if (currentStillValid) {
        setRescheduleDate(currentDateKey);
        setRescheduleStartTime(currentStartKey);
        setRescheduleEndTime(currentEndKey);
      } else {
        const firstDate = Object.keys(slotMap).sort()[0];
        const firstSlot = firstDate ? slotMap[firstDate]?.[0] : null;
        if (firstDate && firstSlot) {
          setRescheduleDate(firstDate);
          setRescheduleStartTime(firstSlot.start);
          setRescheduleEndTime(firstSlot.end);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load availability');
    } finally {
      setIsLoadingRescheduleSlots(false);
    }
  };

  const submitReschedule = async () => {
    if (!rescheduleBooking || isRescheduling) return;
    if (!rescheduleDate || !rescheduleStartTime || !rescheduleEndTime) {
      setError('Please provide a date, start time, and end time.');
      return;
    }

    const startIso = fromZonedTime(`${rescheduleDate} ${rescheduleStartTime}`, timezone).toISOString();
    const endIso = fromZonedTime(`${rescheduleDate} ${rescheduleEndTime}`, timezone).toISOString();
    if (new Date(startIso) >= new Date(endIso)) {
      setError('End time must be after start time.');
      return;
    }

    setIsRescheduling(true);
    setError(null);

    try {
      const response = await fetch(`/api/scheduling/${encodeURIComponent(userSlug)}/admin-bookings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          bookingId: rescheduleBooking.id,
          startTime: startIso,
          endTime: endIso,
        }),
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to reschedule booking');
      }

      const updated = payload?.booking;
      if (updated?.id) {
        await refreshBookings();
      }

      setRescheduleBooking(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reschedule booking');
    } finally {
      setIsRescheduling(false);
    }
  };

  const rescheduleDateOptions = useMemo(
    () => Object.keys(rescheduleSlotsByDate).sort(),
    [rescheduleSlotsByDate],
  );
  const slotsForSelectedDate = useMemo(
    () => (rescheduleDate ? rescheduleSlotsByDate[rescheduleDate] ?? [] : []),
    [rescheduleDate, rescheduleSlotsByDate],
  );

  return (
    <div className="rounded-2xl border border-brand-primary-600 bg-white shadow-sm">
      <h2 className="text-xl font-bold uppercase tracking-[0.3em] bg-brand-primary-600 text-[var(--color-brand-contrast)] rounded-t-2xl px-4 py-2 text-center">
        Appointment Schedule
      </h2>
      <div className="p-6">

      {error && (
        <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{error}</div>
      )}

      {bookings.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 px-4 py-8 text-center">
          <p className="text-sm text-zinc-500">No bookings yet.</p>
        </div>
      ) : (
        <>
          <div className="mt-4 space-y-3 md:hidden">
            {bookings.map((booking) => {
              const start = new Date(booking.startTime);
              const end = booking.endTime ? new Date(booking.endTime) : null;
              const cancelled = isCancelled(booking.status);
              const timeLabel = `${start.toLocaleString('en-US', {
                timeZone: timezone,
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              })} - ${end?.toLocaleTimeString('en-US', {
                timeZone: timezone,
                hour: 'numeric',
                minute: '2-digit',
                hour12: true,
              }) ?? '...'}`;

              return (
                <div key={booking.id} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-brand-primary-600">{booking.clientName}</p>
                      <p className="text-sm text-zinc-600">{booking.clientEmail}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-zinc-100 px-2 py-1 text-xs font-medium capitalize text-zinc-700">
                        {booking.status.toLowerCase()}
                      </span>
                      {canCancel && (
                        <>
                          <button
                            type="button"
                            aria-label={`Reschedule booking with ${booking.clientName}`}
                            title="Reschedule booking"
                            className="rounded border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                            onClick={() => {
                              void openRescheduleModal(booking);
                            }}
                          >
                            RS
                          </button>
                          {!cancelled && (
                            <button
                              type="button"
                              aria-label={`Cancel booking with ${booking.clientName}`}
                              title="Cancel booking"
                              className="rounded border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                              onClick={() => setSelectedBooking(booking)}
                            >
                              x
                            </button>
                          )}
                          <button
                            type="button"
                            aria-label={`Delete booking with ${booking.clientName}`}
                            title="Delete booking permanently"
                            className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                            onClick={() => setSelectedDeleteBooking(booking)}
                          >
                            <Trash2 className="h-3 w-3 text-red-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={`space-y-1 text-sm ${cancelled ? 'opacity-60 line-through' : ''}`}>
                    <p className="font-medium text-zinc-900">{timeLabel}</p>
                    {booking.clientPhone && <p className="text-zinc-600">{booking.clientPhone}</p>}
                    {booking.notes && <p className="mt-2 text-zinc-600">{booking.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 hidden overflow-x-auto md:block">
            <table className="min-w-full text-left text-xs text-zinc-600">
              <thead>
                <tr>
                  <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Client</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Email</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Phone</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Slot</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Notes</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Status</th>
                  <th className="px-3 py-2 font-semibold uppercase tracking-[0.3em] text-zinc-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {bookings.map((booking) => {
                  const start = new Date(booking.startTime);
                  const end = booking.endTime ? new Date(booking.endTime) : null;
                  const cancelled = isCancelled(booking.status);
                  const timeLabel = `${start.toLocaleString('en-US', {
                    timeZone: timezone,
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  })} - ${end?.toLocaleTimeString('en-US', {
                    timeZone: timezone,
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true,
                  }) ?? '...'}`;

                  return (
                    <tr key={booking.id} className={cancelled ? 'opacity-60' : ''}>
                      <td className={`px-3 py-2 font-semibold text-zinc-900 ${cancelled ? 'line-through' : ''}`}>
                        {booking.clientName}
                      </td>
                      <td className={`px-3 py-2 ${cancelled ? 'line-through' : ''}`}>{booking.clientEmail}</td>
                      <td className={`px-3 py-2 ${cancelled ? 'line-through' : ''}`}>{booking.clientPhone ?? '-'}</td>
                      <td className="px-3 py-2">
                        <span className={`font-semibold text-zinc-900 ${cancelled ? 'line-through' : ''}`}>{timeLabel}</span>
                      </td>
                      <td className={`px-3 py-2 ${cancelled ? 'line-through' : ''}`}>{booking.notes || '-'}</td>
                      <td className="px-3 py-2 capitalize">{booking.status.toLowerCase()}</td>
                      <td className="px-3 py-2">
                        {canCancel ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-label={`Reschedule booking with ${booking.clientName}`}
                              title="Reschedule booking"
                              className="rounded border border-amber-300 px-2 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                              onClick={() => {
                                void openRescheduleModal(booking);
                              }}
                            >
                              RS
                            </button>
                            {!cancelled && (
                              <button
                                type="button"
                                aria-label={`Cancel booking with ${booking.clientName}`}
                                title="Cancel booking"
                                className="rounded border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                                onClick={() => setSelectedBooking(booking)}
                              >
                                x
                              </button>
                            )}
                            <button
                              type="button"
                              aria-label={`Delete booking with ${booking.clientName}`}
                              title="Delete booking permanently"
                              className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                              onClick={() => setSelectedDeleteBooking(booking)}
                            >
                              <Trash2 className="h-3 w-3 text-red-600" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-400">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
      </div>

      <ConfirmationModal
        isOpen={Boolean(selectedBooking)}
        onClose={() => {
          if (!isCancelling) setSelectedBooking(null);
        }}
        onConfirm={cancelBooking}
        title="Cancel booking?"
        message={
          selectedBooking
            ? `Cancel ${selectedBooking.clientName}'s booking on ${selectedLabel}? This will reopen the slot for new bookings.`
            : 'Cancel this booking?'
        }
        confirmText={isCancelling ? 'Cancelling...' : 'Cancel booking'}
        cancelText="Keep booking"
        closeOnConfirm={false}
      />
      <ConfirmationModal
        isOpen={Boolean(selectedDeleteBooking)}
        onClose={() => {
          if (!isDeleting) setSelectedDeleteBooking(null);
        }}
        onConfirm={deleteBooking}
        title="Delete booking permanently?"
        message={
          selectedDeleteBooking
            ? `This permanently deletes ${selectedDeleteBooking.clientName}'s booking and removes linked Google calendar events. This cannot be undone.`
            : 'Permanently delete this booking?'
        }
        confirmText={isDeleting ? 'Deleting...' : 'Delete permanently'}
        cancelText="Keep booking"
        align="center"
        closeOnConfirm={false}
      />

      {rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">Reschedule booking</h3>
            <p className="mt-2 text-sm text-gray-600">
              Move {rescheduleBooking.clientName}&apos;s booking to a new slot ({timezone}).
            </p>
            {isLoadingRescheduleSlots ? (
              <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-4 text-sm text-zinc-600">
                Loading available slots...
              </div>
            ) : (
              <div className="mt-4 grid gap-3">
                <label className="text-xs text-zinc-600">
                  Date
                  <select
                    value={rescheduleDate}
                    onChange={(event) => {
                      const nextDate = event.target.value;
                      setRescheduleDate(nextDate);
                      const nextSlot = rescheduleSlotsByDate[nextDate]?.[0];
                      if (nextSlot) {
                        setRescheduleStartTime(nextSlot.start);
                        setRescheduleEndTime(nextSlot.end);
                      } else {
                        setRescheduleStartTime('');
                        setRescheduleEndTime('');
                      }
                    }}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                  >
                    {rescheduleDateOptions.length === 0 ? (
                      <option value="">No available dates</option>
                    ) : (
                      rescheduleDateOptions.map((dateKey) => (
                        <option key={dateKey} value={dateKey}>
                          {dateKey}
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <label className="text-xs text-zinc-600">
                  Slot
                  <select
                    value={rescheduleStartTime && rescheduleEndTime ? `${rescheduleStartTime}|${rescheduleEndTime}` : ''}
                    onChange={(event) => {
                      const [start, end] = event.target.value.split('|');
                      setRescheduleStartTime(start || '');
                      setRescheduleEndTime(end || '');
                    }}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
                    disabled={slotsForSelectedDate.length === 0}
                  >
                    {slotsForSelectedDate.length === 0 ? (
                      <option value="">No available slots</option>
                    ) : (
                      slotsForSelectedDate.map((slot) => (
                        <option key={`${slot.start}-${slot.end}`} value={`${slot.start}|${slot.end}`}>
                          {slot.label}
                        </option>
                      ))
                    )}
                  </select>
                </label>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  if (isRescheduling) return;
                  setRescheduleBooking(null);
                }}
                className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitReschedule}
                disabled={isRescheduling || isLoadingRescheduleSlots || !rescheduleDate || !rescheduleStartTime || !rescheduleEndTime}
                className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
              >
                {isRescheduling ? 'Rescheduling...' : 'Reschedule'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
