"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  leadId: string;
  companyName?: string | null;
  website?: string | null;
};

export default function LeadEnrichButton({ leadId, companyName, website }: Props) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleEnrich = async () => {
    setStatus('loading');
    setMessage(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName,
          website,
        }),
      });

      const text = await res.text();
      const payload = text ? JSON.parse(text) : null;
      if (!res.ok) {
        throw new Error(payload?.error ?? 'Enrichment failed');
      }

      const emailInfo = payload?.email ? `Email: ${payload.email}` : 'No email found';
      const phoneInfo = payload?.phone ? `Phone: ${payload.phone}` : 'No phone found';
      setStatus('success');
      setMessage(`${emailInfo} • ${phoneInfo}`);
      router.refresh();
    } catch (error: any) {
      setStatus('error');
      setMessage(error?.message ?? 'Failed to enrich lead.');
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleEnrich}
        disabled={status === 'loading'}
        className="inline-flex items-center gap-2 rounded-lg border border-brand-primary-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-700 transition hover:border-brand-primary-500 hover:bg-brand-primary-50 disabled:opacity-50"
      >
        {status === 'loading' ? 'Resolving domain…' : 'Resolve domain & enrich'}
      </button>
      {message && (
        <p className={`text-xs ${status === 'error' ? 'text-red-600' : 'text-zinc-500'}`}>{message}</p>
      )}
    </div>
  );
}
