"use client";

import React, { type JSX } from 'react';
import { FormEvent, useEffect, useMemo, useState } from 'react';

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
  startTime: string;
};

type BookingFormProps = {
  slug: string;
  days: DayAvailability[];
  bookingLink: string;
  bookedSlots: BookedSlot[];
};

export default function BookingFormClient({ slug, days, bookingLink, bookedSlots }: BookingFormProps): JSX.Element {
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);
  const [selectedDayLabel, setSelectedDayLabel] = useState('');
  const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const hasSlots = days.length > 0 && days.some((day) => day.slots.length > 0);
  const submitDisabled = !selectedSlot || !name.trim() || !email.trim() || status === 'loading';

  const selectSlot = (day: DayAvailability, slot: Slot): void => {
    setSelectedSlot(slot);
    setSelectedDayLabel(day.dayLabel);
    setSelectedDayOfWeek(day.dayOfWeek);
  };

  const getSlotDate = (dayOfWeek: number): string => {
    const today = new Date();
    const currentDay = today.getDay();
    const diff = dayOfWeek >= currentDay ? dayOfWeek - currentDay : dayOfWeek - currentDay + 7;
    const slotDate = new Date(today);
    slotDate.setDate(slotDate.getDate() + diff);
    return slotDate.toISOString().split('T')[0];
  };

  const selectedSlotLabel = useMemo(() => {
    if (!selectedSlot) return 'Pick a slot above';
    const slotDateLabel =
      selectedDayOfWeek !== null
        ? new Date(getSlotDate(selectedDayOfWeek)).toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })
        : selectedDayLabel;
    return `${slotDateLabel} · ${selectedSlot.label}`;
  }, [selectedDayLabel, selectedDayOfWeek, selectedSlot]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (submitDisabled || !selectedSlot) return;

    setStatus('loading');
    setErrorMessage(null);
    try {
      const slotDate = selectedDayOfWeek !== null ? getSlotDate(selectedDayOfWeek) : getSlotDate(new Date().getDay());
      const start = new Date(`${slotDate}T${selectedSlot.start}:00`);
      const end = new Date(`${slotDate}T${selectedSlot.end}:00`);

      const response = await fetch(`/api/scheduling/${encodeURIComponent(slug)}/bookings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: name.trim(),
          clientEmail: email.trim(),
          notes: notes.trim(),
          startTime: start.toISOString(),
          endTime: end.toISOString(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        if (payload?.error?.toLowerCase().includes('already booked') && selectedSlot) {
          const day = days.find((d) => d.dayLabel === selectedDayLabel);
          if (day && selectedDayOfWeek !== null) {
            const slotDate = getSlotDate(selectedDayOfWeek);
            markSlotAsBooked(slotDate, selectedSlot.start);
          }
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

  const [disabledSlots, setDisabledSlots] = useState<Map<string, Set<string>>>(() => {
    const map = new Map<string, Set<string>>();
    bookedSlots.forEach(({ date, startTime }) => {
      if (!map.has(date)) {
        map.set(date, new Set());
      }
      map.get(date)?.add(startTime);
    });
    return map;
  });

  const [slotsLoading, setSlotsLoading] = useState(true);

  // Removed unused getDateForDay function

  const markSlotAsBooked = (dayDate: string, startTime: string): void => {
    setDisabledSlots((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(dayDate) ?? []);
      set.add(startTime);
      next.set(dayDate, set);
      return next;
    });
  };

  useEffect(() => {
    const slotsLoadingTimeout: ReturnType<typeof setTimeout> = setTimeout(() => setSlotsLoading(false), 0);
    return () => {
      clearTimeout(slotsLoadingTimeout);
    };
  }, [disabledSlots]);

  const slotButton = (day: DayAvailability, slot: Slot): JSX.Element => {
    const slotDate = getSlotDate(day.dayOfWeek);
    const isBooked = disabledSlots.get(slotDate)?.has(slot.start) ?? false;
    const isSelected = selectedSlot?.label === slot.label && selectedDayLabel === day.dayLabel;
    const baseClasses = 'rounded-full px-3 py-1 text-xs font-semibold transition';
    const selectedClasses = 'border-brand-primary-600 bg-brand-primary-600 text-white';
    const defaultClasses = 'border-zinc-200 bg-zinc-50 text-zinc-600 hover:border-zinc-300';
    const bookedClasses = 'opacity-50 bg-gray-200 cursor-not-allowed border border-zinc-200 text-zinc-500';
    const classes = isBooked
      ? `${baseClasses} ${bookedClasses}`
      : isSelected
      ? `${baseClasses} ${selectedClasses}`
      : `${baseClasses} ${defaultClasses}`;
    return (
      <button
        key={`${day.dayOfWeek}-${slot.label}`}
        type="button"
        onClick={() => {
          if (isBooked) return;
          selectSlot(day, slot);
        }}
        className={classes}
        disabled={Boolean(isBooked)}
        title={isBooked ? 'Already booked' : undefined}
        aria-disabled={isBooked || undefined}
      >
        {slot.label}
      </button>
    );
  };

  const slotsPanel = (
    <div className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">Available slots</h2>
      {slotsLoading ? (
        <div className="flex h-24 items-center justify-center text-xs uppercase tracking-[0.3em] text-zinc-400">
          Loading slots…
        </div>
      ) : (
        days.map((day) => (
          <div key={`day-${day.dayOfWeek}-${day.dayLabel}`} className="space-y-2">
            <p className="text-sm font-semibold text-zinc-900">{day.dayLabel}</p>
            <div className="flex flex-wrap gap-2">
              {day.slots.map((slot) => (
                <React.Fragment key={`slot-${day.dayOfWeek}-${slot.label}-${slot.start}`}>{slotButton(day, slot)}</React.Fragment>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );

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
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              placeholder="you@example.com"
              required
            />
          </label>
          <label className="text-xs text-zinc-500">
            Notes
            <textarea
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
