'use client';

import { useEffect, useMemo, useState } from 'react';
import { loadStripe, type Stripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import InvoicePaymentElementForm from '@/components/InvoicePaymentElementForm';

type PaymentConfig = {
  publishableKey: string;
  stripeAccountId: string | null;
  sellerId: string | null;
  invoiceId: string | null;
  amountCents: number | null;
  baseAmountCents?: number | null;
  stripeFeeCents?: number;
  applyStripeFee?: boolean;
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
  paymentMethods?: Array<'card' | 'us_bank_account'>;
  stripePaymentMethodCard?: boolean;
  stripePaymentMethodAch?: boolean;
};

type CreateIntentResponse = {
  clientSecret: string;
  amountCents: number;
  baseAmountCents: number;
  stripeFeeCents: number;
  applyStripeFee: boolean;
  achFallbackToCard?: boolean;
  checkoutWarning?: string | null;
  selectedPaymentMethod?: 'card' | 'us_bank_account';
};

type InvoicePaymentFlowProps = {
  invoiceId: string;
  applyStripeFee?: boolean;
};

export default function InvoicePaymentFlow({ invoiceId, applyStripeFee = false }: InvoicePaymentFlowProps) {
  const fallbackAmount = useMemo(() => 50, []);
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [intentSummary, setIntentSummary] = useState<CreateIntentResponse | null>(null);
  const [checkoutWarning, setCheckoutWarning] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'us_bank_account'>('card');
  const [intentLoading, setIntentLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedMethodIntentKey = config?.applyStripeFee ? selectedMethod : 'all';

  useEffect(() => {
    let active = true;
    const run = async () => {
      setError(null);
      setLoading(true);
      const qs = new URLSearchParams({ invoice: invoiceId });
      if (applyStripeFee) {
        qs.set('applyStripeFee', '1');
      }
      try {
        const res = await fetch(`/api/payments/config?${qs.toString()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(await res.text());
        const data: PaymentConfig = await res.json();
        if (!data.publishableKey) throw new Error('Stripe publishable key missing');
        if (!active) return;
        setConfig(data);
        setClientSecret(null);
        setIntentSummary(null);
        setCheckoutWarning(null);
        const configuredMethods =
          Array.isArray(data.paymentMethods) && data.paymentMethods.length
            ? data.paymentMethods
            : (['card'] as Array<'card' | 'us_bank_account'>);
        setSelectedMethod(
          configuredMethods.includes('card')
            ? 'card'
            : configuredMethods.includes('us_bank_account')
              ? 'us_bank_account'
              : configuredMethods[0]
        );
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
  }, [invoiceId, applyStripeFee]);

  useEffect(() => {
    if (!config?.invoiceId || config.invoiceStatus === 'PAID') return;
    let active = true;
    const methodSensitivePricing = Boolean(config.applyStripeFee);
    const paymentMethodForIntent = methodSensitivePricing ? selectedMethod : undefined;
    const createIntent = async () => {
      setIntentLoading(true);
      try {
        const res = await fetch('/api/payments/create-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: config.amountCents ?? fallbackAmount,
            sellerId: config.sellerId,
            invoiceId: config.invoiceId,
            email: config.customerEmail || '',
            applyStripeFee: Boolean(config.applyStripeFee),
            paymentMethod: paymentMethodForIntent,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as CreateIntentResponse;
        if (!active) return;
        if (!data?.clientSecret || typeof data.clientSecret !== 'string') {
          throw new Error('Payment intent client secret missing.');
        }
        setClientSecret(data.clientSecret);
        setIntentSummary(data);
        setCheckoutWarning(typeof data.checkoutWarning === 'string' ? data.checkoutWarning : null);
      } catch (err: unknown) {
        if (!active) return;
        const message = err instanceof Error ? err.message : 'Unable to initialize checkout.';
        setError(message);
      } finally {
        if (!active) return;
        setIntentLoading(false);
      }
    };
    void createIntent();
    return () => {
      active = false;
    };
  }, [config, fallbackAmount, selectedMethodIntentKey]);

  const availableMethods =
    config?.paymentMethods && config.paymentMethods.length
      ? config.paymentMethods
      : (['card'] as Array<'card' | 'us_bank_account'>);
  const showMethodTabs = availableMethods.length > 1;

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm">
        <h1 className="text-xl font-semibold">Loading payment...</h1>
        <p className="mt-2 text-sm text-zinc-600">Please wait a moment.</p>
      </div>
    );
  }

  if (!config || !stripePromise || error) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm">
        <h1 className="text-xl font-semibold">Payment not available</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {error || 'Unable to load payment configuration. Please try again later.'}
        </p>
      </div>
    );
  }

  if (config.invoiceStatus === 'PAID') {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm">
        <h1 className="text-xl font-semibold">Invoice already paid</h1>
        <p className="mt-2 text-sm text-zinc-600">
          {config.paidAt ? `Paid on ${new Date(config.paidAt).toLocaleDateString()}` : 'This invoice is marked as paid.'}
        </p>
      </div>
    );
  }

  if (intentLoading || !clientSecret) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm">
        <h1 className="text-xl font-semibold">Preparing secure checkout...</h1>
        <p className="mt-2 text-sm text-zinc-600">Please wait a moment.</p>
      </div>
    );
  }

  const elementsOptions = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <Elements stripe={stripePromise} options={elementsOptions}>
      <InvoicePaymentElementForm
        amountCents={intentSummary?.amountCents ?? config.amountCents ?? fallbackAmount}
        baseAmountCents={
          intentSummary?.baseAmountCents ?? config.baseAmountCents ?? config.amountCents ?? fallbackAmount
        }
        stripeFeeCents={intentSummary?.stripeFeeCents ?? config.stripeFeeCents ?? 0}
        applyStripeFee={Boolean(intentSummary?.applyStripeFee ?? config.applyStripeFee)}
        clientSecret={clientSecret}
        sellerId={config.sellerId || undefined}
        invoiceId={config.invoiceId || undefined}
        initialEmail={config.customerEmail || undefined}
        initialAddress={config.customerAddress || undefined}
        stripeCustomerId={config.stripeCustomerId || undefined}
        saveCardContext="invoice"
        checkoutWarning={checkoutWarning ?? undefined}
        selectedPaymentMethod={selectedMethod}
        availableMethods={availableMethods}
        showMethodTabs={showMethodTabs}
        onSelectPaymentMethod={(method) => {
          if (method === selectedMethod) return;
          if (Boolean(config?.applyStripeFee)) {
            setClientSecret(null);
            setIntentSummary(null);
          }
          setSelectedMethod(method);
        }}
      />
    </Elements>
  );
}
