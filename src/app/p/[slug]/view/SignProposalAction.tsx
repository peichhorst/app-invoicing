'use client';

import { useEffect, useMemo, useState } from 'react';

type SignProposalActionProps = {
  slug: string;
  initialStatus: string;
  signableStatuses?: string[];
};

const DEFAULT_SIGNABLE_STATUSES = ['VIEWED'];

export default function SignProposalAction({
  slug,
  initialStatus,
  signableStatuses = DEFAULT_SIGNABLE_STATUSES,
}: SignProposalActionProps) {
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const canSign = signableStatuses.includes(status);

  const handleSign = async () => {
    if (!canSign) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/p/${encodeURIComponent(slug)}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json?.error || 'Failed to sign the proposal.');
      }
      setStatus(json.status ?? 'SIGNED');
      setMessage('Contract Signed – Thank you! We’ve notified the team.');
      setShowConfetti(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to sign right now.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!showConfetti) return;
    const timer = setTimeout(() => setShowConfetti(false), 3600);
    return () => clearTimeout(timer);
  }, [showConfetti]);

  const confettiPieces = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, idx) => ({
        id: idx,
        left: `${Math.random() * 80 + 10}%`,
        delay: `${Math.random()}s`,
        color: ['#f97316', '#22c55e', '#2563eb', '#ec4899'][idx % 4],
        duration: `${Math.random() * 1 + 1.5}s`,
      })),
    []
  );

  if (!canSign && status !== 'SIGNED') {
    return null;
  }

  return (
    <div className="relative mt-6 space-y-3 rounded-2xl border border-white/10 bg-brand-primary-950/20 p-5 text-center text-white/90 overflow-hidden">
      {showConfetti && (
        <div className="confetti-overlay" aria-hidden="true">
          {confettiPieces.map((piece) => (
            <span
              key={piece.id}
              className="confetti-piece"
              style={{
                left: piece.left,
                animationDelay: piece.delay,
                background: piece.color,
                animationDuration: piece.duration,
              }}
            />
          ))}
          <style jsx>{`
            .confetti-overlay {
              pointer-events: none;
              position: absolute;
              inset: 0;
              overflow: hidden;
            }
            .confetti-piece {
              position: absolute;
              top: 0;
              width: 10px;
              height: 10px;
              border-radius: 2px;
              animation: confetti-fall linear forwards;
              opacity: 0.9;
            }
            @keyframes confetti-fall {
              0% {
                transform: translateY(0) rotate(0deg);
              }
              100% {
                transform: translateY(260px) rotate(360deg);
                opacity: 0;
              }
            }
          `}</style>
        </div>
      )}
      {status === 'SIGNED' ? (
        <>
          <p className="text-lg font-semibold text-white">Contract Signed – Thank you!</p>
          <p className="text-sm text-white/70">We’ve captured your signature and notified the team.</p>
        </>
      ) : (
        <>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">Ready to sign?</p>
          <p className="text-lg font-semibold text-white">Sign proposal</p>
          <button
            type="button"
            onClick={handleSign}
            disabled={loading}
            className="mt-2 inline-flex items-center justify-center rounded-full border border-white/40 bg-white px-5 py-2 text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary-900 shadow-sm transition hover:bg-brand-primary-100 disabled:opacity-60"
          >
            {loading ? 'Signing…' : 'Sign proposal'}
          </button>
        </>
      )}
      {message && <p className="text-xs text-white/70">{message}</p>}
    </div>
  );
}
