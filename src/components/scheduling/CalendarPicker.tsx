"use client";

import { DayPicker, type NavProps, useDayPicker } from "react-day-picker";
import { useCallback, useMemo, type MouseEvent } from "react";

type CalendarPickerProps = {
  availableDates: string[];
  selectedDate: string | Date | undefined; // ISO string or Date
  onSelect: (iso: string | undefined) => void;
  visibleMonth?: Date;
  onMonthChange?: (month: Date | undefined) => void;
  allowUnavailableSelection?: boolean;
  bookedOutDates?: string[];
  timeZone?: string;
  allowBookedOutSelection?: boolean;
};

function CalendarNavigation({
  onPreviousClick,
  onNextClick,
  className,
  style,
}: NavProps) {
  const { months, nextMonth, previousMonth, goToMonth, labels } = useDayPicker();
  const currentMonth = months[0]?.date ?? new Date();

  const handlePreviousClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (!previousMonth) return;
      goToMonth(previousMonth);
      onPreviousClick?.(event);
    },
    [goToMonth, onPreviousClick, previousMonth],
  );

  const handleNextClick = useCallback(
    (event: MouseEvent<HTMLButtonElement>) => {
      if (!nextMonth) return;
      goToMonth(nextMonth);
      onNextClick?.(event);
    },
    [goToMonth, nextMonth, onNextClick],
  );

  const rootClassName = ["flex w-full items-center justify-between mb-4 px-2", className]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClassName} style={style}>
        <button
          type="button"
          onClick={handlePreviousClick}
          disabled={!previousMonth}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition hover:bg-zinc-100 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 text-zinc-700"
          aria-label={labels.labelPrevious(previousMonth)}
        >
          {"\u2190"}
        </button>
      <h2 className="text-lg font-semibold text-center flex-1 text-slate-900">
        {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
      </h2>
      <button
        type="button"
        onClick={handleNextClick}
        disabled={!nextMonth}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition hover:bg-zinc-100 focus-visible:border-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 ml-auto text-zinc-700"
        aria-label={labels.labelNext(nextMonth)}
      >
        {"\u2192"}
      </button>
    </div>
  );
}

