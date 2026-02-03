// src/app/onboarding/loading.tsx
'use client';

export default function OnboardingLoading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-brand-primary-700 via-brand-secondary-700 to-brand-accent-700 px-4 py-16">
      <div className="absolute inset-0 opacity-40">
        <div className="grid-overlay" />
      </div>
      <div className="relative w-full max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-brand-primary-100">ClientWave</p>
        <div className="mt-3 flex items-center justify-center gap-2 text-lg font-semibold text-brand-primary-50">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-2xl wave-hand" aria-hidden="true">
            👋
          </span>
          <span>Setting up your workspace…</span>
        </div>
        <p className="mt-2 text-sm text-brand-primary-200">Loading onboarding steps and syncing your account.</p>
      </div>
      <style jsx global>{`
        @keyframes wave-hand {
          0% { transform: rotate(0deg); }
          10% { transform: rotate(14deg); }
          20% { transform: rotate(-8deg); }
          30% { transform: rotate(14deg); }
          40% { transform: rotate(-4deg); }
          50% { transform: rotate(10deg); }
          60% { transform: rotate(0deg); }
          100% { transform: rotate(0deg); }
        }
        .wave-hand {
          animation: wave-hand 1.8s ease-in-out infinite;
          transform-origin: 70% 70%;
        }
      `}</style>
    </div>
  );
}
