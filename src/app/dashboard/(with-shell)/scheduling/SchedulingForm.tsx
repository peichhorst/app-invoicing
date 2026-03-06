'use client';
import { useTransition, useState, useMemo } from 'react';
import { daysOfWeek } from './helpers';
import { postAvailability, type AvailabilityEntry } from './actions';
import { Copy, Check, AlertCircle, ChevronDown } from 'lucide-react';

type SchedulingFormProps = {
  availability: AvailabilityEntry[];
  bookingLink?: string | null;
  heading?: string;
  embedSnippet?: string | null;
  showBookingLink?: boolean;
  showEmbedSnippet?: boolean;
  allowedTypeLabels?: string[];
  onSubmit?: () => void;
  initialMeetingTypes?: {
    enablePhone?: boolean;
    enableVideo?: boolean;
    enableInPerson?: boolean;
  };
  userId?: string | null;
  isOnboarding?: boolean;
  timezone?: string;
};

type MeetingType = 'phone' | 'video' | 'inPerson';

export function SchedulingForm({
  availability,
  bookingLink,
  showBookingLink = true,
  showEmbedSnippet = true,
  heading,
  embedSnippet,
  allowedTypeLabels = [],
  onSubmit,
  initialMeetingTypes = {},
  userId,
  isOnboarding = false,
  timezone = 'UTC',
}: SchedulingFormProps) {
  const availabilityMap = new Map(availability.map((entry) => [entry.dayOfWeek, entry]));
  const bannerHeadingClass =
    'text-xl font-bold uppercase tracking-[0.3em] bg-brand-primary-600 text-[var(--color-brand-contrast)] px-4 py-2 text-center';
  const [activeDays, setActiveDays] = useState<Record<number, boolean>>(() => {
    const next: Record<number, boolean> = {};
    for (const { value } of daysOfWeek) {
      next[value] = Boolean(availabilityMap.get(value)?.isActive);
    }
    return next;
  });
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  
  // Meeting type states
  const [enablePhone, setEnablePhone] = useState(initialMeetingTypes.enablePhone ?? true);
  const [enableVideo, setEnableVideo] = useState(initialMeetingTypes.enableVideo ?? false);
  const [enableInPerson, setEnableInPerson] = useState(initialMeetingTypes.enableInPerson ?? false);
  
  // UI states
  const [copied, setCopied] = useState(false);
  const [copiedBookingLink, setCopiedBookingLink] = useState(false);
  const [savingType, setSavingType] = useState<MeetingType | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [availabilityAccordionOpen, setAvailabilityAccordionOpen] = useState(false);

  const hasAnyActiveDay = useMemo(
    () => Object.values(activeDays).some(Boolean),
    [activeDays]
  );

  const activeDaySummaries = useMemo(
    () =>
      daysOfWeek
        .filter(({ value }) => activeDays[value])
        .map(({ label, value }) => {
          const selected = availabilityMap.get(value);
          if (!selected) {
            return `${label}: Not saved yet`;
          }
          return `${label}: ${selected.startTime} - ${selected.endTime} (${selected.duration}m + ${selected.buffer}m buffer)`;
        }),
    [activeDays, availabilityMap]
  );

  const handleCopyEmbed = async () => {
    if (!computedEmbedSnippet) return;
    try {
      await navigator.clipboard.writeText(computedEmbedSnippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      setError('Failed to copy to clipboard');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleCopyBookingLink = async () => {
    if (!bookingLink) return;
    try {
      await navigator.clipboard.writeText(bookingLink);
      setCopiedBookingLink(true);
      setTimeout(() => setCopiedBookingLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy booking link:', err);
      setError('Failed to copy booking link');
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleMeetingTypeChange = async (type: MeetingType, enabled: boolean) => {
    // Store previous state for rollback
    const previousState = { enablePhone, enableVideo, enableInPerson };
    
    // Optimistic update
    if (type === 'phone') setEnablePhone(enabled);
    if (type === 'video') setEnableVideo(enabled);
    if (type === 'inPerson') setEnableInPerson(enabled);
    
    setSavingType(type);
    setError(null);
    
    try {
      const payload: Record<string, boolean> = {
        [`enable${type.charAt(0).toUpperCase()}${type.slice(1)}`]: enabled
      };
      
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json"
        },
        credentials: "include", // Include cookies for CSRF protection
        body: JSON.stringify(payload),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update meeting type");
      }
    } catch (err) {
      console.error("Error updating meeting type:", err);
      
      // Revert to previous state
      setEnablePhone(previousState.enablePhone);
      setEnableVideo(previousState.enableVideo);
      setEnableInPerson(previousState.enableInPerson);
      
      setError(`Failed to update meeting type. Please try again.`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setSavingType(null);
    }
  };

  const computedEmbedSnippet = useMemo(() => {
    if (!embedSnippet || !userId) return embedSnippet;
    
    const enabledTypes: string[] = [];
    if (enablePhone) enabledTypes.push('phone');
    if (enableVideo) enabledTypes.push('video');
    if (enableInPerson) enabledTypes.push('inperson');
    
    const typesString = enabledTypes.length > 0 
      ? enabledTypes.join(',') 
      : 'phone,video,inperson';
    
    return embedSnippet.replace(
      /data-type="[^"]*"/,
      `data-type="${typesString}"`
    );
  }, [embedSnippet, userId, enablePhone, enableVideo, enableInPerson]);

  return (
    <form
      action={postAvailability}
      onSubmit={(event) => {
        setSaved(false);
        startTransition(async () => {
          if (onSubmit) {
            await onSubmit();
          }
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        });
      }}
      className="rounded-2xl border border-brand-primary-600 bg-white shadow-sm"
    >
      <h2 className={`${bannerHeadingClass} rounded-t-2xl`}>
        Booking Settings
      </h2>
      <div className="space-y-6 p-6">

   






      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Share & Embed */}
      {(showBookingLink || showEmbedSnippet) && (
        <div
          className={`space-y-3 rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm ${
            hasAnyActiveDay ? '' : 'opacity-60'
          }`}
          aria-disabled={!hasAnyActiveDay}
        >
          <h3 className={`${bannerHeadingClass} rounded-xl`}>
            Share & Embed
          </h3>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">
                Share your booking page or embed the scheduler on your site.
              </p>
              {!hasAnyActiveDay && (
                <p className="mt-1 text-xs font-medium text-amber-700">
                  Select at least one availability day to enable share and embed.
                </p>
              )}
            </div>
          </div>

          {activeDaySummaries.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50">
              <button
                type="button"
                onClick={() => setAvailabilityAccordionOpen((prev) => !prev)}
                className="flex w-full items-center justify-between px-3 py-2 text-left"
              >
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-600">
                  Availability slots ({activeDaySummaries.length})
                </span>
                <ChevronDown
                  className={`h-4 w-4 text-zinc-500 transition-transform ${
                    availabilityAccordionOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {availabilityAccordionOpen && (
                <div className="border-t border-zinc-200 px-3 py-2">
                  <ul className="space-y-1 text-xs text-zinc-700">
                    {activeDaySummaries.map((summary) => (
                      <li key={summary}>{summary}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {showBookingLink && bookingLink && (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-brand-primary-700">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  Public booking link:
                  <a
                    className={`ml-1 font-mono underline ${hasAnyActiveDay ? '' : 'pointer-events-none opacity-60'}`}
                    href={bookingLink}
                    target={hasAnyActiveDay ? '_blank' : undefined}
                    rel={hasAnyActiveDay ? 'noreferrer' : undefined}
                  >
                    {bookingLink}
                  </a>
                </div>
                <button
                  type="button"
                  onClick={handleCopyBookingLink}
                  disabled={!hasAnyActiveDay}
                  className="inline-flex items-center gap-2 rounded-lg border border-brand-primary-300 bg-brand-primary-600 px-3 py-2 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:border-brand-primary-600 hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-300 disabled:text-zinc-600"
                >
                  {copiedBookingLink ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {showEmbedSnippet && computedEmbedSnippet && (
            <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-500">
                    Paste this snippet onto your site.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyEmbed}
                  disabled={!hasAnyActiveDay}
                  className="rounded-lg border border-brand-primary-300 bg-brand-primary-600 px-3 py-2 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:border-brand-primary-600 hover:bg-brand-primary-700 flex items-center gap-2 disabled:cursor-not-allowed disabled:border-zinc-200 disabled:bg-zinc-300 disabled:text-zinc-600"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              <div className="rounded-lg bg-zinc-900/5 px-3 py-2 text-xs text-zinc-600">
                <code className="whitespace-pre-wrap block font-mono">{computedEmbedSnippet}</code>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Meeting Types Cards */}
      <div className="space-y-3">
        <div>
          <h3 className={`${bannerHeadingClass} rounded-xl`}>
            Meeting Types
          </h3>
          <p className="text-sm text-zinc-500">Select which meeting types clients can book with you.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {/* Phone Call Button */}
          <button
            type="button"
            onClick={() => handleMeetingTypeChange('phone', !enablePhone)}
            disabled={savingType === 'phone'}
            aria-label="Toggle phone call availability"
            aria-pressed={enablePhone}
            className={`relative rounded-xl border-2 p-4 text-left transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              enablePhone
                ? 'border-emerald-600 bg-emerald-50'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-brand-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span className="text-sm font-semibold text-zinc-900">Phone call</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">Call clients directly</p>
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
                  enablePhone
                    ? 'border-emerald-600 bg-emerald-600'
                    : 'border-zinc-300 bg-white'
                }`}
                aria-hidden="true"
              >
                {savingType === 'phone' ? (
                  <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                ) : enablePhone ? (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
              </div>
            </div>
          </button>

          {/* Video Call Button */}
          <button
            type="button"
            onClick={() => handleMeetingTypeChange('video', !enableVideo)}
            disabled={savingType === 'video'}
            aria-label="Toggle video call availability"
            aria-pressed={enableVideo}
            className={`relative rounded-xl border-2 p-4 text-left transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              enableVideo
                ? 'border-emerald-600 bg-emerald-50'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-brand-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-zinc-900">Video call</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">Meet via video link</p>
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
                  enableVideo
                    ? 'border-emerald-600 bg-emerald-600'
                    : 'border-zinc-300 bg-white'
                }`}
                aria-hidden="true"
              >
                {savingType === 'video' ? (
                  <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                ) : enableVideo ? (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
              </div>
            </div>
          </button>

          {/* In-Person Button */}
          <button
            type="button"
            onClick={() => handleMeetingTypeChange('inPerson', !enableInPerson)}
            disabled={savingType === 'inPerson'}
            aria-label="Toggle in-person visit availability"
            aria-pressed={enableInPerson}
            className={`relative rounded-xl border-2 p-4 text-left transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              enableInPerson
                ? 'border-emerald-600 bg-emerald-50'
                : 'border-zinc-200 bg-white hover:border-zinc-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5 text-brand-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-semibold text-zinc-900">In-person visit</span>
                </div>
                <p className="mt-1 text-xs text-zinc-500">Meet at your location</p>
              </div>
              <div
                className={`flex h-5 w-5 items-center justify-center rounded-full border-2 transition-colors duration-150 ${
                  enableInPerson
                    ? 'border-emerald-600 bg-emerald-600'
                    : 'border-zinc-300 bg-white'
                }`}
                aria-hidden="true"
              >
                {savingType === 'inPerson' ? (
                  <span className="h-3 w-3 animate-spin rounded-full border border-white border-t-transparent" />
                ) : enableInPerson ? (
                  <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : null}
              </div>
            </div>
          </button>
        </div>
      </div>

   

      {/* Availability Section */}
      <h3 className={`${bannerHeadingClass} rounded-xl`}>
        Availability
      </h3>
      {daysOfWeek.map(({ label, value }) => {
        const saved = availabilityMap.get(value);
        const isDayActive = Boolean(activeDays[value]);
        return (
          <div
            key={value}
            className="space-y-3 border-b border-zinc-100 pb-3 last:border-none last:pb-0"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-zinc-900">{label}</h3>
              <label className="flex items-center gap-1 text-xs uppercase tracking-[0.3em] text-zinc-500">
                <input 
                  type="checkbox" 
                  name={`active-${value}`} 
                  checked={isDayActive}
                  onChange={(event) =>
                    setActiveDays((prev) => ({ ...prev, [value]: event.target.checked }))
                  }
                  aria-label={`Mark ${label} as available`}
                />
                Available
              </label>
            </div>
            {isDayActive && (
              <div className="grid gap-3 md:grid-cols-4 text-xs text-zinc-500">
                <div className="grid gap-1">
                  <label htmlFor={`start-${value}`} className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Start</label>
                  <input
                    id={`start-${value}`}
                    name={`start-${value}`}
                    type="time"
                    defaultValue={saved?.startTime ?? '09:00'}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
                  />
                </div>
                <div className="grid gap-1">
                  <label htmlFor={`end-${value}`} className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">End</label>
                  <input
                    id={`end-${value}`}
                    name={`end-${value}`}
                    type="time"
                    defaultValue={saved?.endTime ?? '17:00'}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
                  />
                </div>
                <div className="grid gap-1">
                  <label htmlFor={`duration-${value}`} className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Duration (min)</label>
                  <input
                    id={`duration-${value}`}
                    name={`duration-${value}`}
                    type="number"
                    min={15}
                    step={5}
                    defaultValue={saved?.duration ?? 30}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
                  />
                </div>
                <div className="grid gap-1">
                  <label htmlFor={`buffer-${value}`} className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Buffer (min)</label>
                  <input
                    id={`buffer-${value}`}
                    name={`buffer-${value}`}
                    type="number"
                    min={0}
                    step={5}
                    defaultValue={saved?.buffer ?? 0}
                    className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div className="flex flex-col items-end gap-2">
        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center rounded-lg border border-brand-primary-300 bg-brand-primary-600 px-4 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:border-brand-primary-600 hover:bg-brand-primary-700 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isPending && (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
          )}
          {isPending ? 'Saving...' : 'Save'}
        </button>
        {saved && (
          <span className="flex items-center text-green-600 text-sm font-semibold gap-1">
            <Check size={16} /> Saved!
          </span>
        )}
      </div>

      </div>
    </form>
  );
}
