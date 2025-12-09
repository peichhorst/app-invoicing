'use client';

import { ChangeEvent, FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

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

export default function OnboardingPage() {
  const router = useRouter();
  const [user, setUser] = useState<{ email: string; companyName?: string | null; name?: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1);
  const [companyName, setCompanyName] = useState('');
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState('');
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [phone, setPhone] = useState('');
  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('');
  const [stateValue, setStateValue] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('USA');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState<ClientPayload>({
    companyName: '',
    contactName: '',
    email: '',
  });
  const [creatingClient, setCreatingClient] = useState(false);
  const [clientMessage, setClientMessage] = useState<string | null>(null);

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
          setCompanyName(data.user.companyName || '');
          setPhone(data.user.phone || '');
          setAddressLine1(data.user.addressLine1 || '');
          setAddressLine2(data.user.addressLine2 || '');
          setCity(data.user.city || '');
          setStateValue(data.user.state || '');
          setPostalCode(data.user.postalCode || '');
          setCountry(data.user.country || 'USA');
        }
      })
      .finally(() => setLoading(false));
  }, [router]);

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
    } catch (error: any) {
      setLogoError(error?.message || 'Logo upload failed.');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleProfileSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileMessage(null);
    setProfileSaving(true);
    try {
      const canonicalName = companyName.trim() || null;
      const payload = {
        name: canonicalName,
        companyName: canonicalName,
        logoDataUrl: logoDataUrl || null,
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
      setStep(2);
      setProfileMessage('Company info saved. Now let us add your first client.');
      setClientForm((prev) => ({
        ...prev,
        companyName: companyName ? `${companyName} Client` : prev.companyName,
      }));
    } catch (error: any) {
      setProfileMessage(error?.message || 'Could not save company info.');
    } finally {
      setProfileSaving(false);
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

  const handleFinishOnboarding = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClientMessage(null);
    setCreatingClient(true);
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

      setClientMessage('Client created! You can now send your first invoice.');
      setTimeout(() => {
        router.push('/dashboard');
        router.refresh();
      }, 1200);
    } catch (error: any) {
      setClientMessage(error?.message || 'Failed to create your first client.');
    } finally {
      setCreatingClient(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 text-sm text-white">
        Loading onboarding...
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-start justify-center overflow-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 px-4 py-16">
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
        </div>

        <div className="space-y-6">
          <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/70">
            <span className={`px-4 py-2 rounded-full ${step === 1 ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70'}`}>Step 1</span>
            <span className={`px-4 py-2 rounded-full ${step === 2 ? 'bg-purple-600 text-white' : 'bg-white/10 text-white/70'}`}>Step 2</span>
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
                  onChange={(event) => setCompanyName(event.target.value)}
                  placeholder="Acme Corp or John Smith"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                />
                <p className="text-xs text-white/60">Enter company name or individual&rsquo;s full name</p>
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
                  <input
                    value={stateValue}
                    onChange={(event) => setStateValue(event.target.value)}
                    placeholder="State"
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                  <input
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    placeholder="ZIP"
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>
                <input
                  value={country}
                  onChange={(event) => setCountry(event.target.value)}
                  placeholder="Country"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                />
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
                </div>
              </div>

              <button
                type="submit"
                disabled={profileSaving}
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-purple-900 shadow-lg transition hover:opacity-90 disabled:opacity-60"
              >
                {profileSaving ? 'Saving...' : 'Save & continue'}
              </button>
              {profileMessage && <p className="text-xs text-white/70">{profileMessage}</p>}
            </form>
          )}

          {step === 2 && (
            <form
              onSubmit={handleFinishOnboarding}
              className="space-y-5 rounded-3xl border border-white/10 bg-white/5 p-8 text-white shadow-sm"
            >
              <p className="text-sm text-white/80">Add your first client so you're ready to invoice once you need it.</p>

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
                  <input
                    value={clientForm.state ?? ''}
                    onChange={(event) => handleClientChange('state', event.target.value)}
                    placeholder="State"
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                  <input
                    value={clientForm.postalCode ?? ''}
                    onChange={(event) => handleClientChange('postalCode', event.target.value)}
                    placeholder="ZIP"
                    className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                  />
                </div>
                <input
                  value={clientForm.country ?? ''}
                  onChange={(event) => handleClientChange('country', event.target.value)}
                  placeholder="Country"
                  className="w-full rounded-2xl border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-white/60 focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
                />
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
                className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-purple-900 shadow-lg transition  hover:opacity-90 disabled:opacity-60"
              >
                {creatingClient ? 'Creating client...' : 'Create client'}
              </button>             

              {clientMessage && <p className="text-xs text-white/70">{clientMessage}</p>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
