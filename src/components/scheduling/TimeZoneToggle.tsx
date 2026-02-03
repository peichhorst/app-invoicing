"use client";

import { DEFAULT_BUSINESS_TIME_ZONE } from "@/lib/timezone";

type TimeZoneOption = {
  label: string;
  value: string;
};

const TIME_ZONE_OPTIONS: TimeZoneOption[] = [
  { label: "Pacific (US)", value: DEFAULT_BUSINESS_TIME_ZONE },
  { label: "UTC", value: "UTC" },
];

type TimeZoneToggleProps = {
  timeZone: string;
  onChange: (value: string) => void;
};

export default function TimeZoneToggle({ timeZone, onChange }: TimeZoneToggleProps) {
  return (
    <div className="flex gap-1">
      {TIME_ZONE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
            timeZone === option.value
              ? "border-brand-primary-600 bg-brand-primary-600 text-white"
              : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-300"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
