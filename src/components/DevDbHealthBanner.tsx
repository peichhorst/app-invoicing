'use client';

import { useEffect, useState } from 'react';

type DbHealthResponse = {
  ok: boolean;
  source?: 'DATABASE_URL' | 'DIRECT_URL' | null;
  warnings?: string[];
  errors?: string[];
};

export default function DevDbHealthBanner() {
  const [health, setHealth] = useState<DbHealthResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    let cancelled = false;
    const run = async () => {
      try {
        const res = await fetch('/api/health/db', { cache: 'no-store' });
        const data = (await res.json()) as DbHealthResponse;
        if (!cancelled) {
          setHealth(data);
        }
      } catch {
        if (!cancelled) {
          setHealth({
            ok: false,
            errors: ['Unable to reach /api/health/db.'],
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  if (process.env.NODE_ENV !== 'development') return null;
  if (loading) return null;
  if (!health) return null;

  if (!health.ok) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900">
        <p className="font-semibold">Dev DB check failed</p>
        {health.source && <p>Source: {health.source}</p>}
        {health.errors?.[0] && <p>{health.errors[0]}</p>}
      </div>
    );
  }

  return null;
}
