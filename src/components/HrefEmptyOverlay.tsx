'use client';

import { useEffect, useState } from 'react';

type TraceInfo = {
  tagName: string;
  className: string;
  id: string;
  timestamp: number;
  stack?: string;
};

export function HrefEmptyOverlay() {
  const [events, setEvents] = useState<TraceInfo[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<TraceInfo>).detail;
      if (!detail) return;
      setEvents((prev) => [detail, ...prev].slice(0, 3));
    };
    window.addEventListener('href-empty-event', handler);
    return () => {
      window.removeEventListener('href-empty-event', handler);
    };
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-5 z-[9999] space-y-2">
      {events.map((event) => (
        <div
          key={`${event.timestamp}-${event.tagName}`}
          className="pointer-events-auto rounded-2xl border border-red-200 bg-white/90 px-4 py-3 shadow-lg"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-red-600">href="" detected</p>
          <p className="text-sm text-zinc-800">
            {event.tagName}
            {event.id ? ` #${event.id}` : ''}
            {event.className ? ` .${event.className}` : ''}
          </p>
          {event.stack && (
            <pre className="mt-2 max-h-32 overflow-y-auto text-[10px] text-zinc-500">{event.stack}</pre>
          )}
        </div>
      ))}
    </div>
  );
}
