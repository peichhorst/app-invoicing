'use client';
import { useTransition } from 'react';
import { daysOfWeek } from './helpers';
import { postAvailability, type AvailabilityEntry } from './actions';

type SchedulingFormProps = {
  availability: AvailabilityEntry[];
  bookingLink?: string | null;
  heading?: string;
  onSubmit?: () => void;
};

export function SchedulingForm({ availability, bookingLink, heading, onSubmit }: SchedulingFormProps) {
  const availabilityMap = new Map(availability.map((entry) => [entry.dayOfWeek, entry]));
  const [isPending, startTransition] = useTransition();

  return (
      <form
        action={postAvailability}
        onSubmit={(event) => {
          if (!onSubmit) return;
          startTransition(() => onSubmit());
        }}
        className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
      {heading ? (
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-600">{heading}</p>
          <h2 className="text-lg font-semibold text-zinc-900">Availability</h2>
          <p className="text-sm text-zinc-500">Set the days and times you are available for bookings.</p>
        </div>
      ) : (
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-zinc-900">Availability</h2>
          <p className="text-sm text-zinc-500">Set the days and times you are available for bookings.</p>
        </div>
      )}

      {bookingLink && (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-brand-primary-700">
          Public booking link:
          <a
            className="ml-1 font-mono underline"
            href={bookingLink}
            target="_blank"
            rel="noreferrer"
          >
            {bookingLink}
          </a>
        </div>
      )}

      {daysOfWeek.map(({ label, value }) => {
        const saved = availabilityMap.get(value);
        return (
        <div
          key={value}
          className="space-y-3 border-b border-zinc-100 pb-3 last:border-none last:pb-0">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-900">{label}</h3>
            <label className="flex items-center gap-1 text-xs uppercase tracking-[0.3em] text-zinc-500">
              <input type="checkbox" name={`active-${value}`} defaultChecked={Boolean(saved && saved.isActive)} />
              Available
            </label>
          </div>
          <div className="grid gap-3 md:grid-cols-4 text-xs text-zinc-500">
            <div className="grid gap-1">
              <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Start</label>
              <input
                name={`start-${value}`}
                type="time"
                defaultValue={saved?.startTime ?? '09:00'}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">End</label>
              <input
                name={`end-${value}`}
                type="time"
                defaultValue={saved?.endTime ?? '17:00'}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Duration (min)</label>
              <input
                name={`duration-${value}`}
                type="number"
                min={15}
                step={5}
                defaultValue={saved?.duration ?? 30}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              />
            </div>
            <div className="grid gap-1">
              <label className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Buffer (min)</label>
              <input
                name={`buffer-${value}`}
                type="number"
                min={0}
                step={5}
                defaultValue={saved?.buffer ?? 0}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              />
            </div>
          </div>
        </div>
      );
    })}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-6 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] hover:bg-brand-primary-700 disabled:opacity-60"
        >
          {isPending && (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          Save
        </button>
      </div>
    </form>
  );
}
