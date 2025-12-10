'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import CheckoutForm from '@/components/CheckoutForm';

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
  stripeCustomerId?: string | null;
  defaultPaymentMethodId?: string | null;
};

type InvoicePaymentFlowProps = {
  invoiceId: string;
};

export default function InvoicePaymentFlow({ invoiceId }: InvoicePaymentFlowProps) {
  const fallbackAmount = useMemo(() => 50, []);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setError(null);
      setLoading(true);
      const qs = new URLSearchParams({ invoice: invoiceId });
      try {
        const res = await fetch(`/api/payments/config?${qs.toString()}`);
        if (!res.ok) throw new Error(await res.text());
        const data: PaymentConfig = await res.json();
        if (!data.publishableKey) throw new Error('Stripe publishable key missing');
        if (!active) return;
        setConfig(data);
        setStripePromise(
          loadStripe(data.publishableKey, data.stripeAccountId ? { stripeAccount: data.stripeAccountId } : undefined)
        );
      } catch (err: unknown) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Unable to load payment configuration.';
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
  }, [invoiceId]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-white shadow-xl backdrop-blur">
        <h1 className="text-xl font-semibold">Loading payment...</h1>
        <p className="mt-2 text-sm text-white/80">Please wait a moment.</p>
      </div>
    );
  }

  if (!config || !stripePromise || error) {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-white shadow-xl backdrop-blur">
        <h1 className="text-xl font-semibold">Payment not available</h1>
        <p className="mt-2 text-sm text-white/80">
          {error || 'Unable to load payment configuration. Please try again later.'}
        </p>
      </div>
    );
  }

  if (config.invoiceStatus === 'PAID') {
    return (
      <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-white shadow-xl backdrop-blur">
        <h1 className="text-xl font-semibold">Invoice already paid</h1>
        <p className="mt-2 text-sm text-white/80">
          {config.paidAt ? `Paid on ${new Date(config.paidAt).toLocaleDateString()}` : 'This invoice is marked as paid.'}
        </p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise}>
      <CheckoutForm
        amount={config.amountCents ?? fallbackAmount}
        sellerId={config.sellerId || undefined}
        invoiceId={config.invoiceId || undefined}
        initialEmail={config.customerEmail || undefined}
        initialAddress={config.customerAddress || undefined}
        stripeCustomerId={config.stripeCustomerId || undefined}
        defaultPaymentMethodId={config.defaultPaymentMethodId || undefined}
      />
    </Elements>
  );
}
