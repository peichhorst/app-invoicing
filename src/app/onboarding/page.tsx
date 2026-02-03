'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Country, State } from 'country-state-city';
import { INDUSTRY_OPTIONS, OTHER_INDUSTRY_VALUE } from '@/constants/industry';

type ClientPayload = {
  companyName: string;
  contactName: string;
  email: string;
  phone?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
};

const CLIENT_PLACEHOLDERS = {
  companyName: 'Acme Design Co',
  contactName: 'Jamie Rivera',
  email: 'jamie@acme.studio',
  phone: '555-010-0222',
  addressLine1: '125 W Commerce St',
  city: 'Austin',
  state: 'TX',
  postalCode: '78701',
  country: 'USA',
  notes: 'Here is your onboarding client. You can customize the invoice after you finish.',
} as const;

const MS_IN_DAY = 1000 * 60 * 60 * 24;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const deriveIndustryStateFromLabel = (value?: string | null) => {
  const normalized = value?.trim() ?? '';
  if (!normalized) {
    return { selection: '', custom: '' };
  }
  const storedSlug = slugify(normalized);
  const matchingOption = INDUSTRY_OPTIONS.find((option) => {
    if (option.value === normalized || option.label === normalized) {
      return true;
    }
    if (storedSlug && slugify(option.value) === storedSlug) {
      return true;
    }
    return false;
  });
  if (matchingOption) {
    return { selection: matchingOption.value, custom: '' };
  }
  return { selection: OTHER_INDUSTRY_VALUE, custom: normalized };
};

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{
    email: string;
    companyName?: string | null;
    name?: string | null;
    role?: string | null;
    company?: { name?: string | null; website?: string | null } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [companyIconUrl, setCompanyIconUrl] = useState<string | null>(null);
  const [iconPreview, setIconPreview] = useState('');
  const [iconError, setIconError] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [slogan, setSlogan] = useState('');
  const [industrySelection, setIndustrySelection] = useState('');
  const [industryCustom, setIndustryCustom] = useState('');
  const [redirecting, setRedirecting] = useState(false);

  // On auth/onboarding screens, kill any stale service worker/cache to avoid chunk load errors.
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((reg) => reg.unregister())))
      .catch((err) => console.error("Service worker cleanup failed", err));
  }, []);

  const [websiteUrl, setWebsiteUrl] = useState('');
  const [logoFetching, setLogoFetching] = useState(false);
  const [logoFetchStatus, setLogoFetchStatus] = useState<{ message: string; success: boolean; source?: string } | null>(null);
  const logoFetchController = useRef<AbortController | null>(null);
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateValue, setStateValue] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('USA');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [useHeaderLogo, setUseHeaderLogo] = useState(false);
  const [clientForm, setClientForm] = useState<ClientPayload>({
    companyName: '',
    contactName: '',
    email: '',
    country: 'USA',
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);
  const isOwner = user?.role === 'OWNER';
  const displayBusinessName =
    (companyName && companyName.trim()) ||
    user?.company?.name ||
    user?.companyName ||
    null;

  const countryList = useMemo(() => {
    const all = Country.getAllCountries();
    const us = all.find((c) => c.isoCode === 'US');
    const rest = all.filter((c) => c.isoCode !== 'US');
    return (us ? [us, ...rest] : all).map((c) => ({ name: c.name, isoCode: c.isoCode }));
  }, []);

  const getCountryIso = (label: string) => {
    const match = countryList.find((c) => c.name === label || c.isoCode === label);
    return match?.isoCode ?? '';
  };

  const availableStates = useMemo(() => {
    const iso = getCountryIso(country);
    return iso ? State.getStatesOfCountry(iso).map((st) => st.name) : [];
  }, [country, countryList]);

  const availableClientStates = useMemo(() => {
    const clientCountry = clientForm.country || country;
    const iso = getCountryIso(clientCountry);
    return iso ? State.getStatesOfCountry(iso).map((st) => st.name) : [];
  }, [clientForm.country, country, countryList]);

  const computedIndustryValue = useMemo(() => {
    if (!industrySelection) return '';
    return industrySelection === OTHER_INDUSTRY_VALUE ? industryCustom.trim() : industrySelection;
  }, [industrySelection, industryCustom]);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => {
        if (!res.ok) {
          router.replace('/');
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.user) {
          setUser(data.user);
          setCompanyName('');
          setPhone(data.user.phone || '');
          setAddressLine1(data.user.company?.addressLine1 || '');
          setAddressLine2(data.user.company?.addressLine2 || '');
          setCity(data.user.company?.city || '');
          setStateValue(data.user.company?.state || '');
          setPostalCode(data.user.company?.postalCode || '');
          setCountry(data.user.company?.country || 'USA');
          setWebsiteUrl(data.user.company?.website || '');
          setUseHeaderLogo(Boolean(data.user.company?.useHeaderLogo));
          const industryState = deriveIndustryStateFromLabel(data.user.company?.industry ?? null);
          setIndustrySelection(industryState.selection);
          setIndustryCustom(industryState.custom);
          setCompanyIconUrl(data.user.company?.iconUrl ?? null);
          setIconPreview(data.user.company?.iconUrl ?? '');
          setSlogan(data.user.company?.slogan ?? '');
          setClientForm((prev) => ({
            ...prev,
            email: prev.email || data.user.email || '',
          }));
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    if (!isOwner) {
      logoFetchController.current?.abort();
      setLogoFetchStatus(null);
      return;
    }
    if (logoFetchController.current) {
      logoFetchController.current.abort();
    }
    if (!websiteUrl.trim()) {
      setLogoFetchStatus(null);
      return;
    }
    const timer = setTimeout(() => {
      requestLogoFromWebsite(websiteUrl.trim());
    }, 600);
    return () => {
      clearTimeout(timer);
      logoFetchController.current?.abort();
    };
  }, [websiteUrl, isOwner]);

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError('Only image files are supported.');
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
        const text = await res.text();
        throw new Error(text || 'Upload failed.');
      }
      const data = await res.json();
      setLogoDataUrl(data.secureUrl);
      setLogoPreview(data.secureUrl);
      setUseHeaderLogo(true);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('company-logo-uploaded', { detail: data.secureUrl }));
        window.dispatchEvent(new CustomEvent('company-logo-toggle', { detail: true }));
      }
    } catch (error: any) {
      setLogoError(error?.message || 'Logo upload failed.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleIconChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setIconError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setIconError('Only image files are supported.');
      return;
    }
    setUploadingIcon(true);
    try {
      const formData = new FormData();
      formData.append('logo', file);
      const res = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Upload failed.');
      }
      const data = await res.json();
      setCompanyIconUrl(data.secureUrl);
      setIconPreview(data.secureUrl);
    } catch (error: any) {
      setIconError(error?.message || 'Icon upload failed.');
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedCompany = companyName.trim();
    if (!trimmedCompany) {
      setProfileError('Business name is required.');
      setProfileMessage(null);
      return;
    }

    setProfileError(null);
    setProfileMessage(null);
    setProfileSaving(true);
    const canonicalCompanyName = trimmedCompany || user?.companyName || user?.company?.name || 'My Business';
    try {
      const canonicalName = trimmedCompany || null;
      const payload = {
        name: canonicalName,
        companyName: canonicalName,
        logoDataUrl: logoDataUrl || null,
        website: websiteUrl.trim() || null,
        phone: phone.trim() || null,
        addressLine1: addressLine1.trim() || null,
        addressLine2: addressLine2.trim() || null,
        city: city.trim() || null,
        state: stateValue.trim() || null,
        postalCode: postalCode.trim() || null,
        country: country.trim() || null,
      };
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || 'Failed');
      }

      if (isOwner) {
        const companyRes = await fetch('/api/company', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: canonicalCompanyName,
            websiteUrl: websiteUrl.trim() || null,
            useHeaderLogo,
            iconUrl: companyIconUrl || null,
            slogan: slogan.trim() || null,
            industry: computedIndustryValue || null,
          }),
        });
        if (!companyRes.ok) {
          const text = await companyRes.text();
          throw new Error(text || 'Failed to save company website');
        }
      }
      setStep(2);
      setProfileMessage('Company info saved. Now let us add your first client.');
      setClientForm((prev) => ({
        ...prev,
        companyName: companyName ? `${companyName} Client` : prev.companyName,
      }));
    } catch (error: any) {
      setProfileError(error?.message || 'Could not save company info.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleHeaderLogoToggle = (checked: boolean) => {
    setUseHeaderLogo(checked);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('company-logo-toggle', { detail: checked }));
      if (!checked) {
        window.dispatchEvent(new CustomEvent('company-logo-uploaded', { detail: '' }));
      } else if (logoDataUrl) {
        window.dispatchEvent(new CustomEvent('company-logo-uploaded', { detail: logoDataUrl }));
      }
    }
  };

  const handleClientChange = (field: keyof ClientPayload, value: string) => {
    setClientForm((prev) => ({
      ...prev,
      [field]: value,
      ...(field === 'companyName'
        ? {
            contactName: value,
          }
        : {}),
    }));
  };

  const handleClientCountryChange = (value: string) => {
    setClientForm((prev) => ({
      ...prev,
      country: value,
      state: '',
      city: '',
    }));
  };

  const handleCompanyCountryChange = (value: string) => {
    setCountry(value);
    setStateValue('');
    setCity('');
  };

  const handleFinishOnboarding = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClientMessage(null);
    setClientError(null);
    if (!clientForm.companyName.trim()) {
      setClientError('Client name is required.');
      return;
    }
    if (!clientForm.email.trim()) {
      setClientError('Client email is required.');
      return;
    }
    setCreatingClient(true);
    setRedirecting(false);
    try {
      const clientPayload = {
        companyName: clientForm.companyName,
        contactName: clientForm.contactName,
        email: clientForm.email,
        phone: clientForm.phone,
        addressLine1: clientForm.addressLine1,
        city: clientForm.city,
        state: clientForm.state,
        postalCode: clientForm.postalCode,
        country: clientForm.country,
        notes: clientForm.notes,
      };
      const clientRes = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientPayload),
      });
      if (!clientRes.ok) {
        throw new Error(await clientRes.text());
      }

      // Mark onboarding as complete
      if (isOwner) {
        const companyRes = await fetch('/api/company', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completeOnboarding: true,
          }),
        });
        if (!companyRes.ok) {
          throw new Error('Failed to complete onboarding');
        }
      }

      setClientMessage('Client created! Redirecting to dashboard…');
      setRedirecting(true);
    } catch (error: any) {
      setClientError(error?.message || 'Failed to create your first client.');
    } finally {
      setCreatingClient(false);
    }
  };

  // Handle delayed redirect once redirecting is true so the overlay can render.
  useEffect(() => {
    if (!redirecting) return;
    const timer = setTimeout(() => {
      window.location.href = '/dashboard';
    }, 2500);
    return () => clearTimeout(timer);
  }, [redirecting]);

  async function requestLogoFromWebsite(value: string) {
    if (!value) return;
    logoFetchController.current?.abort();
    const controller = new AbortController();
    logoFetchController.current = controller;
    setLogoFetching(true);
    setLogoFetchStatus(null);
    try {
      const response = await fetch('/api/logo-fetcher', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: value }),
        signal: controller.signal,
      });
      const data = await response.json();
      if (data?.success) {
        setLogoPreview(data.logoUrl);
        setLogoDataUrl(data.logoUrl);
        setUseHeaderLogo(true);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('company-logo-uploaded', { detail: data.logoUrl }));
          window.dispatchEvent(new CustomEvent('company-logo-toggle', { detail: true }));
        }
        setLogoFetchStatus({
          message: `Logo fetched via ${data.source ?? 'site'}.`,
          success: true,
          source: data.source,
        });
      } else {
        setLogoFetchStatus({
          message: data?.message ?? 'Unable to find a logo automatically.',
          success: false,
        });
      }
    } catch (error: any) {
      if (controller.signal.aborted) return;
      setLogoFetchStatus({
        message: 'Unable to fetch logo right now. Try again.',
        success: false,
      });
    } finally {
      if (!controller.signal.aborted) {
        setLogoFetching(false);
      }
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-primary-700 via-brand-secondary-700 to-brand-accent-700 text-sm text-white">
        Loading onboarding...
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden bg-gradient-to-br from-brand-primary-700 via-brand-secondary-700 to-brand-accent-700 px-4 py-16">
      {redirecting && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="rounded-3xl border border-white/10 bg-white/10 px-6 py-5 text-center shadow-2xl">
            <div className="flex items-center justify-center gap-2 text-white">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15" aria-hidden="true">
                <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              </span>
              <div className="text-left">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-white/80">Redirecting</p>
                <p className="text-sm text-white">Setting up your workspace…</p>
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="absolute inset-0 opacity-40">
        <div className="grid-overlay" />
      </div>
      <div className="relative w-full max-w-4xl space-y-8 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/70">Onboarding</p>
          <h1 className="text-3xl font-semibold text-white">Finish setting up your account</h1>
          <p className="text-sm text-white/70">
            You are signed in with email <strong>{user.email}</strong>. <br />We just need some information about you and to add a first client to get a real invoice ready.
          </p>
          {displayBusinessName && (
            <p className="text-sm text-white/70">
              Business name:
              <br />
              <span className="text-white font-semibold">{displayBusinessName}</span>
            </p>
          )}
        </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
              <button
                type="button"
                onClick={() => setStep(1)}
                className={`px-4 py-2 rounded-full transition ${step === 1 ? 'bg-brand-primary-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                aria-current={step === 1 ? 'step' : undefined}
              >
                Step 1
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className={`px-4 py-2 rounded-full transition ${step === 2 ? 'bg-brand-primary-600 text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}
                aria-current={step === 2 ? 'step' : undefined}
              >
                Step 2
              </button>
            </div>

          {step === 1 && (
            <form
              onSubmit={handleProfileSubmit}
              className="space-y-5 text-white"
            >
              <div className="space-y-1 text-sm">
                <label className="text-sm font-medium text-white/80 mb-1 block">Company / Personal Name</label>
                <input
                  value={companyName}
                  onChange={(event) => {
                    setCompanyName(event.target.value);
                    if (profileError) setProfileError(null);
                  }}
                  placeholder="Acme Corp or John Smith"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  aria-invalid={Boolean(profileError)}
                  aria-describedby={profileError ? 'company-error' : undefined}
                />
                <p className="text-xs text-white/60">Enter company name or individual&rsquo;s full name</p>
                {profileError && (
                  <p id="company-error" className="text-xs text-rose-200">
                    {profileError}
                  </p>
                )}
              </div>

              <div className="space-y-1 text-sm">
                <label className="text-sm font-medium text-white/80 mb-1 block">Slogan / tagline</label>
                <input
                  value={slogan}
                  onChange={(event) => setSlogan(event.target.value)}
                  placeholder="Short phrase that sums up your service"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <p className="text-xs text-white/60">Optional line displayed under your business name.</p>
              </div>

              <div className="space-y-1 text-sm">
                <label className="text-sm font-medium text-white/80 mb-1 block">Phone</label>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </div>

              <div className="space-y-1 text-sm">
                <label className="text-sm font-medium text-white/80 mb-1 block">Address</label>
                <input
                  value={addressLine1}
                  onChange={(event) => setAddressLine1(event.target.value)}
                  placeholder="Street address"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <input
                  value={addressLine2}
                  onChange={(event) => setAddressLine2(event.target.value)}
                  placeholder="Apt, suite, etc. (optional)"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    value={city}
                    onChange={(event) => setCity(event.target.value)}
                    placeholder="City"
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                  {availableStates.length ? (
                    <select
                      value={stateValue}
                      onChange={(event) => setStateValue(event.target.value)}
                      className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-brand-primary-900"
                    >
                      <option value="">Select state/province</option>
                      {availableStates.map((st: string) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={stateValue}
                      onChange={(event) => setStateValue(event.target.value)}
                      placeholder="State"
                      className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                    />
                  )}
                  <input
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    placeholder="ZIP"
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>
                <select
                  value={countryList.find(c => c.name === country)?.isoCode || country}
                  onChange={(event) => {
                    const selected = countryList.find(c => c.isoCode === event.target.value);
                    handleCompanyCountryChange(selected ? selected.name : event.target.value);
                  }}
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-brand-primary-900"
                >
                  {countryList.map((c) => {
                    const flag = c.isoCode
                      ? c.isoCode
                          .toUpperCase()
                          .replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)))
                      : '';
                    return (
                      <option key={c.isoCode} value={c.isoCode}>
                        {flag} {c.name}
                      </option>
                    );
                  })}
                </select>
              </div>

              {isOwner && (
                <div className="space-y-1 text-sm">
                  <label className="text-sm font-medium text-white/80 mb-1 block">Website</label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                    <input
                      value={websiteUrl}
                      onChange={(event) => setWebsiteUrl(event.target.value)}
                      placeholder="https://example.com"
                      className="flex-1 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                    />
                    <button
                      type="button"
                      onClick={() => requestLogoFromWebsite(websiteUrl.trim())}
                      disabled={!websiteUrl.trim() || logoFetching}
                      className="rounded-2xl border border-white/20 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-brand-primary-900 transition hover:bg-white/80 disabled:opacity-60"
                    >
                      {logoFetching ? 'Finding logo…' : 'Fetch logo'}
                    </button>
                  </div>
                  {logoFetchStatus && (
                    <p className={`text-xs ${logoFetchStatus.success ? 'text-emerald-200' : 'text-rose-200'}`}>
                      {logoFetchStatus.message}
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-1 text-sm">
                <label className="text-sm font-medium text-white/80 mb-1 block">Industry</label>
                <select
                  value={industrySelection}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setIndustrySelection(nextValue);
                    if (nextValue !== OTHER_INDUSTRY_VALUE) {
                      setIndustryCustom('');
                    }
                  }}
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                >
                  <option value="">Select an industry</option>
                  {INDUSTRY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {industrySelection === OTHER_INDUSTRY_VALUE && (
                  <input
                    type="text"
                    value={industryCustom}
                    onChange={(event) => setIndustryCustom(event.target.value)}
                    placeholder="Describe your custom service offering"
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                )}
                <p className="text-xs text-white/60">
                  Choose the option that best describes your primary services. Use Other if none of the presets fit.
                </p>
              </div>

              <div className="space-y-1 text-sm">
                <label className="text-sm font-medium text-white/80 mb-1 block">Logo (optional)</label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    disabled={uploadingLogo}
                    className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                  <input type="hidden" name="logoDataUrl" value={logoDataUrl ?? ''} />
                  {uploadingLogo && <p className="text-xs text-zinc-500">Uploading logo…</p>}
                  {logoPreview && (
                    <img
                      src={logoPreview}
                      alt="logo preview"
                      className="mt-2 h-20 w-20 rounded-xl border border-white/20 object-contain"
                    />
                  )}
                  {logoError && <p className="text-xs text-rose-300">{logoError}</p>}
                  <label className="flex items-center gap-2 text-sm text-white/80">
                    <input
                      type="checkbox"
                      checked={useHeaderLogo}
                      onChange={(e) => handleHeaderLogoToggle(e.target.checked)}
                      className="h-4 w-4 rounded border-white/50 bg-white/10 text-brand-primary-900 focus:ring-white"
                    />
                    <span>Use company logo in header</span>
                  </label>
                </div>
              </div>

              <div className="space-y-1 text-sm">
                <label className="text-sm font-medium text-white/80 mb-1 block">Business Icon (optional)</label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleIconChange}
                    disabled={uploadingIcon}
                    className="rounded-full border border-white/40 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
                  />
                  <input type="hidden" name="iconDataUrl" value={companyIconUrl ?? ''} />
                  {uploadingIcon && <p className="text-xs text-zinc-500">Uploading icon…</p>}
                  {iconPreview && (
                    <img
                      src={iconPreview}
                      alt="icon preview"
                      className="mt-2 h-16 w-16 rounded-xl border border-white/20 object-contain"
                    />
                  )}
                  {iconError && <p className="text-xs text-rose-300">{iconError}</p>}
                  <p className="text-xs text-white/60">Use a compact square icon for compact placements.</p>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={profileSaving}
                  className="rounded-2xl bg-white px-6 py-3 text-sm font-semibold text-brand-primary-900 shadow-lg transition hover:opacity-90 disabled:opacity-60"
                >
                  {profileSaving ? 'Saving...' : 'Save & continue'}
                </button>
              </div>
              {profileError && <p className="text-xs text-rose-200">{profileError}</p>}
              {profileMessage && <p className="text-xs text-white/70">{profileMessage}</p>}
            </form>
          )}

          {step === 2 && (
            <form
              onSubmit={handleFinishOnboarding}
              className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-sm"
            >
              <p className="text-sm text-white/80">Add your first client so you&rsquo;re ready to invoice once you need it.</p>

              <div className="space-y-3">
                <label className="text-xs uppercase tracking-[0.2em] text-white/70">Client info</label>
                <div className="space-y-2">
                  <label className="text-xs uppercase tracking-[0.2em] text-white/70">Company Name</label>
                  <input
                    value={clientForm.companyName}
                    onChange={(event) => handleClientChange('companyName', event.target.value)}
                    placeholder="Acme Corp or John Smith"
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                  <p className="text-xs text-white/60">Enter company name or individual&rsquo;s full name</p>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={clientForm.email}
                    onChange={(event) => handleClientChange('email', event.target.value)}
                    type="email"
                    placeholder="contact@email.com"
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                  <input
                    value={clientForm.phone ?? ''}
                    onChange={(event) => handleClientChange('phone', event.target.value)}
                    placeholder="Phone (optional)"
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>
                <input
                  value={clientForm.addressLine1 ?? ''}
                  onChange={(event) => handleClientChange('addressLine1', event.target.value)}
                  placeholder="Address line 1"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <div className="grid gap-3 md:grid-cols-3">
                  <input
                    value={clientForm.city ?? ''}
                    onChange={(event) => handleClientChange('city', event.target.value)}
                    placeholder="City"
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                  {availableClientStates.length ? (
                    <select
                      value={clientForm.state ?? ''}
                      onChange={(event) => handleClientChange('state', event.target.value)}
                      className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-brand-primary-900"
                    >
                      <option value="">Select state/province</option>
                      {availableClientStates.map((st: string) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={clientForm.state ?? ''}
                      onChange={(event) => handleClientChange('state', event.target.value)}
                      placeholder="State"
                      className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                    />
                  )}
                  <input
                    value={clientForm.postalCode ?? ''}
                    onChange={(event) => handleClientChange('postalCode', event.target.value)}
                    placeholder="ZIP"
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>
                <select
                  value={clientForm.country ?? ''}
                  onChange={(event) => handleClientCountryChange(event.target.value)}
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-brand-primary-900"
                >
                  {countryList.map((c) => (
                    <option key={c.isoCode} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1 text-sm">
                <label>Notes (optional)</label>
                <textarea
                  value={clientForm.notes ?? ''}
                  onChange={(event) => handleClientChange('notes', event.target.value)}
                  rows={2}
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                />
              </div>

              <button
                type="submit"
                disabled={creatingClient}
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-brand-primary-900 shadow-lg transition  hover:opacity-90 disabled:opacity-60"
              >
                {creatingClient ? 'Creating client...' : 'Create client'}
              </button>             

              {clientError && <p className="text-xs text-rose-200">{clientError}</p>}
              {clientMessage && <p className="text-xs text-white/70">{clientMessage}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
