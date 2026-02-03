"use client";

import { useEffect, useState } from "react";

export function LiveDateTime({ timezone }: { timezone?: string }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (now === null) {
    // On server, render nothing to avoid hydration mismatch
    return null;
  }

  let dateTimeString = "";
  try {
    const options: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    };
    dateTimeString = timezone
      ? now.toLocaleString("en-US", { ...options, timeZone: timezone })
      : now.toLocaleString("en-US", options);
  } catch {
    dateTimeString = now.toLocaleString();
  }

  return (
    <div className="mb-1 text-xs text-zinc-500 font-medium">{dateTimeString}</div>
  );
}
