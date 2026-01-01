"use client";

import { DayPicker, type NavProps, useDayPicker } from "react-day-picker";
import { useCallback, useMemo, type MouseEvent } from "react";

type CalendarPickerProps = {
  availableDates: string[];
  selectedDate: Date | undefined;
  onSelect: (date: Date | undefined) => void;
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
        className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition hover:bg-zinc-100"
        aria-label={labels.labelPrevious(previousMonth)}
      >
        {"\u2190"}
      </button>
      <h2 className="text-lg font-semibold text-center flex-1">
        {currentMonth.toLocaleString("default", { month: "long", year: "numeric" })}
      </h2>
      <button
        type="button"
        onClick={handleNextClick}
        disabled={!nextMonth}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white shadow-sm transition hover:bg-zinc-100 ml-auto"
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
  const availableDateObjects = useMemo(
    () =>
      availableDates
        .filter((dateStr) => !(bookedOutDates ?? []).includes(dateStr))
        .map((dateStr) => {
          const [year, month, day] = dateStr.split("-").map(Number);
          return new Date(year, month - 1, day, 12, 0, 0, 0);
        }),
    [availableDates, bookedOutDates],
  );

  const modifiers = useMemo(
    () => ({
      available: availableDateObjects,
    }),
    [availableDateObjects],
  );

  const availableSet = useMemo(() => {
    const set = new Set<string>();
    const bookedSet = new Set(bookedOutDates ?? []);
    availableDates.forEach((dateStr) => {
      if (bookedSet.has(dateStr)) return;
      set.add(dateStr);
    });
    return set;
  }, [availableDates, bookedOutDates]);

  const bookedOutDateObjects = useMemo(
    () =>
      (bookedOutDates ?? []).map((dateStr) => {
        const [year, month, day] = dateStr.split("-").map(Number);
        return new Date(year, month - 1, day, 12, 0, 0, 0);
      }),
    [bookedOutDates],
  );

  const bookedOutSet = useMemo(() => new Set(bookedOutDates ?? []), [bookedOutDates]);

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
      <DayPicker
        components={{ Nav: CalendarNavigation }}
        mode="single"
        month={visibleMonth}
        selected={selectedDate}
        showOutsideDays={false}
        onMonthChange={onMonthChange}
        onSelect={(date) => {
          if (date) {
            const iso = formatAsIso(date);
            if (!availableSet.has(iso) && !allowUnavailableSelection) {
              return;
            }
          }
          onSelect(date);
        }}
        disabled={(date) => {
          if (!date) return true;
          const iso = formatAsIso(date);
          if (iso < todayKey) return true;
          if (bookedOutSet.has(iso) && !allowBookedOutSelection) return true;
          if (allowUnavailableSelection) return false;
          return !availableSet.has(iso);
        }}
        modifiers={{
          ...modifiers,
          bookedOut: bookedOutDateObjects,
        }}
        modifiersClassNames={{
          available:
            "bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200 shadow-sm hover:bg-emerald-100 !bg-emerald-50",
          bookedOut:
            "bg-rose-50 text-rose-700 font-semibold border border-rose-200 shadow-sm hover:bg-rose-100 !bg-rose-50 !text-rose-700 !border-rose-200",
          selected:
            "bg-white text-brand-primary-600 text-base font-semibold rounded-full border border-brand-primary-200 shadow-lg transition duration-150 ease-out scale-105",
          outside:
            "bg-white text-zinc-400 opacity-80 hover:!bg-white pointer-events-none !border-transparent !bg-white",
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
          day: "h-12 flex items-center justify-center border-r border-b border-zinc-200 bg-white text-sm text-zinc-900 transition-colors rounded-none",
          day_outside:
            "text-zinc-400 opacity-60 cursor-not-allowed bg-white border-transparent rounded-none",
          day_button:
            "w-full h-full flex items-center justify-center transition duration-100 ease-in rounded-none transform",
          day_disabled:
            "cursor-not-allowed opacity-60 text-zinc-400 bg-white border-transparent rounded-none",
        }}
        className="w-full"
      />
    </div>
  );
}