export default function CalendarPicker({
  availableDates,
  selectedDate,
  onSelect,
  visibleMonth,
  onMonthChange,
  allowUnavailableSelection = false,
  bookedOutDates = [],
  timeZone = "UTC",
  allowBookedOutSelection = false,
}: CalendarPickerProps) {
  // Loading guard: only render calendar if data is loaded
  const isLoaded = Array.isArray(availableDates) && Array.isArray(bookedOutDates) && availableDates.length > 0;

  if (!isLoaded) {
    return (
      <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm text-center text-zinc-500">
        Loading calendar data...
      </div>
    );
  }
  // DEBUG: Log available, booked out, and selected dates, and computed availableSet
  // Place this log after all hooks and variable initializations
  const availableSet = useMemo(() => {
    const set = new Set<string>();
    const bookedSet = new Set(bookedOutDates ?? []);
    availableDates.forEach((dateStr) => {
      // Always treat dateStr as UTC
      if (bookedSet.has(dateStr)) return;
      set.add(dateStr);
    });
    return set;
  }, [availableDates, bookedOutDates]);

  const bookedOutDateObjects = useMemo(
    () =>
      (bookedOutDates ?? []).map((dateStr) => {
        const [year, month, day] = dateStr.split("-").map(Number);
        // Always construct as UTC
        return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
      }),
    [bookedOutDates],
  );

  const bookedOutSet = useMemo(() => new Set(bookedOutDates ?? []), [bookedOutDates]);

  // Get current visible month (default to today if not set)
  const currentMonth = visibleMonth || new Date(); // Get current visible month (default to today if not set)
  const monthStr = currentMonth.toISOString().slice(0, 7); // YYYY-MM
  const availableCount = Array.from(availableSet).filter(date => date.startsWith(monthStr)).length; // Count available dates
  const bookedCount = Array.from(bookedOutSet).filter(date => date.startsWith(monthStr)).length; // Count booked out dates

  setTimeout(() => {
    console.log('📅 CalendarPicker debug:', {
      availableDates,
      bookedOutDates,
      selectedDate,
      visibleMonth,
      timeZone,
      availableSet: Array.from(availableSet),
      bookedOutSet: Array.from(bookedOutSet),
    });
  }, 0);

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }),
    [timeZone],
  );

  const todayKey = useMemo(() => dateFormatter.format(new Date()), [dateFormatter]);

  const formatAsIso = useCallback(
    (date: Date | undefined) => {
      if (!date) return "";
      return dateFormatter.format(date);
    },
    [dateFormatter],
  );

  return (
    <div className="w-full rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-2 text-xs text-zinc-500">
        <span>Available days this month: <b>{availableCount}</b></span> | <span>Booked out days: <b>{bookedCount}</b></span>
      </div>
      <DayPicker
        components={{ Nav: CalendarNavigation }}
        mode="single"
        month={visibleMonth}
        selected={(() => {
          if (!selectedDate) return undefined;
          if (typeof selectedDate === 'string') {
            const [year, month, day] = selectedDate.split('-').map(Number);
            // Always construct as UTC
            return new Date(Date.UTC(year, month - 1, day, 12, 0, 0, 0));
          }
          return selectedDate;
        })()}
        showOutsideDays={false}
        onMonthChange={onMonthChange}
        onSelect={(date) => {
          if (!date) {
            onSelect(undefined);
            return;
          }
          const hostIso = dateFormatter.format(date);
          onSelect(hostIso);
        }}
        disabled={() => false} // All days clickable
        modifiers={{
          bookedOut: (date) => {
            const iso = formatAsIso(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0)));
            const inMonth = date.getUTCFullYear() === currentMonth.getUTCFullYear() && date.getUTCMonth() === currentMonth.getUTCMonth();
            return bookedOutSet.has(iso) && inMonth;
          },
          available: (date) => {
            const iso = formatAsIso(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0)));
            const inMonth = date.getUTCFullYear() === currentMonth.getUTCFullYear() && date.getUTCMonth() === currentMonth.getUTCMonth();
            return availableSet.has(iso) && !bookedOutSet.has(iso) && inMonth;
          },
          unavailable: (date) => {
            const iso = formatAsIso(new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0)));
            const inMonth = date.getUTCFullYear() === currentMonth.getUTCFullYear() && date.getUTCMonth() === currentMonth.getUTCMonth();
            return !availableSet.has(iso) && !bookedOutSet.has(iso) && inMonth;
          },
        }}
        modifiersClassNames={{
          bookedOut:
            "!bg-rose-100 !text-rose-700 font-semibold booked-out-day",
          available: "!bg-green-100 available-day",
          unavailable: "!bg-white !text-zinc-400 cursor-not-allowed unavailable-day",
          outside:
            "bg-white text-zinc-400 opacity-80 hover:!bg-white pointer-events-none !border-transparent !bg-white",
          selected: "!bg-green-100 available-day-selected",
        }}
        classNames={{
          root: "w-full",
          months: "w-full flex flex-col gap-2",
          month: "w-full",
          month_caption: "hidden",
          month_grid: "grid w-full",
          weekdays: "grid grid-cols-7 gap-0 py-2",
          weekday: "text-center text-zinc-500 text-xs font-semibold tracking-widest",
          week: "grid grid-cols-7 gap-0",
          day: "h-12 border-r border-b border-zinc-200 bg-white text-sm text-zinc-900 transition-colors rounded-none relative",
          day_outside:
            "text-zinc-400 opacity-60 cursor-not-allowed bg-white border-transparent rounded-none",
          day_button:
            "w-full h-full flex items-center justify-center transition duration-100 ease-in rounded-none transform relative z-10",
          day_disabled:
            "cursor-not-allowed opacity-60 text-zinc-400 bg-white border-transparent rounded-none",
        }}
        className="w-full"
      />
    </div>
  );
}
