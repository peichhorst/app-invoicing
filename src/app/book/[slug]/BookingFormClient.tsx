"use client";

import { FormEvent, type JSX, useCallback, useEffect, useMemo, useState } from 'react';
import CalendarPicker from '@/components/scheduling/CalendarPicker';

type Slot = {
  label: string;
  start: string;
  end: string;
};

type DayAvailability = {
  dayOfWeek: number;
  dayLabel: string;
  slots: Slot[];
};

type BookedSlot = {
  date: string;
  dayOfWeek?: number;
  startTime: string;
  localTime?: string;
};

type BookingFormProps = {
  slug: string;
  days: DayAvailability[];
  bookingLink: string;
  bookedSlots: BookedSlot[];
  hostTimezone: string;
};

const WEEKDAY_INDEX: Record<string, number> = {
  Sunday: 0,
  Monday: 1,
  Tuesday: 2,
  Wednesday: 3,
  Thursday: 4,
  Friday: 5,
  Saturday: 6,
};

const buildDisabledSlotMap = (slots: BookedSlot[], timeZone: string) => {
  const map = new Map<string, Set<string>>();
  slots.forEach(({ startTime }) => {
    if (!startTime) return;
    const localDate = new Date(startTime);
    const localTime = localDate.toLocaleTimeString('en-US', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const dateKey = localDate.toLocaleDateString('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    if (!map.has(dateKey)) {
      map.set(dateKey, new Set());
    }
    map.get(dateKey)?.add(localTime);
  });
  return map;
};

export default function BookingFormClient({
  slug,
  days,
  bookingLink,
  bookedSlots,
  hostTimezone = 'America/Los_Angeles',
}: BookingFormProps): JSX.Element {
  const formatTimeLocal = useCallback(
    (isoString: string) =>
      new Date(isoString).toLocaleTimeString('en-US', {
        timeZone: hostTimezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZoneName: 'short',
      }),
    [hostTimezone],
  );

  const formatDateLocal = useCallback(
    (isoString: string) =>
      new Date(isoString).toLocaleDateString('en-US', {
        timeZone: hostTimezone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [hostTimezone],
  );

  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedDayLabel, setSelectedDayLabel] = useState('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedHostIso, setSelectedHostIso] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveBookedSlots, setLiveBookedSlots] = useState<BookedSlot[]>(bookedSlots);
  const [disabledSlots, setDisabledSlots] = useState<Map<string, Set<string>>>(() =>
    buildDisabledSlotMap(bookedSlots, hostTimezone),
  );

  const hasSlots = days.length > 0 && days.some((day) => day.slots.length > 0);
  const submitDisabled = !selectedSlot || !name.trim() || !email.trim() || status === 'loading';

  const hostIsoFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: hostTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }),
    [hostTimezone],
  );

  const hostWeekdayFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: hostTimezone,
        weekday: 'long',
      }),
    [hostTimezone],
  );

  const hostTimeFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        timeZone: hostTimezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    [hostTimezone],
  );

  const hostBaseDate = useMemo(() => {
    const today = new Date();
    const [year, month, day] = hostIsoFormatter.format(today).split('-').map(Number);
    const base = new Date(year, month - 1, day);
    base.setHours(0, 0, 0, 0);
    return base;
  }, [hostIsoFormatter]);

  const now = new Date();
  const hostNowDateKey = hostIsoFormatter.format(now);
  const hostNowTimeKey = hostTimeFormatter.format(now);

  const daysMap = useMemo(() => new Map(days.map((day) => [day.dayOfWeek, day])), [days]);

  const slotCountsByDay = useMemo(() => {
    const map = new Map<number, number>();
    days.forEach((day) => {
      map.set(day.dayOfWeek, day.slots.length);
    });
    return map;
  }, [days]);

  const availableDateEntries = useMemo(() => {
    const entries: { date: Date; iso: string; dayOfWeek: number }[] = [];
    const horizonDays = 6 * 30; // ~6 months
    for (let offset = 0; offset < horizonDays; offset += 1) {
      const candidate = new Date(hostBaseDate);
      candidate.setDate(hostBaseDate.getDate() + offset);
      const weekday = hostWeekdayFormatter.format(candidate);
      const dayOfWeek = WEEKDAY_INDEX[weekday as keyof typeof WEEKDAY_INDEX] ?? candidate.getUTCDay();
      if (!daysMap.has(dayOfWeek)) continue;
      entries.push({ date: new Date(candidate), iso: hostIsoFormatter.format(candidate), dayOfWeek });
    }
    if (hostNowDateKey) {
      return entries.filter((entry) => entry.iso >= hostNowDateKey);
    }
    return entries;
  }, [daysMap, hostBaseDate, hostIsoFormatter, hostNowDateKey, hostWeekdayFormatter]);

  const availableDates = useMemo(() => availableDateEntries.map((entry) => entry.iso), [availableDateEntries]);
  const fullyBookedDates = useMemo(() => {
    const counts = new Map<string, number>();
    liveBookedSlots.forEach(({ date }) => {
      if (!date) return;
      counts.set(date, (counts.get(date) ?? 0) + 1);
    });
    const set = new Set<string>();
    availableDateEntries.forEach((entry) => {
      const slotCount = slotCountsByDay.get(entry.dayOfWeek) ?? 0;
      if (slotCount > 0) {
        const bookedCount = counts.get(entry.iso) ?? 0;
        if (bookedCount >= slotCount) {
          set.add(entry.iso);
        }
      }
    });
    return set;
  }, [availableDateEntries, liveBookedSlots, slotCountsByDay]);
  const bookedOutDates = useMemo(() => Array.from(fullyBookedDates), [fullyBookedDates]);

  const [visibleMonth, setVisibleMonth] = useState<Date | undefined>(() => availableDateEntries[0]?.date);
  const [slotsLoading, setSlotsLoading] = useState(true);

  useEffect(() => {
    if (!visibleMonth && availableDateEntries[0]) {
      setVisibleMonth(availableDateEntries[0].date);
    }
  }, [availableDateEntries, visibleMonth]);

  useEffect(() => {
    const timeout = setTimeout(() => setSlotsLoading(false), 0);
    return () => clearTimeout(timeout);
  }, [disabledSlots]);

  useEffect(() => {
    setLiveBookedSlots(bookedSlots);
  }, [bookedSlots]);

  useEffect(() => {
    setDisabledSlots(buildDisabledSlotMap(liveBookedSlots, hostTimezone));
  }, [liveBookedSlots, hostTimezone]);

  useEffect(() => {
    let isActive = true;
    const fetchSnapshot = async () => {
      try {
        const response = await fetch(`/api/scheduling/${encodeURIComponent(slug)}/availability`, {
          cache: 'no-store',
        });
        if (!response.ok) return;
        const payload = await response.json().catch(() => null);
        if (!isActive || !payload?.bookedSlots) return;
        setLiveBookedSlots(payload.bookedSlots);
      } catch (error) {
        console.error('refresh availability', error);
      }
    };
    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 15000);
    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [slug]);

  useEffect(() => {
    if (!selectedDate) {
      setSelectedHostIso(null);
      setSelectedDayOfWeek(null);
      setSelectedDayLabel('');
      return;
    }
    const weekday = hostWeekdayFormatter.format(selectedDate);
    const dayOfWeek = WEEKDAY_INDEX[weekday as keyof typeof WEEKDAY_INDEX] ?? selectedDate.getUTCDay();
    setSelectedDayOfWeek(dayOfWeek);
    setSelectedDayLabel(
      selectedDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      }),
    );
  }, [selectedDate, hostWeekdayFormatter]);

  const selectSlot = (slot: Slot): void => {
    setSelectedSlot(slot);
  };

  const getSlotDate = (dayOfWeek: number): Date => {
    const hostToday = WEEKDAY_INDEX[hostWeekdayFormatter.format(new Date())] ?? new Date().getDay();
    const diff = dayOfWeek >= hostToday ? dayOfWeek - hostToday : dayOfWeek - hostToday + 7;
    const slotDate = new Date(hostBaseDate);
    slotDate.setDate(slotDate.getDate() + diff);
    return slotDate;
  };

  const buildSlotIsoFromDate = useCallback(
    (date: Date, timeString: string): string => {
      const slotDate = new Date(date);
      const [hour, minute] = timeString.split(':').map(Number);
      slotDate.setHours(hour, minute, 0, 0);
      return slotDate.toISOString();
    },
    [],
  );

  const isPastSlot = (dateKey: string, timeKey: string): boolean => {
    if (!hostNowDateKey || !hostNowTimeKey) {
      return false;
    }
    if (dateKey < hostNowDateKey) return true;
    if (dateKey === hostNowDateKey && timeKey <= hostNowTimeKey) return true;
    return false;
  };

  const selectedDayFullLabel = useMemo(() => {
    if (!selectedDate) {
      return selectedDayLabel || 'Day';
    }
    return formatDateLocal(selectedDate.toISOString());
  }, [selectedDate, selectedDayLabel, formatDateLocal]);

  const selectedSlotLabel = useMemo(() => {
    if (!selectedSlot || !selectedDate) return 'Pick a slot above';
    const startIso = buildSlotIsoFromDate(selectedDate, selectedSlot.start);
    const endIso = buildSlotIsoFromDate(selectedDate, selectedSlot.end);
    const slotTimeLabel = `${formatTimeLocal(startIso)} - ${formatTimeLocal(endIso)}`;
    return `${selectedDayFullLabel} · ${slotTimeLabel}`;
  }, [selectedDayFullLabel, selectedSlot, selectedDate, buildSlotIsoFromDate, formatTimeLocal]);

  const slotButton = (day: DayAvailability, slot: Slot): JSX.Element => {
    const slotDateKey = selectedDate
      ? hostIsoFormatter.format(selectedDate)
      : selectedHostIso ?? hostIsoFormatter.format(getSlotDate(day.dayOfWeek));
    const isBooked = slotDateKey ? disabledSlots.get(slotDateKey)?.has(slot.start) ?? false : false;
    const isPast = slotDateKey && isPastSlot(slotDateKey, slot.start);
    const isSelected = selectedSlot?.label === slot.label && selectedDayOfWeek === day.dayOfWeek;
    const baseClasses = 'rounded-full px-3 py-1 text-xs font-semibold transition';
    const selectedClasses = 'border-brand-primary-600 bg-brand-primary-600 text-white';
    const defaultClasses = 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300';
    const bookedClasses = 'opacity-50 bg-gray-200 cursor-not-allowed border border-zinc-200 text-zinc-500 animate-pulse';
    const pastClasses = 'opacity-60 bg-zinc-100 cursor-not-allowed border border-zinc-200 text-zinc-400 transition duration-200 ease-out';
    const classes = isBooked
      ? `${baseClasses} ${bookedClasses}`
      : isPast
      ? `${baseClasses} ${pastClasses}`
      : isSelected
      ? `${baseClasses} ${selectedClasses}`
      : `${baseClasses} ${defaultClasses}`;
    const title = isBooked ? 'Already booked' : isPast ? 'This slot has already passed' : undefined;
    const isDisabled = Boolean(isBooked || isPast);
    return (
      <button
        key={`${day.dayOfWeek}-${slot.label}`}
        type="button"
        onClick={() => {
          if (isDisabled) return;
          selectSlot(slot);
        }}
        className={classes}
        disabled={isDisabled}
        title={title}
        aria-disabled={isDisabled || undefined}
      >
        {slot.label}
      </button>
    );
  };

  const slotsPanel = (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Open calendar</h2>
        <p className="text-xs text-zinc-500">Select a highlighted day to see its slots.</p>
      </div>
      <CalendarPicker
        availableDates={availableDates}
        bookedOutDates={bookedOutDates}
        selectedDate={selectedDate ?? undefined}
        onSelect={(date) => {
          if (!date) return;
          setSelectedDate(date);
          setSelectedHostIso(hostIsoFormatter.format(date));
          setSelectedSlot(null);
          setVisibleMonth(date);
        }}
        visibleMonth={visibleMonth}
        onMonthChange={setVisibleMonth}
        timeZone={hostTimezone}
      />
      <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Available slots</h2>
      {slotsLoading ? (
        <div className="flex h-24 items-center justify-center text-xs uppercase tracking-[0.3em] text-zinc-400">
          Loading slots…
        </div>
      ) : selectedDayOfWeek !== null ? (
        (() => {
          const dayEntry = daysMap.get(selectedDayOfWeek);
          if (!dayEntry) {
            return <p className="text-xs text-zinc-500">This day has no available slots.</p>;
          }
          return (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-zinc-900">{selectedDayFullLabel}</p>
              <div className="flex flex-wrap gap-2">
                {dayEntry.slots.map((slot) => slotButton(dayEntry, slot))}
              </div>
            </div>
          );
        })()
      ) : (
        <p className="text-xs text-zinc-500">Select a highlighted day on the calendar to reveal slots.</p>
      )}
    </div>
  );

  const markSlotAsBooked = (date: string, time: string): void => {
    setDisabledSlots((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(date) ?? []);
      set.add(time);
      next.set(date, set);
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (submitDisabled || !selectedSlot || !selectedDate) return;

    setStatus('loading');
    setErrorMessage(null);
    const slotDateKey = hostIsoFormatter.format(selectedDate);
    try {
      const start = new Date(selectedDate);
      const [startHour, startMinute] = selectedSlot.start.split(':').map(Number);
      start.setHours(startHour, startMinute, 0, 0);
      const end = new Date(selectedDate);
      const [endHour, endMinute] = selectedSlot.end.split(':').map(Number);
      end.setHours(endHour, endMinute, 0, 0);
      const startIso = start.toISOString();
      const endIso = end.toISOString();
      const response = await fetch(`/api/scheduling/${encodeURIComponent(slug)}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: name.trim(),
          clientEmail: email.trim(),
          clientPhone: phone.trim() || undefined,
          notes: notes.trim(),
          startTime: startIso,
          endTime: endIso,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        if (payload?.error?.toLowerCase().includes('already booked')) {
          markSlotAsBooked(slotDateKey, selectedSlot.start);
        }
        throw new Error(payload?.error ?? 'Failed to request booking.');
      }

      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
      setErrorMessage((error as Error).message);
    }
  };

  if (!hasSlots) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-6 text-sm text-zinc-500">
        No slots are available right now. Please check back later.
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        {slotsPanel}
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-700">
          <p className="text-lg font-semibold text-emerald-800">Booking confirmed!</p>
          <p className="mt-1">
            We sent a confirmation email with the details. Your selected slot ({selectedSlotLabel}) is reserved.
          </p>
          <p className="text-xs text-emerald-600 mt-3">
            Share this public link: <span className="font-mono">{bookingLink}</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {slotsPanel}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Book a slot</h2>
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Selected slot</p>
          <div className="h-12 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-900">
            {selectedSlotLabel}
          </div>
        </div>
        {!selectedSlot && <p className="text-xs text-zinc-500">Select a slot above before submitting.</p>}
        <div className="grid gap-3">
          <label className="text-xs text-zinc-500">
            Name
            <input
              name="clientName"
              autoComplete="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              placeholder="Your name"
              required
            />
          </label>
          <label className="text-xs text-zinc-500">
            Email
            <input
              name="clientEmail"
              autoComplete="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="text-xs text-zinc-500">
            Phone
            <input
              name="clientPhone"
              autoComplete="tel"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              placeholder="(555) 123-4567"
            />
          </label>
          <label className="text-xs text-zinc-500">
            Notes
            <textarea
              name="notes"
              autoComplete="off"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              placeholder="Let us know what you'd like to cover..."
            />
          </label>
        </div>
        {errorMessage && <p className="text-xs text-rose-500">{errorMessage}</p>}
        <button
          type="submit"
          disabled={submitDisabled}
          className="w-full rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-[var(--color-brand-contrast)] hover:bg-brand-primary-700 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {status === 'loading' && (
            <span className="block h-4 w-4 animate-spin rounded-full border-2 border-[rgba(255,255,255,0.3)] border-t-white" />
          )}
          {status === 'loading' ? 'Booking...' : 'Confirm booking'}
        </button>
      </form>
    </div>
  );
}
