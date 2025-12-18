export default function OnboardingLoading() {
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="h-28 animate-pulse rounded-3xl border border-purple-100 bg-white/80" />
        <div className="space-y-4 rounded-3xl border border-purple-100 bg-white/80 p-6 shadow-sm">
          <div className="h-6 w-40 animate-pulse rounded bg-zinc-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-zinc-200" />
          <div className="h-4 w-56 animate-pulse rounded bg-zinc-200" />
        </div>
        <div className="space-y-3 rounded-3xl border border-zinc-200 bg-white/80 p-6 shadow-sm">
          <div className="h-5 w-32 animate-pulse rounded bg-zinc-200" />
          <div className="h-10 animate-pulse rounded bg-zinc-200" />
          <div className="h-10 animate-pulse rounded bg-zinc-200" />
          <div className="h-10 animate-pulse rounded bg-zinc-200" />
        </div>
      </div>
    </div>
  );
}
