'use client';

import {
  useEffect,
  useState,
  type ChangeEvent,
  type Dispatch,
  type FormEvent,
  type SetStateAction,
} from "react";
import { CardElement, useElements, useStripe } from "@stripe/react-stripe-js";

type Address = {
  address1: string;
  address2: string;
  city: string;
  state: string;
  zip: string;
};

type CheckoutFormProps = {
  amount: number;
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
  defaultPaymentMethodId?: string | null;
  intentEndpoint?: string;
  onSuccess?: (paymentIntentId: string) => void | Promise<void>;
  onError?: (message: string) => void;
};

const BASE_PRICE = 50; // cents ($0.50)
const US_STATES = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

export default function CheckoutForm({
  amount,
  sellerId,
  invoiceId,
  initialEmail,
  initialAddress,
  stripeCustomerId,
  defaultPaymentMethodId,
  intentEndpoint,
  onSuccess,
  onError,
}: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const inputClass =
    "w-full rounded-lg border border-white/30 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/30";
  const cardElementOptions = {
    style: {
      base: {
        color: "#111827",
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: "16px",
        fontSmoothing: "antialiased",
        "::placeholder": { color: "#9CA3AF" },
      },
      invalid: {
        color: "#DC2626",
      },
    },
    hidePostalCode: true,
  };

  const [email, setEmail] = useState(initialEmail ?? "");
  const [billing, setBilling] = useState<Address>({
    address1: initialAddress?.line1 ?? "",
    address2: initialAddress?.line2 ?? "",
    city: initialAddress?.city ?? "",
    state: initialAddress?.state ?? "",
    zip: initialAddress?.postalCode ?? "",
  });
  const [shippingSameAsBilling] = useState(true);
  const [shippingAddress] = useState<Address>({ address1: "", address2: "", city: "", state: "", zip: "" });

  const [shipping] = useState<number | null>(null);
  const [tax] = useState<number | null>(null);
  const [total, setTotal] = useState(amount ?? BASE_PRICE);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const [saveCard, setSaveCard] = useState(Boolean(stripeCustomerId));
  const [processingMessageVisible, setProcessingMessageVisible] = useState(false);

  useEffect(() => {
    const createIntent = async () => {
      if (!email) {
        setClientSecret("");
        return;
      }
      setCalculating(true);
      setProcessingMessageVisible(false);
      setApiError(null);
      try {
        const res = await fetch(intentEndpoint ?? "/api/payments/create-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amount: total, email, sellerId, invoiceId }),
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setClientSecret(data.clientSecret);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create payment intent.";
        setApiError(message);
        if (onError) onError(message);
        setClientSecret("");
      } finally {
        setCalculating(false);
      }
    };

    const timer = setTimeout(() => {
      void createIntent();
    }, 400);
    return () => clearTimeout(timer);
  }, [email, total]);

  useEffect(() => {
    setTotal(amount ?? BASE_PRICE);
  }, [amount]);

  useEffect(() => {
    if (initialEmail && !email) {
      setEmail(initialEmail);
    }
  }, [initialEmail]);

  useEffect(() => {
    const addressEmpty =
      !billing.address1 && !billing.address2 && !billing.city && !billing.state && !billing.zip;
    if (initialAddress && addressEmpty) {
      setBilling({
        address1: initialAddress.line1 ?? "",
        address2: initialAddress.line2 ?? "",
        city: initialAddress.city ?? "",
        state: initialAddress.state ?? "",
        zip: initialAddress.postalCode ?? "",
      });
    }
  }, [initialAddress]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;

    setProcessingMessageVisible(true);
    setLoading(true);

    try {
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) {
        const message = "Please enter your card details.";
        alert(message);
        if (onError) onError(message);
        setLoading(false);
        return;
      }

      const result = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
          billing_details: {
            email,
            address: {
              line1: billing.address1,
              line2: billing.address2,
              city: billing.city,
              state: billing.state,
              postal_code: billing.zip,
              country: "US",
            },
          },
        },
      });

      if (result.paymentIntent?.status === "succeeded") {
        setSuccess(true);
        if (invoiceId) {
          void fetch("/api/payments/mark-paid", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invoiceId, sellerId }),
          });
          
          // Store payment method for recurring invoices
          if (result.paymentIntent.payment_method) {
            void fetch("/api/payments/store-recurring-payment-method", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                invoiceId,
                paymentIntentId: result.paymentIntent.id,
                paymentMethodId: result.paymentIntent.payment_method,
              }),
            });
          }
        }
        if (saveCard && stripeCustomerId && sellerId && result.paymentIntent.payment_method) {
          void fetch("/api/payments/save-card", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: sellerId,
              customerId: stripeCustomerId,
              paymentMethodId: result.paymentIntent.payment_method,
            }),
          });
        }
        if (result.paymentIntent?.id && onSuccess) {
          await onSuccess(result.paymentIntent.id);
        }
      } else {
        const message = result.error?.message || "Payment could not be completed.";
        alert(message);
        if (onError) onError(message);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Payment failed.";
      alert(message);
      if (onError) onError(message);
    } finally {
      setLoading(false);
      setProcessingMessageVisible(false);
    }
  };

  const renderStateSelect = (value: string, onChange: (value: string) => void) => {
    const selectClass = `${inputClass} bg-brand-primary-700/40 text-white`;
    return (
      <select
        className={selectClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required
      >
        <option value="" className="text-gray-900 bg-white">Select a state</option>
        {US_STATES.map((s) => (
          <option key={s.code} value={s.code} className="text-gray-900 bg-white">
            {s.name}
          </option>
        ))}
      </select>
    );
  };

  const handleZipChange = (
    e: ChangeEvent<HTMLInputElement>,
    setter: Dispatch<SetStateAction<Address>>,
  ) => {
    const value = e.target.value;
    if (/^\d*$/.test(value) && value.length <= 5) {
      setter((prev) => ({ ...prev, zip: value }));
    }
  };

  return (
    <div className="w-full">
      {success ? (
        <div className="rounded-2xl border border-white/20 bg-white/10 p-8 text-center text-white shadow-xl backdrop-blur">
          <h2 className="text-3xl font-semibold">Payment Successful!</h2>
          <p className="mt-2 text-sm text-white/80">Thank you for your payment. A receipt will be emailed shortly.</p>
        
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="rounded-2xl border border-white/20 bg-white/10 p-6 shadow-xl backdrop-blur space-y-8 text-white">
          {apiError && (
            <div className="rounded-lg border border-white/40 bg-white/20 px-4 py-2 text-sm text-rose-100">
              {apiError}
            </div>
          )}
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-semibold">Secure Checkout</h2>
            <p className="text-sm text-white/80">Enter your details and pay with your card.</p>
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
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Address</h3>
                </div>
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

            <div className="space-y-5 rounded-xl border border-white/20 bg-white/5 p-6">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Payment Details</h3>
                <div className="rounded-lg border border-white/20 bg-white px-3 py-3 text-black shadow-inner">
                  <CardElement onChange={(ev) => setCardComplete(ev.complete)} options={cardElementOptions} />
                </div>
              </div>

              <div className="space-y-2 rounded-lg border border-dashed border-white/30 bg-white/5 p-4 text-sm">
                <div className="flex items-center justify-between text-base font-semibold">
                  <span>Total</span>
                  <span>${(total / 100).toFixed(2)}</span>
                </div>
              </div>

              {stripeCustomerId && (
                <label className="flex items-center gap-3 mt-6 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={saveCard}
                    onChange={(e) => setSaveCard(e.target.checked)}
                    className="h-4 w-4 rounded border-white/60 text-brand-primary-600 focus:ring-brand-primary-500"
                  />
                  <span>
                    Save card for automatic recurring payments{" "}
                    <span className="text-green-300">(recommended)</span>
                  </span>
                </label>
              )}
              {processingMessageVisible && (calculating || loading) && (
                <p className="text-sm text-white/80">Preparing payment…</p>
              )}
              {apiError && <p className="text-xs text-amber-200">{apiError}</p>}

              <button
                type="submit"
                disabled={loading || calculating || !clientSecret || !cardComplete}
                className="w-full rounded-lg bg-white px-4 py-3 text-sm font-semibold text-brand-primary-700 shadow-sm transition hover:bg-white/90 cursor-pointer disabled:cursor-not-allowed disabled:bg-white/50 disabled:text-brand-primary-400"
              >
                {loading ? "Processing..." : "Pay Now"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}

