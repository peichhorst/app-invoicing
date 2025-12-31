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
        enablePhone: enablePhone ? "true" : "false",
        phoneNumber,
        enableVideo: enableVideo ? "true" : "false",
        videoLink,
        enableInPerson: enableInPerson ? "true" : "false",
        location,
      };
      const res = await fetch("/api/auth/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unable to save meeting types.");
      }
      setMessage("Meeting types updated.");
      setSaveState("success");
    } catch (error) {
      const text = error instanceof Error ? error.message : "Unable to save meeting types.";
      setMessage(text);
      setSaveState("error");
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-blue-600">Meeting types</p>
          <p className="text-sm text-zinc-500">Control which meeting types show up in your scheduler.</p>
        </div>
        {saveState === "saving" ? (
          <span className="text-xs text-blue-600">Saving…</span>
        ) : saveState === "success" ? (
          <span className="text-xs text-green-600">Saved</span>
        ) : null}
      </div>

      <div className="space-y-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <input
            type="checkbox"
            checked={enablePhone}
            onChange={(event) => setEnablePhone(event.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-600"
          />
          Phone call
        </label>
        {enablePhone && (
          <div className="space-y-1 pl-6">
            <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">Phone number</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="(123) 456-7890"
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <input
            type="checkbox"
            checked={enableVideo}
            onChange={(event) => setEnableVideo(event.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-600"
          />
          Video call
        </label>
        {enableVideo && (
          <div className="space-y-1 pl-6">
            <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">Custom link</label>
            <input
              type="url"
              value={videoLink}
              onChange={(event) => setVideoLink(event.target.value)}
              placeholder="https://zoom.us/j/..."
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
            />
          </div>
        )}

        <label className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
          <input
            type="checkbox"
            checked={enableInPerson}
            onChange={(event) => setEnableInPerson(event.target.checked)}
            className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-600"
          />
          In-person visit
        </label>
        {enableInPerson && (
          <div className="space-y-1 pl-6">
            <label className="text-xs uppercase tracking-[0.3em] text-zinc-500">Location / notes</label>
            <textarea
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              rows={3}
              placeholder="Address, arrival instructions, parking, etc."
              className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-800 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
            />
          </div>
        )}
      </div>

      {message && <p className="text-xs text-zinc-500">{message}</p>}

      <div className="text-right">
        <button
          type="submit"
          disabled={saveState === "saving"}
          className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 disabled:opacity-60"
        >
          Save meeting types
        </button>
      </div>
    </form>
  );
}
