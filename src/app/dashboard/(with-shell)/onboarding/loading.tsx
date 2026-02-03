export default function OnboardingLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex items-center gap-3 text-brand-primary-600">
        <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
        <span className="text-lg font-semibold">Loading onboarding...</span>
      </div>
    </div>
  );
}
