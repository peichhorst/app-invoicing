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
              // Keep raw text.
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
        const amount = data.subscriptionPriceAmount ?? (priceId ? null : data.subscriptionFallbackAmount ?? null);
        const currency = data.subscriptionPriceCurrency ?? (priceId ? 'usd' : null);
        setPriceSource({ source: priceId ? 'stripe' : 'env', priceId, productId, amount, currency });
      } catch (err: unknown) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Unable to load payment configuration.';
        setError(message);
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    void run();
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
  const effectiveCurrency = (priceSource?.currency ?? 'usd').toUpperCase();
  const planPriceLabel = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: effectiveCurrency,
  }).format(effectiveAmount / 100);

  let content;
  if (loading || !stripePromise) {
    content = <p className="text-center text-zinc-500">Preparing upgrade...</p>;
  } else if (error || !config) {
    content = (
      <p className="text-center text-sm text-rose-600">
        {error || 'Unable to load subscription flow.'}
      </p>
    );
  } else {
    content = (
      <Elements stripe={stripePromise}>
        {formError && (
          <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
            {formError}
          </div>
        )}
        <CheckoutForm
          amount={effectiveAmount}
          sellerId={config.sellerId || undefined}
          stripeCustomerId={config.stripeCustomerId || undefined}
          defaultPaymentMethodId={config.defaultPaymentMethodId || undefined}
          intentEndpoint="/api/payments/create-subscription-intent"
          saveCardContext="recurring"
          embedded
          onSuccess={handleSuccess}
          onError={(message) => setFormError(message)}
          initialEmail={config.customerEmail || undefined}
          initialAddress={config.customerAddress || undefined}
        />
      </Elements>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="space-y-3 border-b border-zinc-200 pb-5">
         
          <h1 className="text-3xl font-bold text-zinc-900">Upgrade to ClientWave Pro</h1>
          <p className="text-sm text-zinc-600">{planPriceLabel} / month. Cancel anytime.</p>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-2">
          {[
            'Professional Invoicing with Your Branding',
            'Proposals & Contracts with E-signature',
            'Recurring Billing & Auto-charge',
            'Installable Web App',
            'Client CRM, Leads, and Pipeline Tracking',
            'Booking Scheduler and Availability Sharing',
            'Stripe, Venmo, Zelle, and Check Options',
            'Team Messaging, Reporting, and Automations',
            'AI Chat Assistant for Invoices and Workflows',
            'Google Calendar Sync for Bookings',
            'Custom Branding: Logo, Color, and Header Control',
            'Client Portal with Public Payment and Document Links',
            'CSV Import & Export for Invoices, Clients, and Leads',
            'Email Notifications, Reminders, and Receipts',
            'Role-based Team Access and Admin Controls',
          ].map((feature) => (
            <div key={feature} className="flex items-start gap-2 p-1 text-sm text-zinc-700">
              <span className="mt-0.5 text-emerald-600">{String.fromCharCode(10003)}</span>
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-6">
           <p className="inline-flex w-fit rounded-full border border-brand-primary-200 bg-brand-primary-50 px-3 mb-2 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary-700">
            Credit Card Payment
          </p>
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-zinc-900">Secure Checkout</h2>
            <p className="text-sm text-zinc-600">Complete your upgrade securely with Stripe.</p>
          </div>
          {content}
        </div>
      </div>

      {debugMode && (
        <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-xs text-zinc-700">
          <p className="text-sm font-semibold text-zinc-900">Debug info</p>
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
