'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StripeConnectGuide } from '@/components/StripeConnectGuide';

type ProfileFormProps = {
  initial: {
    name: string;
    email: string;
    companyName?: string | null;
    logoDataUrl?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    stripeAccountId?: string | null;
    stripePublishableKey?: string | null;
    venmoHandle?: string | null;
    zelleHandle?: string | null;
    mailToAddressEnabled?: boolean | null;
    mailToAddressTo?: string | null;
    trackdriveLeadToken?: string | null;
    trackdriveLeadEnabled?: boolean | null;
  };
  canAcceptPayments: boolean;
};

export function ProfileForm({ initial, canAcceptPayments }: ProfileFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const hasStripeKeys = Boolean(initial.stripeAccountId || initial.stripePublishableKey);
  const [useCustomStripe, setUseCustomStripe] = useState(hasStripeKeys);
  const [stripeAccountIdValue, setStripeAccountIdValue] = useState(initial.stripeAccountId ?? '');
  const [stripePublishableKeyValue, setStripePublishableKeyValue] = useState(initial.stripePublishableKey ?? '');
  const [useVenmo, setUseVenmo] = useState(Boolean(initial.venmoHandle));
  const [useZelle, setUseZelle] = useState(Boolean(initial.zelleHandle));
  const [venmoHandleValue, setVenmoHandleValue] = useState(initial.venmoHandle ?? '');
  const [zelleHandleValue, setZelleHandleValue] = useState(initial.zelleHandle ?? '');
  const defaultMailTo = initial.mailToAddressEnabled ?? !initial.mailToAddressTo;
  const [mailToAddressEnabled, setMailToAddressEnabled] = useState(defaultMailTo);
  const looksLikeEmail = (value?: string | null) => Boolean(value && value.includes('@'));
  const sanitizedName = looksLikeEmail(initial.name) ? '' : initial.name ?? '';
  const [companyNameValue, setCompanyNameValue] = useState(initial.companyName ?? sanitizedName);
  const [addressLine1Value, setAddressLine1Value] = useState(initial.addressLine1 ?? '');
  const [addressLine2Value, setAddressLine2Value] = useState(initial.addressLine2 ?? '');
  const [cityValue, setCityValue] = useState(initial.city ?? '');
  const [stateValue, setStateValue] = useState(initial.state ?? '');
  const [postalCodeValue, setPostalCodeValue] = useState(initial.postalCode ?? '');
  const [countryValue, setCountryValue] = useState(initial.country ?? 'USA');
  const getInitialPayableOption = (): 'same' | 'custom' => {
    if (!initial.mailToAddressTo) return 'same';
    if (initial.companyName && initial.mailToAddressTo === initial.companyName) return 'same';
    return 'custom';
  };
  const [payableOption, setPayableOption] = useState<'same' | 'custom'>(getInitialPayableOption);
  const [customPayableValue, setCustomPayableValue] = useState(initial.mailToAddressTo ?? '');
  const [stripeMessage, setStripeMessage] = useState<string | null>(null);
  const [stripeErrorLink, setStripeErrorLink] = useState<string | null>(null);
  const [logoDataUrl, setLogoDataUrl] = useState(initial.logoDataUrl ?? '');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [leadTokenValue, setLeadTokenValue] = useState(initial.trackdriveLeadToken ?? '');
  const [leadTokenEnabled, setLeadTokenEnabled] = useState(initial.trackdriveLeadEnabled ?? false);
  const paymentDisabled = !canAcceptPayments;
  const paymentFieldsetClass = paymentDisabled
    ? 'space-y-2 rounded-xl border border-zinc-200 bg-zinc-100 p-4 text-zinc-500 shadow-inner transition'
    : 'space-y-2 rounded-xl border border-zinc-200 bg-white p-4 text-zinc-900 shadow-sm transition';
  const paymentLegendClass = paymentDisabled
    ? 'text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500'
    : 'text-sm font-semibold uppercase tracking-[0.3em] text-zinc-900';
  const paymentLabelClass = paymentDisabled
    ? 'flex items-center gap-2 text-sm font-semibold text-zinc-500'
    : 'flex items-center gap-2 text-sm font-semibold text-zinc-800';
  const stripeLabelClass = paymentDisabled
    ? paymentLabelClass
    : 'flex items-center gap-2 text-sm font-semibold text-zinc-500';
  const paymentControlTextClass = paymentDisabled ? 'text-zinc-400' : 'text-zinc-700';
  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10';
  const disabledInputClass = `${inputClass} bg-zinc-100 text-zinc-500 placeholder:text-zinc-400 cursor-not-allowed`;
  const companyLabel = useMemo(() => companyNameValue.trim() || 'Your Company', [companyNameValue]);
  const computedMailToValue = useMemo(() => {
    if (!mailToAddressEnabled) {
      return '';
    }
    if (payableOption === 'same') return companyLabel;
    return customPayableValue.trim() || companyLabel;
  }, [companyLabel, customPayableValue, mailToAddressEnabled, payableOption]);
  const mailPreviewText = computedMailToValue || 'Your Company';
  const VENMO_PAYMENT_AMOUNT = 25;
  const VENMO_PAYMENT_NOTE = 'Invoice payment';
  const venmoLink = useMemo(() => {
    if (!useVenmo) return undefined;
    const handle = venmoHandleValue.trim();
    if (!handle) return undefined;
    const normalized = handle.startsWith('@') ? handle.slice(1) : handle;
    const encodedNote = encodeURIComponent(VENMO_PAYMENT_NOTE);
    return `https://venmo.com/u/${normalized}?txn=pay&amount=${VENMO_PAYMENT_AMOUNT}&note=${encodedNote}`;
  }, [useVenmo, venmoHandleValue]);
  const venmoQrUrl = useMemo(() => {
    if (!venmoLink) return undefined;
    const encodedQrLink = encodeURIComponent(venmoLink);
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedQrLink}`;
  }, [venmoLink]);

  useEffect(() => {
    if (!paymentDisabled) return;
    setUseVenmo(false);
    setUseZelle(false);
    setUseCustomStripe(false);
  }, [paymentDisabled]);

  useEffect(() => {
    if (!paymentDisabled && (stripeAccountIdValue || stripePublishableKeyValue)) {
      setUseCustomStripe(true);
    }
  }, [paymentDisabled, stripeAccountIdValue, stripePublishableKeyValue]);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (
        typeof event.origin !== 'string' ||
        (!event.origin.includes('clientwave.app') && !event.origin.includes('localhost'))
      ) {
        return;
      }
      if (event.data?.type === 'stripe-connected') {
        const payload = event.data.payload;
        if (payload?.accountId) {
          setStripeAccountIdValue(payload.accountId);
        }
        if (payload?.publishableKey) {
          setStripePublishableKeyValue(payload.publishableKey);
        }
        setUseCustomStripe(true);
        setStripeMessage('Stripe credentials received. Save to keep them.');
        setStripeErrorLink(null);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const handleLogoFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError('Please upload an image.');
      return;
    }
    setUploadingLogo(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(txt || 'Upload failed.');
      }
      const data = await res.json();
      setLogoDataUrl(data.secureUrl);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      setLogoError(message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;
    const canonicalName = companyNameValue.trim() || sanitizedName || initial.name || '';
    payload.name = canonicalName;
    payload.companyName = canonicalName;
    payload.trackdriveLeadToken = leadTokenValue.trim();
    payload.trackdriveLeadEnabled = leadTokenEnabled ? 'true' : 'false';

    startTransition(async () => {
      setMessage(null);
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.refresh();
        window.location.assign('/dashboard');
      } else {
        const txt = await res.text();
        setMessage(txt || 'Update failed');
      }
    });
  };

  const STRIPE_LOSS_DOC = 'https://dashboard.stripe.com/settings/connect/platform-profile';

  const resetStripeFields = () => {
    setStripeAccountIdValue('');
    setStripePublishableKeyValue('');
    setUseCustomStripe(false);
    setStripeMessage('Stripe disconnected. Save to keep the change.');
  };

  const requestStripeLink = async (endpoint: '/api/payments/account-link' | '/api/payments/dashboard-link') => {
    setStripeMessage('Opening Stripe...');
    setStripeErrorLink(null);
    try {
      const res = await fetch(endpoint, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const url = data?.url as string | undefined;
      if (url) {
        if (endpoint === '/api/payments/account-link') {
          window.location.assign(url);
        } else {
          window.open(url, '_blank', 'noopener,noreferrer');
        }
        setStripeMessage(null);
      } else {
        setStripeMessage('Stripe link generated but no URL returned.');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create Stripe link.';
      setStripeMessage(msg);
      if (msg.includes(STRIPE_LOSS_DOC)) {
        setStripeErrorLink(STRIPE_LOSS_DOC);
      }
    }
  };

  const handleStripeLink = (endpoint: '/api/payments/account-link' | '/api/payments/dashboard-link') => {
    void requestStripeLink(endpoint);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
      <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white/70 p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Profile Details</p>
          <h2 className="text-lg font-semibold text-zinc-900">Keep your branding and contact info up to date</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Company / Personal Name</label>
            <input
              name="companyName"
              value={companyNameValue}
              onChange={(event) => setCompanyNameValue(event.target.value)}
              placeholder={initial.companyName || initial.name || 'Acme Corp or John Smith'}
              className={inputClass}
            />
            <p className="text-xs text-zinc-500">Enter company name or individual&rsquo;s full name</p>
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Email (view only)</label>
            <input
              name="email"
              type="email"
              defaultValue={initial.email}
              readOnly
              disabled
              className="w-full cursor-not-allowed rounded-lg border border-zinc-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 shadow-sm"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Logo / Profile Picture</label>
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
            <label className="w-full md:w-1/2 inline-flex items-center justify-center rounded-lg bg-purple-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-purple-700">
              Upload logo
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoFileChange}
                disabled={uploadingLogo}
                className="hidden"
              />
            </label>
            {logoDataUrl && (
              <>
                <img
                  src={logoDataUrl}
                  alt="logo preview"
                  className="h-20 w-20 rounded-xl border border-zinc-200 object-contain -mt-2"
                />
              </>
            )}
            <input type="hidden" name="logoDataUrl" value={logoDataUrl ?? ''} />
          </div>
          {uploadingLogo && <p className="text-xs text-zinc-500">Uploading logo...</p>}
          {logoError && <p className="text-xs text-rose-500">{logoError}</p>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Phone</label>
            <input name="phone" defaultValue={initial.phone ?? ''} className={inputClass} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Password (leave blank to keep)</label>
            <input name="password" type="password" placeholder="********" className={inputClass} />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-zinc-700">Address</label>
          <input
            name="addressLine1"
            value={addressLine1Value}
            placeholder="Street"
            onChange={(event) => setAddressLine1Value(event.target.value)}
            className={inputClass}
          />
          <input
            name="addressLine2"
            value={addressLine2Value}
            placeholder="Apt, suite, etc."
            onChange={(event) => setAddressLine2Value(event.target.value)}
            className={`${inputClass} mt-2`}
          />
          <div className="grid gap-3 md:grid-cols-3">
            <input
              name="city"
              value={cityValue}
              placeholder="City"
              onChange={(event) => setCityValue(event.target.value)}
              className={inputClass}
            />
            <input
              name="state"
              value={stateValue}
              placeholder="State"
              onChange={(event) => setStateValue(event.target.value)}
              className={inputClass}
            />
            <input
              name="postalCode"
              value={postalCodeValue}
              placeholder="ZIP"
              onChange={(event) => setPostalCodeValue(event.target.value)}
              className={inputClass}
            />
          </div>
          <input
            name="country"
            value={countryValue}
            placeholder="Country"
            onChange={(event) => setCountryValue(event.target.value)}
            className={`${inputClass} mt-2`}
          />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white/70 p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Payment Details </p>
        </div>

        <fieldset className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <legend className="text-sm font-semibold text-zinc-900">Options</legend>


          <div className="space-y-5">
            <input type="hidden" name="mailToAddressEnabled" value="false" />
            <label className={paymentLabelClass}>
              <input
                type="checkbox"
                name="mailToAddressEnabled"
                value="true"
                checked={mailToAddressEnabled}
                onChange={(event) => setMailToAddressEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
              />
              Send Check to Address
            </label>
            {!canAcceptPayments && (
              <p className="text-xs text-purple-700">
                <strong>PRO FEATURES</strong>
              </p>
            )}

            {mailToAddressEnabled && (
              <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
                <div className="space-y-6 rounded-lg border bg-gray-50 p-6">
                  <h3 className="text-sm font-semibold text-zinc-900">Checks should be made payable to:</h3>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                      <input
                        type="radio"
                        name="mailToAddressPayableOption"
                        value="same"
                        checked={payableOption === 'same'}
                        onChange={() => {
                          setPayableOption('same');
                          setCustomPayableValue('');
                        }}
                        className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                      />
                      Company / Personal Name
                      <span className="ml-1 text-xs text-zinc-500">({companyLabel})</span>
                    </label>

                    <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                      <input
                        type="radio"
                        name="mailToAddressPayableOption"
                        value="custom"
                        checked={payableOption === 'custom'}
                        onChange={() => setPayableOption('custom')}
                        className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                      />
                      Custom name
                    </label>

                    {payableOption === 'custom' && (
                      <input
                        type="text"
                        placeholder="e.g. John A. Smith, LLC"
                        value={customPayableValue}
                        onChange={(event) => setCustomPayableValue(event.target.value)}
                        className={inputClass}
                      />
                    )}
                  </div>
                </div>
                <div className="relative rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                  <span className="absolute right-3 top-3 rounded-full bg-purple-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-purple-700">
                    Preview
                  </span>
                  <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Mail & Issue Check To:</p>
                  <p className="text-lg font-semibold text-zinc-900">{mailPreviewText}</p>
                  <div className="mt-3 space-y-1 text-sm text-gray-700">
                    {addressLine1Value && <div>{addressLine1Value}</div>}
                    {addressLine2Value && <div>{addressLine2Value}</div>}
                    {(cityValue || stateValue || postalCodeValue) && (
                      <div className="flex flex-wrap gap-1">
                        {cityValue && <span>{cityValue}</span>}
                        {stateValue && <span>{stateValue}</span>}
                        {postalCodeValue && <span>{postalCodeValue}</span>}
                      </div>
                    )}
                    {countryValue && <div>{countryValue}</div>}
                    {!addressLine1Value &&
                      !addressLine2Value &&
                      !cityValue &&
                      !stateValue &&
                      !postalCodeValue &&
                      !countryValue && <div className="text-xs text-zinc-400">Enter an address above to preview it here.</div>}
                  </div>
                </div>
              </div>
            )}
            <input type="hidden" name="mailToAddressTo" value={mailToAddressEnabled ? computedMailToValue : ''} />
          </div>
          <div
            className={`space-y-3 ${paymentDisabled ? 'pointer-events-none opacity-60' : ''}`}
            aria-disabled={paymentDisabled}
          >
            <label className={paymentLabelClass}>
              <input
                type="checkbox"
                checked={useVenmo}
                onChange={(e) => setUseVenmo(e.target.checked)}
                disabled={paymentDisabled}
                className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
              />
              Venmo
            </label>
            {useVenmo && (
              <div className="space-y-1">
                <label className={`text-xs font-medium ${paymentControlTextClass}`}>Venmo handle or phone number</label>
                <input
                  name="venmoHandle"
                  value={venmoHandleValue}
                  onChange={(event) => setVenmoHandleValue(event.target.value)}
                  placeholder="@handle or phone"
                  className={paymentDisabled ? disabledInputClass : inputClass}
                />
                {venmoQrUrl && (
                  <div className="mt-2 flex flex-col gap-2 rounded-lg border border-dashed border-zinc-200 bg-white/80 p-3 text-xs text-zinc-500">
                    <img src={venmoQrUrl} alt="Venmo QR code" className="h-24 w-24 rounded-lg border border-zinc-200" />
                  </div>
                )}
              </div>
            )}
            <label className={paymentLabelClass}>
              <input
                type="checkbox"
                checked={useZelle}
                onChange={(e) => setUseZelle(e.target.checked)}
                disabled={paymentDisabled}
                className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
              />
              Zelle
            </label>
            {useZelle && (
              <div className="space-y-1">
                <label className={`text-xs font-medium ${paymentControlTextClass}`}>Zelle handle or phone number</label>
                <input
                  name="zelleHandle"
                  value={zelleHandleValue}
                  onChange={(event) => setZelleHandleValue(event.target.value)}
                  placeholder="phone or email"
                  className={paymentDisabled ? disabledInputClass : inputClass}
                />
              </div>
            )}
         

          <div id="stripe" className="space-y-2">
            <label className={paymentLabelClass}>
              <input
                type="checkbox"
                checked={useCustomStripe}
                onChange={(e) => setUseCustomStripe(e.target.checked)}
                disabled={paymentDisabled}
                className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
              />
              Online Payment (Requires Stripe Account)
            </label>
            {useCustomStripe && (
              <div
                className={`space-y-3 rounded-xl border border-zinc-200 ${
                  paymentDisabled ? 'bg-zinc-50 text-zinc-500' : 'bg-white text-zinc-900'
                } p-4`}
              >
                {!(stripeAccountIdValue && stripePublishableKeyValue) && <StripeConnectGuide />}
                {stripeAccountIdValue && stripePublishableKeyValue && (
                  <div className="rounded-xl border border-emerald-400 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
                    <p className="text-xs uppercase tracking-[0.3em] text-emerald-600 font-semibold">Stripe connected</p>
                  </div>
                )}
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1">
                    <label className={`text-xs font-medium ${paymentControlTextClass}`}>Stripe Publishable Key</label>
                    <input
                      name="stripePublishableKey"
                      value={stripePublishableKeyValue}
                      onChange={(event) => setStripePublishableKeyValue(event.target.value)}
                      placeholder="pk_live_..."
                      readOnly={Boolean(stripeAccountIdValue && stripePublishableKeyValue)}
                      className={paymentDisabled || (stripeAccountIdValue && stripePublishableKeyValue) ? disabledInputClass : inputClass}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-xs font-medium ${paymentControlTextClass}`}>Stripe Connect Account ID</label>
                      <input
                        name="stripeAccountId"
                        value={stripeAccountIdValue}
                        onChange={(event) => setStripeAccountIdValue(event.target.value)}
                        placeholder="acct_..."
                        readOnly={Boolean(stripeAccountIdValue && stripePublishableKeyValue)}
                        className={paymentDisabled || (stripeAccountIdValue && stripePublishableKeyValue) ? disabledInputClass : inputClass}
                      />
                  </div>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() =>
                      stripeAccountIdValue && stripePublishableKeyValue
                        ? resetStripeFields()
                        : handleStripeLink('/api/payments/account-link')
                    }
                    disabled={paymentDisabled}
                    className="w-full rounded-full border border-purple-600 bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:border-purple-200 disabled:bg-purple-200"
                  >
                    {stripeAccountIdValue && stripePublishableKeyValue ? 'Disconnect Stripe' : 'Connect Stripe Automatically'}
                  </button>
                </div>
              </div>
            )}
            {stripeMessage && <p className="text-xs text-amber-600">{stripeMessage}</p>}
            {stripeErrorLink && (
              <p className="text-xs text-amber-600">
                {"Please review the responsibilities of managing losses for connected accounts at https://dashboard.stripe.com/settings/connect/platform-profile."} This shows up when Stripe asks you to review connected account responsibilities (typically during new account onboarding).{' '}
                <a href={stripeErrorLink} target="_blank" rel="noreferrer" className="underline">
                  Learn more in Stripe Connect settings
                </a>
                .
              </p>
            )}
          </div>
             </div>

          {paymentDisabled && (
            <Link
              href="/dashboard/profile?upgrade=1"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-purple-600 bg-purple-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700 cursor-pointer"
            >
              Upgrade to ClientWave Pro
            </Link>
          )}
        </fieldset>
      </section>

      <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white/70 p-6 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Lead Generation</p>
        </div>
        <fieldset className={`space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 ${leadTokenEnabled ? '' : 'opacity-80'}`}>
          <legend className="text-sm font-semibold text-zinc-900">Options</legend>
          <label className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
            <input
              type="checkbox"
              checked={leadTokenEnabled}
              onChange={(event) => setLeadTokenEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
            />
            TrackDrive
          </label>
          {leadTokenEnabled && (
            <div className="space-y-2">
              <div className="text-sm text-zinc-600 space-y-2">
                <span>
                  Provide the TrackDrive lead token you copy from TrackDrive → Integrations → API &amp; Access Tokens and set the webhook (Integrations → Webhook Subscriptions → New Lead) to call{' '}
                  <code className="rounded bg-white px-1 py-0.5 text-xs font-mono">{`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.clientwave.app'}/api/trackdrive-webhook`}</code>.
                </span>
                <div>
                  <strong>Hey [Client Name],</strong>
                  <br />
                  Here&rsquo;s exactly how to auto-send every new TrackDrive lead into ClientWave (takes ~3 minutes):
                  <ol className="mt-2 space-y-1 list-decimal pl-5 text-xs text-zinc-600">
                    <li>
                      Go to <em>TrackDrive → Integrations → API &amp; Access Tokens</em> and copy your Lead Token.
                    </li>
                    <li>
                      Go to <em>Integrations → Webhook Subscriptions</em> and create a new webhook with Event “New Lead”, URL{' '}
                      <code className="rounded bg-white px-1 py-0.5 text-xs font-mono">https://clientwave.app/api/trackdrive-webhook</code>, and paste the Lead Token.
                    </li>
                    <li>
                      Go to <em>Leads → Contact Field Mapping</em> and add a mapping where Source Field is <code>{'{{agent.email}}'}</code> and Target Field is <code>agent_email</code>.
                    </li>
                  </ol>
                  That&rsquo;s it—every new lead now becomes a client in the correct agent&rsquo;s ClientWave account.
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Lead token</label>
                <input
                  name="trackdriveLeadToken"
                  value={leadTokenValue}
                  onChange={(event) => setLeadTokenValue(event.target.value)}
                  placeholder="tdprv..."
                  className={paymentDisabled ? disabledInputClass : inputClass}
                />
              </div>
              <p className="text-xs text-zinc-500">
                TrackDrive will include this token as <code className="rounded bg-white px-1 py-0.5 text-xs font-mono">lead_token</code> with each webhook call so we can match leads to your account.
              </p>
            </div>
          )}
          <input type="hidden" name="trackdriveLeadEnabled" value={leadTokenEnabled ? 'true' : 'false'} />
        </fieldset>
      </section>

      {message && <p className="text-sm text-rose-600">{message}</p>}

      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={() => router.push('/dashboard')}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 cursor-pointer"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending || uploadingLogo}
          className="rounded-lg bg-zinc-900 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 cursor-pointer disabled:opacity-60"
        >
          {isPending || uploadingLogo ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
}
