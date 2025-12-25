"use client";

import { useState } from "react";

type BankConnectProps = {
  userId: string;
  email: string;
  country?: string | null;
};

export function BankConnect({ userId, email, country }: BankConnectProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/users/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email,
          country: country ?? "US",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Unable to create Stripe onboarding link.");
      }

      const data: { onboardingUrl?: string } = await res.json();

      if (data?.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        throw new Error("Stripe onboarding URL missing.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong while connecting Stripe.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleConnect}
        disabled={isLoading}
        className="inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-brand-primary-50 px-4 py-2 text-sm font-semibold text-brand-primary-700 transition hover:bg-brand-primary-100 disabled:opacity-50"
      >
        {isLoading ? "Connecting..." : "Connect Bank to Get Paid (15s Plaid flow)"}
      </button>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
