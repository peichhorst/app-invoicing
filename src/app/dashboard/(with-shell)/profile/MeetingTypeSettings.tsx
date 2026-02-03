"use client";

import { useEffect, useState, type FormEvent } from "react";

type MeetingTypeSettingsProps = {
  initial: {
    enablePhone?: boolean | null;
    phoneNumber?: string | null;
    enableVideo?: boolean | null;
    videoLink?: string | null;
    enableInPerson?: boolean | null;
    location?: string | null;
  };
};

type SaveState = "idle" | "saving" | "success" | "error";

export function MeetingTypeSettings({ initial }: MeetingTypeSettingsProps) {
  const [enablePhone, setEnablePhone] = useState(initial.enablePhone ?? true);
  const [phoneNumber, setPhoneNumber] = useState(initial.phoneNumber ?? "");
  const [enableVideo, setEnableVideo] = useState(initial.enableVideo ?? false);
  const [videoLink, setVideoLink] = useState(initial.videoLink ?? "");
  const [enableInPerson, setEnableInPerson] = useState(initial.enableInPerson ?? false);
  const [location, setLocation] = useState(initial.location ?? "");
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setEnablePhone(initial.enablePhone ?? true);
    setPhoneNumber(initial.phoneNumber ?? "");
    setEnableVideo(initial.enableVideo ?? false);
    setVideoLink(initial.videoLink ?? "");
    setEnableInPerson(initial.enableInPerson ?? false);
    setLocation(initial.location ?? "");
  }, [
    initial.enablePhone,
    initial.phoneNumber,
    initial.enableVideo,
    initial.videoLink,
    initial.enableInPerson,
    initial.location,
  ]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaveState("saving");
    setMessage(null);
    try {
      const payload = {
        phoneNumber,
        videoLink,
        location,
      };
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unable to save meeting type details.");
      }
      setMessage("Meeting type details updated.");
      setSaveState("success");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to save meeting type details.";
      setMessage(text);
      setSaveState("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Meeting type details</p>
          <p className="text-sm text-zinc-500">Add contact details and location for each meeting type.</p>
        </div>
        {saveState === "saving" ? (
          <span className="text-xs text-blue-600">Saving…</span>
        ) : saveState === "success" ? (
          <span className="text-xs text-green-600">Saved</span>
        ) : null}
      </div>

      <div className="space-y-4">
        {enablePhone && (
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <svg className="h-4 w-4 text-brand-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Phone call
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">Phone number</label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder="(123) 456-7890"
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              />
            </div>
          </div>
        )}

        {enableVideo && (
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <svg className="h-4 w-4 text-brand-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Video call
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">Custom link (optional)</label>
              <input
                type="url"
                value={videoLink}
                onChange={(event) => setVideoLink(event.target.value)}
                placeholder="https://zoom.us/j/..."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              />
              <p className="text-xs text-zinc-500">Leave blank to auto-generate a Google Meet link</p>
            </div>
          </div>
        )}

        {enableInPerson && (
          <div className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <svg className="h-4 w-4 text-brand-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              In-person visit
            </div>
            <div className="space-y-1">
              <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">Location / notes</label>
              <textarea
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                rows={3}
                placeholder="Address, arrival instructions, parking, etc."
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
              />
            </div>
          </div>
        )}

        {!enablePhone && !enableVideo && !enableInPerson && (
          <div className="rounded-lg border border-dashed border-zinc-200 bg-zinc-50 p-4 text-center text-sm text-zinc-500">
            Enable at least one meeting type in the Scheduling section above to add details here.
          </div>
        )}
      </div>

      {message && <p className="text-xs text-zinc-500">{message}</p>}

      {(enablePhone || enableVideo || enableInPerson) && (
        <div className="text-right">
          <button
            type="submit"
            disabled={saveState === "saving"}
            className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 disabled:opacity-60"
          >
            Save details
          </button>
        </div>
      )}
    </form>
  );
}
