// src/app/onboarding/loading.tsx
export default function OnboardingLoading() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 px-4 py-16">
      <div className="absolute inset-0 opacity-40">
        <div className="grid-overlay" />
      </div>
      <div className="relative w-full max-w-4xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-purple-100">ClientWave</p>
        <p className="mt-3 text-lg font-semibold text-purple-50">Setting up your workspace…</p>
        <p className="mt-2 text-sm text-purple-200">Loading onboarding steps and syncing your account.</p>
      </div>
    </div>
  );
}
