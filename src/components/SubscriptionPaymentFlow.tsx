'use client';

import { useEffect, useState } from 'react';
import { Elements } from '@stripe/react-stripe-js';
import { Stripe, loadStripe } from '@stripe/stripe-js';
import CheckoutForm from '@/components/CheckoutForm';
import { useSearchParams } from 'next/navigation';

type SubscriptionConfig = {
  publishableKey: string;
  stripeAccountId: string | null;
  stripeCustomerId: string | null;
  defaultPaymentMethodId: string | null;
  sellerId: string | null;
  subscriptionPriceId?: string | null;
  subscriptionProductId?: string | null;
  subscriptionFallbackAmount?: number | null;
  subscriptionPriceAmount?: number | null;
  subscriptionPriceCurrency?: string | null;
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

const SUBSCRIPTION_PRICE_CENTS = Number(process.env.NEXT_PUBLIC_PRO_PRICE_CENTS ?? 999);

export default function SubscriptionPaymentFlow() {
  const [config, setConfig] = useState<SubscriptionConfig | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [priceSource, setPriceSource] = useState<{
    source: 'stripe' | 'env';
    priceId: string | null;
    productId: string | null;
    amount: number | null;
    currency: string | null;
  } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const debugMode =
    searchParams.get('debug') === '1' ||
    searchParams.get('debug') === 'true' ||
    searchParams.get('error') === 'debug';

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      setError(null);
      setFormError(null);
      try {
        const res = await fetch('/api/payments/config?mode=subscription');
        if (!res.ok) {
          const rawBody = await res.text();
          let message = rawBody || `Failed to load subscription configuration (${res.status})`;
          if (rawBody) {
            try {
              const payload = JSON.parse(rawBody);
              message = payload?.error ?? payload?.message ?? message;
            } catch {
              // leave the text as-is
            }
          }
          throw new Error(message);
        }
        const data: SubscriptionConfig = await res.json();
        if (!data.publishableKey) throw new Error('Stripe publishable key missing');
        if (!active) return;
        setConfig(data);
        setStripePromise(
          loadStripe(data.publishableKey, data.stripeAccountId ? { stripeAccount: data.stripeAccountId } : undefined)
        );
        const priceId = data.subscriptionPriceId ?? null;
        const productId = data.subscriptionProductId ?? null;
        const amount =
          data.subscriptionPriceAmount ??
          (priceId ? null : data.subscriptionFallbackAmount ?? null);
        const currency =
          data.subscriptionPriceCurrency ?? (priceId ? 'usd' : null);
        setPriceSource({
          source: priceId ? 'stripe' : 'env',
          priceId,
          productId,
          amount,
          currency,
        });
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
  }, []);

  const handleSuccess = async (paymentIntentId: string) => {
    await fetch('/api/billing/confirm-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId }),
    });
  };

  const effectiveAmount = priceSource?.amount ?? SUBSCRIPTION_PRICE_CENTS;
  let content;
  if (loading || !stripePromise) {
    content = <p className="text-center text-zinc-500">Preparing upgrade...</p>;
  } else if (error || !config) {
    content = (
      <p className="text-center text-sm text-rose-500">
        {error || 'Unable to load subscription flow.'}
      </p>
    );
  } else {
    content = (
      <Elements stripe={stripePromise}>
        {formError && (
          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {formError}
          </div>
        )}
        <CheckoutForm
          amount={effectiveAmount}
          sellerId={config.sellerId || undefined}
          stripeCustomerId={config.stripeCustomerId || undefined}
          defaultPaymentMethodId={config.defaultPaymentMethodId || undefined}
          intentEndpoint="/api/payments/create-subscription-intent"
          onSuccess={handleSuccess}
          onError={(message) => setFormError(message)}
          initialEmail={config.customerEmail || undefined}
          initialAddress={config.customerAddress || undefined}
        />
      </Elements>
    );
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl bg-brand-primary-50 p-8 shadow-sm">
        <h1 className="text-3xl font-bold text-brand-primary-900">Upgrade to ClientWave Pro</h1>
        <p className="text-sm text-brand-primary-700">$9.99 / month · Cancel anytime</p>
        <ul className="mt-6 space-y-3 text-brand-primary-800">
          <li>
            <span className="text-green-600">✓</span> Unlimited clients & invoices
          </li>
          <li>
            <span className="text-green-600">✓</span> Recurring invoices & auto-charge
          </li>
          <li>
            <span className="text-green-600">✓</span> Stripe + Venmo + Zelle payments
          </li>
          <li>
            <span className="text-green-600">✓</span> Priority support & branding removal
          </li>
        </ul>
      </div>
      {content}
      {debugMode && (
        <div className="rounded-2xl border border-white/20 bg-black/40 p-4 text-xs text-white/80">
          <p className="text-sm font-semibold text-white">Debug info</p>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap text-[0.65rem] leading-snug">
            {JSON.stringify(
              {
                error,
                formError,
                priceSource,
                config,
              },
              null,
              2
            )}
          </pre>
        </div>
      )}
    </div>
  );
}
