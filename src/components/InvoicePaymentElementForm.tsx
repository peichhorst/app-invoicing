'use client';

import { useEffect, useState, type ChangeEvent, type Dispatch, type FormEvent, type SetStateAction } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

type Address = {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
};

type InvoicePaymentElementFormProps = {
  amountCents: number;
  baseAmountCents: number;
  stripeFeeCents: number;
  applyStripeFee: boolean;
  clientSecret: string;
  sellerId?: string;
  invoiceId?: string;
  initialEmail?: string;
  initialAddress?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };
  stripeCustomerId?: string;
  saveCardContext?: 'invoice' | 'recurring';
  checkoutWarning?: string;
  selectedPaymentMethod?: 'card' | 'us_bank_account';
  availableMethods?: Array<'card' | 'us_bank_account'>;
  showMethodTabs?: boolean;
  onSelectPaymentMethod?: (method: 'card' | 'us_bank_account') => void;
};

const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' },
];

export default function InvoicePaymentElementForm({
  amountCents,
  baseAmountCents,
  stripeFeeCents,
  applyStripeFee,
  clientSecret,
  sellerId,
  invoiceId,
  initialEmail,
  initialAddress,
  stripeCustomerId,
  saveCardContext = 'invoice',
  checkoutWarning,
  selectedPaymentMethod = 'card',
  availableMethods = ['card'],
  showMethodTabs = false,
  onSelectPaymentMethod,
}: InvoicePaymentElementFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-500/20';

  const [email, setEmail] = useState(initialEmail ?? '');
  const [billing, setBilling] = useState<Address>({
    address1: initialAddress?.line1 ?? '',
    address2: initialAddress?.line2 ?? '',
    city: initialAddress?.city ?? '',
    state: initialAddress?.state ?? '',
    zip: initialAddress?.postalCode ?? '',
  });
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [elementComplete, setElementComplete] = useState(false);
  const [saveCard, setSaveCard] = useState(Boolean(stripeCustomerId));

  useEffect(() => {
    if (initialEmail && !email) setEmail(initialEmail);
  }, [initialEmail, email]);

  const handleZipChange = (
    e: ChangeEvent<HTMLInputElement>,
    setter: Dispatch<SetStateAction<Address>>,
  ) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 5) {
      setter((prev) => ({ ...prev, zip: value }));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setLoading(true);
    setApiError(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          receipt_email: email || undefined,
          payment_method_data: {
            billing_details: {
              email,
              address: {
                line1: billing.address1,
                line2: billing.address2 || undefined,
                city: billing.city,
                state: billing.state,
                postal_code: billing.zip,
                country: 'US',
              },
            },
          },
        },
        redirect: 'if_required',
      });

      if (error) {
        setApiError(error.message || 'Payment could not be completed.');
        return;
      }

      if (paymentIntent?.status === 'succeeded' || paymentIntent?.status === 'processing') {
        setSuccess(true);
        if (invoiceId) {
          if (paymentIntent.payment_method) {
            void fetch('/api/payments/store-recurring-payment-method', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoiceId,
                paymentIntentId: paymentIntent.id,
                paymentMethodId: paymentIntent.payment_method,
              }),
            });
          }
        }

        if (saveCard && stripeCustomerId && sellerId && paymentIntent?.payment_method) {
          void fetch('/api/payments/save-card', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: sellerId,
              customerId: stripeCustomerId,
              paymentMethodId: paymentIntent.payment_method,
            }),
          });
        }
      } else {
        setApiError('Payment could not be completed.');
      }
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Payment failed.');
    } finally {
      setLoading(false);
    }
  };

  const renderStateSelect = (value: string, onChange: (value: string) => void) => (
    <select
      className={inputClass}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required
    >
      <option value="">Select a state</option>
      {US_STATES.map((s) => (
        <option key={s.code} value={s.code}>
          {s.name}
        </option>
      ))}
    </select>
  );

  if (success) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 text-center text-zinc-900 shadow-sm">
        <h2 className="text-3xl font-semibold">Payment Successful!</h2>
        <p className="mt-2 text-sm text-zinc-600">Thank you for your payment. A receipt will be emailed shortly.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm">
      {apiError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{apiError}</div>
      )}
      {checkoutWarning && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          {checkoutWarning}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">Secure Checkout</h2>
        <p className="text-sm text-zinc-600">Pay securely by card or Bank Transfer.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.05fr,0.95fr]">
        <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email Address (for receipt)</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className={inputClass}
              required
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Address</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Address Line 1"
                className={inputClass}
                value={billing.address1}
                onChange={(e) => setBilling({ ...billing, address1: e.target.value })}
                required
              />
              <input
                type="text"
                placeholder="Address Line 2 (optional)"
                className={inputClass}
                value={billing.address2}
                onChange={(e) => setBilling({ ...billing, address2: e.target.value })}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  type="text"
                  placeholder="City"
                  className={inputClass}
                  value={billing.city}
                  onChange={(e) => setBilling({ ...billing, city: e.target.value })}
                  required
                />
                {renderStateSelect(billing.state, (val) => setBilling({ ...billing, state: val }))}
                <input
                  type="text"
                  placeholder="ZIP (5 digits)"
                  className={inputClass}
                  value={billing.zip}
                  onChange={(e) => handleZipChange(e, setBilling)}
                  required
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-5 rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          {showMethodTabs && availableMethods.length > 1 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Payment Method</p>
              <div className="inline-flex w-full rounded-lg border border-zinc-200 bg-zinc-100 p-1">
                {availableMethods.includes('card') && (
                  <button
                    type="button"
                    onClick={() => onSelectPaymentMethod?.('card')}
                    className={`flex-1 px-3 py-2 text-sm font-semibold transition first:rounded-l-md last:rounded-r-md ${
                      selectedPaymentMethod === 'card'
                        ? 'bg-brand-primary-600 text-white'
                        : 'text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    Credit Card
                  </button>
                )}
                {availableMethods.includes('us_bank_account') && (
                  <button
                    type="button"
                    onClick={() => onSelectPaymentMethod?.('us_bank_account')}
                    className={`flex-1 px-3 py-2 text-sm font-semibold transition first:rounded-l-md last:rounded-r-md ${
                      selectedPaymentMethod === 'us_bank_account'
                        ? 'bg-brand-primary-600 text-white'
                        : 'text-zinc-700 hover:bg-zinc-100'
                    }`}
                  >
                    Bank Transfer (ACH)
                  </button>
                )}
              </div>
            </div>
          )}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Payment Details</h3>
            <div className="rounded-lg border border-zinc-200 bg-white px-3 py-3 text-zinc-900 shadow-inner">
              <PaymentElement
                onChange={(event) => setElementComplete(Boolean(event.complete))}
                options={{ layout: 'tabs' }}
              />
            </div>
          </div>

          <div className="space-y-2 rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm">
            {applyStripeFee && stripeFeeCents > 0 && (
              <>
                <div className="flex items-center justify-between text-zinc-700">
                  <span>Invoice amount</span>
                  <span>${(baseAmountCents / 100).toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-700">
                  <span>Processing fee</span>
                  <span>${(stripeFeeCents / 100).toFixed(2)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between text-base font-semibold">
              <span>Total</span>
              <span>${(amountCents / 100).toFixed(2)}</span>
            </div>
          </div>

          {stripeCustomerId && (
            <label className="mt-6 flex items-center gap-3 text-sm font-medium">
              <input
                type="checkbox"
                checked={saveCard}
                onChange={(e) => setSaveCard(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
              />
              <span>
                {saveCardContext === 'recurring'
                  ? 'Save payment method for automatic recurring payments'
                  : 'Save payment method for future payments'}{' '}
                <span className="text-emerald-600">(recommended)</span>
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading || !elementComplete}
            className="w-full cursor-pointer rounded-lg bg-brand-primary-600 px-4 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:bg-brand-primary-200 disabled:text-zinc-500"
          >
            {loading ? 'Processing...' : 'Pay Now'}
          </button>
        </div>
      </div>
    </form>
  );
}
