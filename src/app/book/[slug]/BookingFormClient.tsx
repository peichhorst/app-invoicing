"use client";

import { FormEvent, type JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import CalendarPicker from '@/components/scheduling/CalendarPicker';
import {
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  type CalendarEvent,
} from '@/lib/calendar';

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

const makeBookingKey = (slot: BookedSlot) => `${slot.date}:${slot.startTime}`;

type BookingFormProps = {
  slug: string;
  days: DayAvailability[];
  bookingLink: string;
  bookedSlots: BookedSlot[];
  hostTimezone: string;
  ownerId?: string;
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

const parseSlotMinutes = (time: string) => {
  const [hour, minute] = time.split(':').map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
};

const COMMON_TIME_ZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Tokyo',
  'Australia/Sydney',
];


const buildDisabledSlotMap = (slots: BookedSlot[], timeZone: string) => {
  const map = new Map<string, Set<string>>();
  slots.forEach((slot) => {
    if (!slot.date) return;
    const dateKey = slot.date;
    const timeKey = slot.startTime; // Always use 24-hour format
    console.log('ðŸ” Building disabled slot:', {
      dateKey,
      timeKey,
    });
    if (!map.has(dateKey)) {
      map.set(dateKey, new Set());
    }
    map.get(dateKey)?.add(timeKey);
  });
  return map;
};



export default function BookingFormClient({
  slug,
  days,
  bookingLink,
  bookedSlots,
  hostTimezone = 'America/Los_Angeles',
  ownerId,
}: BookingFormProps): JSX.Element {
  const [displayTimezone, setDisplayTimezone] = useState<string>(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return browserTz || hostTimezone;
  });

  const formatTimeInTimezone = useCallback(
    (isoString: string, timeZone: string) =>
      new Date(isoString).toLocaleTimeString('en-US', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    [],
  );

  const formatDateInTimezone = useCallback(
    (isoString: string, timeZone: string) =>
      new Date(isoString).toLocaleDateString('en-US', {
        timeZone,
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [],
  );

  const formatDateLocal = useCallback(
    (isoString: string) => formatDateInTimezone(isoString, displayTimezone),
    [displayTimezone, formatDateInTimezone],
  );

  const timezoneOptions = useMemo(() => {
    const browserTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return Array.from(
      new Set([browserTz, hostTimezone, ...COMMON_TIME_ZONES].filter(Boolean) as string[]),
    ).sort();
  }, [hostTimezone]);

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
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingStartTime, setBookingStartTime] = useState<string | null>(null);
  const [bookingEndTime, setBookingEndTime] = useState<string | null>(null);
  const [disabledSlots, setDisabledSlots] = useState<Map<string, Set<string>>>(() =>
    buildDisabledSlotMap(bookedSlots, hostTimezone),
  );

  useEffect(() => {
    console.log('ðŸ” DEBUG: Initial bookedSlots received:', {
      count: bookedSlots.length,
      slots: bookedSlots.slice(0, 5),
    });
    console.log('ðŸ” DEBUG: Disabled slots map:', {
      size: disabledSlots.size,
      entries: Array.from(disabledSlots.entries()).map(([date, times]) => ({
        date,
        times: Array.from(times),
      })),
    });
  }, []);

  useEffect(() => {
    const heading = document.getElementById('booking-request-header');
    if (!heading) return;
    if (status === 'success') {
      heading.classList.add('hidden');
    } else {
      heading.classList.remove('hidden');
    }
    return () => {
      heading.classList.remove('hidden');
    };
  }, [status]);

  const hasSlots = days.length > 0 && days.some((day) => day.slots.length > 0);
  const submitDisabled = !selectedSlot || !name.trim() || !email.trim() || !phone.trim() || status === 'loading';

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

  const bookingKeysRef = useRef<Set<string>>(new Set());

  const processIncomingSlots = useCallback(
    (slots: BookedSlot[]) => {
      if (!slots?.length) return [];
      const newSlots: BookedSlot[] = [];
      slots.forEach((slot) => {
        const key = makeBookingKey(slot);
        if (!bookingKeysRef.current.has(key)) {
          bookingKeysRef.current.add(key);
          newSlots.push(slot);
        }
      });
      if (!newSlots.length) return [];
      setLiveBookedSlots((prev) => {
        const updated = [...prev, ...newSlots];
        setDisabledSlots(buildDisabledSlotMap(updated, hostTimezone));
        return updated;
      });
      return newSlots;
    },
    [hostTimezone],
  );

  const snapshotSyncedRef = useRef(false);

  const updateFromSnapshot = useCallback(
    (slots: BookedSlot[]) => {
      const prevKeys = new Set(bookingKeysRef.current);
      const nextKeys = new Set<string>();
      const newlyAdded: BookedSlot[] = [];
      slots.forEach((slot) => {
        const key = makeBookingKey(slot);
        nextKeys.add(key);
        if (!prevKeys.has(key)) {
          newlyAdded.push(slot);
        }
      });
      bookingKeysRef.current = nextKeys;
      setLiveBookedSlots([...slots]);
      setDisabledSlots(buildDisabledSlotMap(slots, hostTimezone));
      return newlyAdded;
    },
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

  const meetingLengthLabel = useMemo(() => {
    const durations = new Set<number>();
    days.forEach((day) => {
      day.slots.forEach((slot) => {
        const start = parseSlotMinutes(slot.start);
        const end = parseSlotMinutes(slot.end);
        if (start === null || end === null) return;
        const duration = end - start;
        if (duration > 0) durations.add(duration);
      });
    });
    const values = Array.from(durations).sort((a, b) => a - b);
    if (!values.length) return null;
    if (values.length === 1) return `${values[0]} minutes`;
    return `${values[0]}-${values[values.length - 1]} minutes`;
  }, [days]);

  const availableDateEntries = useMemo(() => {
    const entries: { date: Date; iso: string; dayOfWeek: number }[] = [];
    const horizonDays = 6 * 30; // ~6 months
    for (let offset = 0; offset < horizonDays; offset += 1) {
      // Use UTC midnight for candidate, then format with host TZ
      const base = new Date(Date.UTC(hostBaseDate.getFullYear(), hostBaseDate.getMonth(), hostBaseDate.getDate()));
      base.setUTCDate(base.getUTCDate() + offset);
      // Format with host timezone
      const weekday = hostWeekdayFormatter.format(base);
      const dayOfWeek = WEEKDAY_INDEX[weekday as keyof typeof WEEKDAY_INDEX] ?? base.getUTCDay();
      if (!daysMap.has(dayOfWeek)) continue;
      entries.push({ date: new Date(base), iso: hostIsoFormatter.format(base), dayOfWeek });
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
    updateFromSnapshot(bookedSlots);
  }, [bookedSlots, updateFromSnapshot]);

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
        
        console.log('ðŸ” DEBUG: Fetched availability snapshot:', {
          bookedSlotsCount: payload.bookedSlots.length,
          firstFewSlots: payload.bookedSlots.slice(0, 5),
        });
        
        updateFromSnapshot(payload.bookedSlots);
        snapshotSyncedRef.current = true;
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

  const buildUtcIsoFromHostDateKey = useCallback(
    (hostDateKey: string, timeString: string): string => {
      const [hour, minute] = timeString.split(':').map(Number);
      const localDateTimeStr = `${hostDateKey} ${hour.toString().padStart(2, '0')}:${minute
        .toString()
        .padStart(2, '0')}`;
      return fromZonedTime(localDateTimeStr, hostTimezone).toISOString();
    },
    [hostTimezone],
  );

  const isPastSlot = (dateKey: string, timeKey: string): boolean => {
    if (!hostNowDateKey || !hostNowTimeKey) {
      return false;
    }
    // Build slot datetime in host timezone
    const [slotHour, slotMinute] = timeKey.split(':').map(Number);
    const [year, month, day] = dateKey.split('-').map(Number);
    const slotDateTime = new Date(year, month - 1, day, slotHour, slotMinute, 0, 0);
    // Get current datetime in host timezone
    const now = new Date();
    // If slot datetime is before now, it's past
    return slotDateTime < now;
  };

  const selectedDayFullLabel = useMemo(() => {
    if (!selectedDate) {
      return selectedDayLabel || 'Day';
    }
    return formatDateLocal(selectedDate.toISOString());
  }, [selectedDate, selectedDayLabel, formatDateLocal]);

  const selectedSlotLabel = useMemo(() => {
    if (!selectedSlot || !selectedHostIso) return '';
    const startIso = buildUtcIsoFromHostDateKey(selectedHostIso, selectedSlot.start);
    const endIso = buildUtcIsoFromHostDateKey(selectedHostIso, selectedSlot.end);
    const viewerTimeLabel = `${formatTimeInTimezone(startIso, displayTimezone)} - ${formatTimeInTimezone(
      endIso,
      displayTimezone,
    )} (${displayTimezone})`;

    if (displayTimezone === hostTimezone) {
      return `${selectedDayFullLabel} · ${viewerTimeLabel}`;
    }

    const hostDateLabel = formatDateInTimezone(startIso, hostTimezone);
    const hostTimeLabel = `${formatTimeInTimezone(startIso, hostTimezone)} - ${formatTimeInTimezone(
      endIso,
      hostTimezone,
    )} (${hostTimezone})`;
    const hostSegment =
      hostDateLabel === selectedDayFullLabel
        ? hostTimeLabel
        : `${hostDateLabel} · ${hostTimeLabel}`;

    return `${selectedDayFullLabel} · ${viewerTimeLabel} · Host: ${hostSegment}`;
  }, [
    selectedDayFullLabel,
    selectedSlot,
    selectedHostIso,
    buildUtcIsoFromHostDateKey,
    formatTimeInTimezone,
    formatDateInTimezone,
    displayTimezone,
    hostTimezone,
  ]);

  const hasSelectedDateTime = Boolean(selectedSlot && selectedDate);

// In slotButton function, add at the top:
  const slotButton = (day: DayAvailability, slot: Slot): JSX.Element => {
    const slotDateKey = selectedDate
      ? hostIsoFormatter.format(selectedDate)
      : selectedHostIso ?? hostIsoFormatter.format(getSlotDate(day.dayOfWeek));

    // Use slot.start directly for comparison
    const slotTime = slot.start;
    const blockedTimes = slotDateKey ? disabledSlots.get(slotDateKey) : undefined;


    // DEBUG: Log every slot render for troubleshooting
    console.log('ðŸ” Slot button render:', {
      slotDateKey,
      slotStart: slot.start,
      slotTime,
      blockedTimesForThisDate: blockedTimes ? Array.from(blockedTimes) : null,
      isBooked: blockedTimes ? blockedTimes.has(slotTime) : false,
      isPast: slotDateKey && isPastSlot(slotDateKey, slotTime),
      isSelected: selectedSlot?.label === slot.label && selectedDayOfWeek === day.dayOfWeek,
    });

    const isBooked = blockedTimes ? blockedTimes.has(slotTime) : false;
    // Check if slot is in the past
    const isPast = slotDateKey && isPastSlot(slotDateKey, slotTime);
    // Check if slot is currently selected
    const isSelected = selectedSlot?.label === slot.label && selectedDayOfWeek === day.dayOfWeek;
    // Determine classes
    const baseClasses = 'rounded-full px-3 py-1 text-xs font-semibold transition border';
    const selectedClasses = 'border-brand-primary-600 bg-brand-primary-600 text-white';
    const defaultClasses = 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300 hover:bg-zinc-100';
    const bookedClasses = 'bg-zinc-300 text-zinc-500 cursor-not-allowed border-zinc-300 line-through';
    const pastClasses = 'bg-zinc-100 text-zinc-400 cursor-not-allowed border-zinc-200 opacity-50';
    let classes: string;
    if (isBooked) {
      classes = `${baseClasses} ${bookedClasses}`;
    } else if (isPast) {
      classes = `${baseClasses} ${pastClasses}`;
    } else if (isSelected) {
      classes = `${baseClasses} ${selectedClasses}`;
    } else {
      classes = `${baseClasses} ${defaultClasses}`;
    }
    const title = isBooked ? 'Already booked' : isPast ? 'This slot has passed' : undefined;
    const isDisabled = Boolean(isBooked || isPast);
    const slotDisplayLabel =
      slotDateKey && displayTimezone
        ? `${formatInTimeZone(
            buildUtcIsoFromHostDateKey(slotDateKey, slot.start),
            displayTimezone,
            'h:mm a',
          )} - ${formatInTimeZone(
            buildUtcIsoFromHostDateKey(slotDateKey, slot.end),
            displayTimezone,
            'h:mm a',
          )}`
        : slot.label;
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
        {slotDisplayLabel}
      </button>
    );
  };

  const slotsPanel = (
    <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-1 flex flex-wrap items-center justify-center gap-2">
        <label className="inline-flex items-center gap-1 text-xs text-zinc-500" htmlFor="booking-timezone-select">
          <svg className="h-3.5 w-3.5 text-brand-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 10c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm0-18C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
          </svg>
          Time zone
        </label>
        <select
          id="booking-timezone-select"
          value={displayTimezone}
          onChange={(event) => setDisplayTimezone(event.target.value)}
          className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
        >
          {timezoneOptions.map((tz) => (
            <option key={tz} value={tz}>
              {tz}
            </option>
          ))}
        </select>
        {displayTimezone !== hostTimezone && (
          <span className="text-[11px] text-zinc-500">Host timezone: {hostTimezone}</span>
        )}
      </div>
      <CalendarPicker
        availableDates={availableDates}
        bookedOutDates={bookedOutDates}
        selectedDate={selectedHostIso ?? undefined}
        onSelect={(dateOrIso) => {
          if (!dateOrIso) return;
          // Always normalize to host ISO string for selection
          let iso: string;
          if (typeof dateOrIso === 'string') {
            iso = dateOrIso;
          } else {
            iso = hostIsoFormatter.format(dateOrIso);
          }
          const entry = availableDateEntries.find(e => e.iso === iso);
          if (!entry) {
            console.warn('No availability entry for clicked date', iso);
            return;
          }
          setSelectedDate(entry.date); // If you need Date object for state
          setSelectedHostIso(iso);
          setSelectedSlot(null);
          setVisibleMonth(entry.date);
        }}
        visibleMonth={visibleMonth}
        onMonthChange={setVisibleMonth}
        timeZone={hostTimezone}
      />
      {selectedDayOfWeek !== null && (
        <p className="text-sm font-semibold text-zinc-900">{selectedDayFullLabel}</p>
      )}
      {meetingLengthLabel && (
        <p className="text-xs text-zinc-500">
          Meeting length: <span className="font-semibold text-zinc-700">{meetingLengthLabel}</span>
        </p>
      )}
      {slotsLoading ? null : selectedDayOfWeek !== null ? (
        (() => {
          const dayEntry = daysMap.get(selectedDayOfWeek);
          if (!dayEntry) {
            return <p className="text-xs text-zinc-500">This day has no available slots.</p>;
          }
          return (
            <div className="space-y-2">
                    <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Available Time Slots</h2>

              <div className="flex flex-wrap gap-2">
                {dayEntry.slots.map((slot) => slotButton(dayEntry, slot))}
              </div>
            </div>
          );
        })()
      ) : null}
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
      // Always use hostTimezone (profile/user setting) for conversion
      const slotDateKey = hostIsoFormatter.format(selectedDate);
      const startIso = buildUtcIsoFromHostDateKey(slotDateKey, selectedSlot.start);
      const endIso = buildUtcIsoFromHostDateKey(slotDateKey, selectedSlot.end);

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

      const responseData = await response.json();
      setBookingId(responseData.bookingId || null);
      setBookingStartTime(startIso);
      setBookingEndTime(endIso);

      const newBookedSlot: BookedSlot = {
        date: slotDateKey,
        startTime: startIso,
        localTime: selectedSlot.label,
      };
      processIncomingSlots([newBookedSlot]);
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
    // Generate calendar links
    let calendarLinks: JSX.Element | null = null;
    if (bookingStartTime && bookingEndTime) {
      const calendarEvent: CalendarEvent = {
        title: `Meeting`,
        description: notes || 'Booking',
        location: 'Online / Phone',
        startTime: new Date(bookingStartTime),
        endTime: new Date(bookingEndTime),
        attendeeEmail: email,
        attendeeName: name,
      };

      const appBase = typeof window !== 'undefined' ? window.location.origin : '';
      const googleCalUrl = generateGoogleCalendarUrl(calendarEvent);
      const outlookCalUrl = generateOutlookCalendarUrl(calendarEvent);
      const icsUrl = bookingId ? `${appBase}/api/calendar/ics?bookingId=${bookingId}` : '#';

      calendarLinks = (
        <div className="mt-4 pt-4 border-t border-emerald-200">
          <p className="text-sm font-semibold text-emerald-800 mb-3">ðŸ“… Add to Calendar</p>
          <div className="flex flex-col gap-2">
            <a
              href={googleCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-emerald-600 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors font-medium text-sm"
            >
              ðŸ—“ï¸ Google Calendar
            </a>
            <a
              href={outlookCalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-emerald-600 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors font-medium text-sm"
            >
              ðŸ“… Outlook
            </a>
            <a
              href={icsUrl}
              download="booking.ics"
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-emerald-600 text-emerald-700 rounded-lg hover:bg-emerald-50 transition-colors font-medium text-sm"
            >
              ðŸŽ Apple Calendar
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-700">
        <p className="text-lg font-semibold text-emerald-800">Booking confirmed!</p>
        <p className="mt-1">
          We sent a confirmation email with the details. Your selected slot ({selectedSlotLabel}) is reserved.
        </p>
        {calendarLinks}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-emerald-600">
            Share this public link: <span className="font-mono">{bookingLink}</span>
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-primary-700"
          >
            Book Another
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {slotsPanel}
      <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        {hasSelectedDateTime && (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Selected Date & Time:</p>
            <div className="h-9 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm font-semibold text-zinc-900">
              {selectedSlotLabel}
            </div>
          </div>
        )}
        <div className="grid gap-3">
          <label className="text-xs text-zinc-500">
            Name <span className="text-brand-primary-600">*</span>
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
            Email <span className="text-brand-primary-600">*</span>
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
            Phone <span className="text-brand-primary-600">*</span>
            <input
              name="clientPhone"
              autoComplete="tel"
              type="tel"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              placeholder="(555) 123-4567"
              required
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


