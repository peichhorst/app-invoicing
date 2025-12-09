'use client';

import { useEffect, useMemo, useState } from "react";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { useSearchParams } from "next/navigation";

import CheckoutForm from "@/components/CheckoutForm";

type PaymentConfig = {
  publishableKey: string;
  stripeAccountId: string | null;
  sellerId: string | null;
  invoiceId: string | null;
  amountCents: number | null;
  invoiceStatus?: string | null;
  paidAt?: string | null;
  customerEmail?: string | null;
  customerAddress?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
};

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const amountParam = searchParams.get("amount");
  const invoiceParam = searchParams.get("invoice");
  const sellerParam = searchParams.get("seller");

  const fallbackAmount = useMemo(() => {
    const parsed = Number(amountParam);
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed);
    return 50; // default to $0.50 if invalid
  }, [amountParam]);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setError(null);
      setLoading(true);
      const qs = new URLSearchParams();
      if (sellerParam) qs.set("seller", sellerParam);
      if (invoiceParam) qs.set("invoice", invoiceParam);
      try {
        const res = await fetch(`/api/payments/config${qs.toString() ? `?${qs.toString()}` : ''}`);
        if (!res.ok) throw new Error(await res.text());
        const data: PaymentConfig = await res.json();
        if (!data.publishableKey) throw new Error("Stripe publishable key missing");
        if (!active) return;
        setConfig(data);
        setStripePromise(
          loadStripe(data.publishableKey, data.stripeAccountId ? { stripeAccount: data.stripeAccountId } : undefined)
        );
      } catch (err: unknown) {
        if (!active) return;
        const message = err instanceof Error ? err.message : "Unable to load payment configuration.";
        setError(message);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [sellerParam, invoiceParam]);

  let content;
  if (loading) {
    content = (
      <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-white shadow-xl backdrop-blur">
        <h1 className="text-xl font-semibold">Loading payment...</h1>
        <p className="mt-2 text-sm text-white/80">Please wait a moment.</p>
      </div>
    );
  } else if (error || !config || !stripePromise) {
    content = (
      <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-white shadow-xl backdrop-blur">
        <h1 className="text-xl font-semibold">Payment not available</h1>
        <p className="mt-2 text-sm text-white/80">
          {error || "Unable to load payment configuration. Please try again later."}
        </p>
      </div>
    );
  } else if (config.invoiceStatus === "PAID") {
    content = (
      <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-white shadow-xl backdrop-blur">
        <h1 className="text-xl font-semibold">Invoice already paid</h1>
        <p className="mt-2 text-sm text-white/80">
          {config.paidAt ? `Paid on ${new Date(config.paidAt).toLocaleDateString()}` : "This invoice is marked as paid."}
        </p>
      </div>
    );
  } else {
    content = (
      <Elements stripe={stripePromise}>
        <CheckoutForm
          amount={config.amountCents ?? fallbackAmount}
          sellerId={config.sellerId || undefined}
          invoiceId={config.invoiceId || undefined}
          initialEmail={config.customerEmail || undefined}
          initialAddress={config.customerAddress || undefined}
        />
      </Elements>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 px-4 pb-12 pt-10">
      <div className="grid-overlay" />
      <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-3 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.25em]">ClientWave</p>
          <h1 className="text-3xl font-semibold leading-tight">Complete your payment securely.</h1>
         {content}
         
        </div>

       
      </div>
    </div>
  );
}
