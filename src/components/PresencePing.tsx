'use client';

import { useEffect } from 'react';

type PresencePingProps = {
  enabled?: boolean;
  intervalMs?: number;
};

export function PresencePing({ enabled = true, intervalMs = 30000 }: PresencePingProps) {
  useEffect(() => {
    if (!enabled) return;
    if (process.env.NEXT_PUBLIC_DISABLE_POLLING === 'true') return;
    let isActive = true;

    const ping = async () => {
      if (!isActive) return;
      try {
        await fetch('/api/presence/ping', { method: 'POST' });
      } catch (error) {
        // Ignore ping failures to avoid UI noise
      }
    };

    ping();
    const interval = setInterval(() => {
      ping();
    }, intervalMs);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [enabled, intervalMs]);

  return null;
}
