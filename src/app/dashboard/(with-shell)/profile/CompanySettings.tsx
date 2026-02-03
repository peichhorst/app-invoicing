'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { normalizeStateValue } from '@/lib/states';
import { useRouter } from 'next/navigation';
import { Country, State, City } from 'country-state-city';
import { HexColorPicker } from 'react-colorful';
import { INDUSTRY_OPTIONS, OTHER_INDUSTRY_VALUE } from '@/constants/industry';
import { StripeWebhookManualWarning } from '@/components/StripeWebhookManualWarning';

type CountryModel = ReturnType<typeof Country.getAllCountries>[number];
type StateModel = ReturnType<typeof State.getStatesOfCountry>[number];
type CityModel = ReturnType<typeof City.getCitiesOfState>[number];

type CompanySettingsProps = {
  initialName?: string | null;
  initialWebsite?: string | null;
  initialLogoUrl?: string | null;
  initialPhone?: string | null;
  initialEmail?: string | null;
  initialUserName?: string | null;
  initialPositionName?: string | null;
  initialStripeAccountId?: string | null;
  initialStripePublishableKey?: string | null;
  initialVenmoHandle?: string | null;
  initialZelleHandle?: string | null;
  initialMailToAddressEnabled?: boolean | null;
  initialMailToAddressTo?: string | null;
  initialTrackdriveToken?: string | null;
  initialTrackdriveEnabled?: boolean | null;
  onboardingMode?: boolean;
  onSaveSuccess?: () => void;
  initialAddress?: {
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  };
  initialIconUrl?: string | null;
  initialSlogan?: string | null;
  initialIndustry?: string | null;
  role?: string | null;
  initialPrimaryColor?: string | null;
  initialUseHeaderLogo?: boolean | null;
  hidePersonalFields?: boolean;
  shouldShowManualStripeWebhookWarning?: boolean;
  initialStripeWebhookSecret?: string | null;
  stripeWebhookStatus?: 'verified' | 'pending' | 'error' | null;
  stripeWebhookLastError?: string | null;
};

type Option = { label: string; value: string };

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

const deriveIndustryStateFromLabel = (value?: string) => {
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

function SearchableSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  value: string;
  onChange: (val: string) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selected = options.find((o) => o.value === value);
  // Always expect value to be ISO code for country
  function getFlag(iso: string) {
    if (iso && iso.length === 2) {
      return iso.toUpperCase().replace(/./g, char => String.fromCodePoint(127397 + char.charCodeAt(0)));
    }
    return '';
  }
  const display = query || (selected ? `${getFlag(selected.value)} ${selected.label}` : '');
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={containerRef}>
      <input
        type="text"
        value={display}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onMouseDown={(e) => {
          // keep the dropdown open when clicking the input repeatedly
          e.preventDefault();
          setOpen(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full cursor-pointer caret-transparent rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 disabled:cursor-not-allowed disabled:bg-zinc-100"
      />
      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-zinc-200 bg-white shadow-lg">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-sm text-zinc-500">No results</div>
          ) : (
            filtered.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="flex w-full items-center px-3 py-2 text-left text-sm hover:bg-zinc-100 cursor-pointer"
                onClick={() => {
                  onChange(opt.value);
                  setQuery('');
                  setOpen(false);
                }}
              >
                {getFlag(opt.value)} {opt.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const extractDomainFromUrl = (value?: string | null) => {
  if (!value) return null;
  try {
    let normalized = value.trim();
    if (!normalized) return null;
    if (!/^https?:\/\//i.test(normalized)) {
      normalized = `https://${normalized}`;
    }
    const url = new URL(normalized);
    return url.hostname.replace(/^www\./i, '') || null;
  } catch {
    return null;
  }
};
  // (removed incomplete destructuring block)
export default function CompanySettings(props: CompanySettingsProps) {
  const {
    initialName,
    initialWebsite,
    initialLogoUrl,
    initialIconUrl,
    initialSlogan,
    initialPhone,
    initialEmail,
    initialUserName,
    initialPositionName,
    initialStripeAccountId,
    initialStripePublishableKey,
    initialVenmoHandle,
    initialZelleHandle,
    initialMailToAddressEnabled,
    initialMailToAddressTo,
    initialTrackdriveToken,
    initialTrackdriveEnabled,
    onboardingMode = false,
    onSaveSuccess,
    initialAddress,
    initialIndustry,
    role,
    initialPrimaryColor,
    initialUseHeaderLogo,
    hidePersonalFields = false,
    shouldShowManualStripeWebhookWarning = false,
    initialStripeWebhookSecret = null,
    stripeWebhookStatus = null,
    stripeWebhookLastError = null,
  } = props;

      const sanitizeInitialPrimary = (value?: string | null) => {
        const normalized = (value || '').toLowerCase();
        return normalized === '#6d28d9' ? '' : value || '';
      };
      const sanitizedInitialPrimary = sanitizeInitialPrimary(initialPrimaryColor);
      // Accent color state (DB/default only; no cross-user localStorage)
      const [accentColor, setAccentColor] = useState<string>(sanitizedInitialPrimary);
      const [useHeaderLogo, setUseHeaderLogo] = useState(Boolean(initialUseHeaderLogo));
      const userEditedAccentRef = useRef(false);
      const [showColorPicker, setShowColorPicker] = useState(false);
      const colorPickerRef = useRef<HTMLDivElement | null>(null);

      useEffect(() => {
        if (typeof window === 'undefined') return;

        const initialPrimary = sanitizeInitialPrimary(props.initialPrimaryColor);
        const colorVars = [50,100,200,300,400,500,600,700,800,900,950];
        const overrideShades = [500, 600, 700];

        // If user cleared the color, immediately apply default palette
        if (accentColor === '') {
          colorVars.forEach((shade) => {
            document.documentElement.style.setProperty(`--color-brand-accent-${shade}`, defaultPalette[shade]);
            document.documentElement.style.setProperty(`--color-brand-primary-${shade}`, defaultPalette[shade]);
          });
          const contrast = computeContrast(defaultPalette[500]);
          document.documentElement.style.setProperty('--color-brand-contrast', contrast);
          window.dispatchEvent(new CustomEvent('accent-color-updated', { detail: defaultPalette[500] }));
          return;
        }

        const colorToApply = accentColor || initialPrimary;
        if (!colorToApply) return;

        colorVars.forEach((shade) => {
          const base = defaultPalette[shade];
          const value = overrideShades.includes(shade) ? colorToApply : base;
          document.documentElement.style.setProperty(`--color-brand-accent-${shade}`, value);
          document.documentElement.style.setProperty(`--color-brand-primary-${shade}`, value);
        });

        const contrast = computeContrast(colorToApply);
        document.documentElement.style.setProperty('--color-brand-contrast', contrast);
        window.dispatchEvent(new CustomEvent('accent-color-updated', { detail: colorToApply }));
      }, [accentColor, props.initialPrimaryColor, props.role]);

      useEffect(() => {
        if (!showColorPicker) return;
        const handleOutside = (event: MouseEvent) => {
          if (!colorPickerRef.current) return;
          if (!colorPickerRef.current.contains(event.target as Node)) {
            setShowColorPicker(false);
          }
        };
        document.addEventListener('mousedown', handleOutside);
        return () => document.removeEventListener('mousedown', handleOutside);
      }, [showColorPicker]);

      const handleHeaderLogoToggle = (value: boolean) => {
        setUseHeaderLogo(value);
      };

      const defaultPalette: Record<number, string> = {
        50: '#eff6ff',
        100: 'transparent',
        200: '#bfdbfe',
        300: '#93c5fd',
        400: '#60a5fa',
        500: '#1d4ed8',
        600: '#2563eb',
        700: '#1d4ed8',
        800: '#1e40af',
        900: '#1e3a8a',
        950: '#172554',
      };

      const computeContrast = (hex?: string | null) => {
        if (!hex) return '#0f172a';
        const cleaned = hex.replace('#', '');
        if (cleaned.length !== 6) return '#0f172a';
        const r = parseInt(cleaned.slice(0, 2), 16) / 255;
        const g = parseInt(cleaned.slice(2, 4), 16) / 255;
        const b = parseInt(cleaned.slice(4, 6), 16) / 255;
        const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
        const [R, G, B] = [r, g, b].map(toLinear);
        const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;
        return luminance > 0.5 ? '#0f172a' : '#ffffff';
      };

      // After save, update all accent and primary color variables for global design
      const updateAllAccentColors = (color: string | Record<number, string>) => {
        if (typeof window !== 'undefined') {
          const colorVars = [50,100,200,300,400,500,600,700,800,900,950];
          const overrideShades = [500, 600, 700];
          const isEmptyString = typeof color === 'string' && !color.trim();
          const palette = isEmptyString || !color ? defaultPalette : color;
          const baseColor = typeof palette === 'string' ? palette : palette[500] ?? defaultPalette[500];
          const contrast = computeContrast(baseColor);
          const logoText = contrast === '#ffffff' ? baseColor : contrast;
          colorVars.forEach(shade => {
            const base = typeof palette === 'string' ? defaultPalette[shade] : palette[shade] ?? defaultPalette[shade];
            const value = typeof palette === 'string' && overrideShades.includes(shade) ? palette : base;
            document.documentElement.style.setProperty(`--color-brand-accent-${shade}`, value);
            document.documentElement.style.setProperty(`--color-brand-primary-${shade}`, value);
          });
          document.documentElement.style.setProperty('--color-brand-contrast', contrast);
          document.documentElement.style.setProperty('--color-brand-logo-text', logoText);
        }
      };

      const resetPrimaryColor = () => {
        userEditedAccentRef.current = false;
        setAccentColor('');
        setShowColorPicker(false);
        updateAllAccentColors(defaultPalette);
        window.dispatchEvent(new CustomEvent('accent-color-updated', { detail: defaultPalette[500] }));
      };
  const router = useRouter();
  const effectiveInitialName = onboardingMode ? '' : initialName ?? '';
  const effectiveInitialEmail = initialEmail ?? '';
  const effectiveInitialAddress = onboardingMode
    ? {
        addressLine1: '',
        addressLine2: '',
        city: '',
        state: '',
        postalCode: '',
        country: '',
      }
    : initialAddress ?? {};

  const normalizedInitialAddress = {
    addressLine1: effectiveInitialAddress.addressLine1?.trim() ?? '',
    addressLine2: effectiveInitialAddress.addressLine2?.trim() ?? '',
    city: effectiveInitialAddress.city?.trim() ?? '',
    state: effectiveInitialAddress.state?.trim() ?? '',
    postalCode: effectiveInitialAddress.postalCode?.trim() ?? '',
    country: effectiveInitialAddress.country?.trim() ?? 'USA',
  };
  const normalizedUserName = initialUserName?.trim() ?? '';
  const normalizedPositionName = initialPositionName?.trim() || 'Owner';
  const normalizedInitialLogo = initialLogoUrl?.trim() ?? '';
  const normalizedInitialIcon = initialIconUrl?.trim() ?? '';
  const normalizedInitialSlogan = initialSlogan?.trim() ?? '';
  const normalizedInitialPhone = initialPhone?.trim() ?? '';
  const normalizedInitialEmail = effectiveInitialEmail?.trim() ?? '';
  const normalizedStripeAccountId = initialStripeAccountId?.trim() ?? '';
  const normalizedStripePublishableKey = initialStripePublishableKey?.trim() ?? '';
  const normalizedVenmoHandle = initialVenmoHandle?.trim() ?? '';
  const normalizedZelleHandle = initialZelleHandle?.trim() ?? '';
  const normalizedMailTo = initialMailToAddressTo?.trim() ?? '';
  const defaultMailToEnabled = initialMailToAddressEnabled ?? !normalizedMailTo;
  const normalizedTrackdriveToken = initialTrackdriveToken?.trim() ?? '';
  const normalizedTrackdriveEnabled = Boolean(initialTrackdriveEnabled);
  const normalizedInitialIndustry = initialIndustry?.trim() ?? '';
  const initialIndustryState = deriveIndustryStateFromLabel(normalizedInitialIndustry);
  const initialIndustrySelection = initialIndustryState.selection;
  const initialIndustryCustom = initialIndustryState.custom;
  const [autoIconDomain, setAutoIconDomain] = useState<string | null>(null);
  const [autoLogoDomain, setAutoLogoDomain] = useState<string | null>(null);

  const [companyInput, setCompanyInput] = useState(effectiveInitialName);
  const [websiteInput, setWebsiteInput] = useState(initialWebsite ?? '');
  const [companyPhone, setCompanyPhone] = useState(normalizedInitialPhone);
  const [companyEmail, setCompanyEmail] = useState(normalizedInitialEmail);
  const [companyLogoUrl, setCompanyLogoUrl] = useState(normalizedInitialLogo);
  const [companyIconUrl, setCompanyIconUrl] = useState(normalizedInitialIcon);
  const [companySlogan, setCompanySlogan] = useState(normalizedInitialSlogan);
  const [industrySelection, setIndustrySelection] = useState(initialIndustrySelection);
  const [industryCustom, setIndustryCustom] = useState(initialIndustryCustom);
  const [iconError, setIconError] = useState<string | null>(null);
  const [uploadingIcon, setUploadingIcon] = useState(false);
  const [logoError, setLogoError] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [addressLine1, setAddressLine1] = useState(normalizedInitialAddress.addressLine1);
  const [addressLine2, setAddressLine2] = useState(normalizedInitialAddress.addressLine2);
  const [city, setCity] = useState(normalizedInitialAddress.city);
  const [stateValue, setStateValue] = useState(normalizedInitialAddress.state);
  const [postalCode, setPostalCode] = useState(normalizedInitialAddress.postalCode);
  const [country, setCountry] = useState(normalizedInitialAddress.country);
  const [useCustomStripe, setUseCustomStripe] = useState(Boolean(normalizedStripeAccountId || normalizedStripePublishableKey));
  const [stripeAccountIdValue, setStripeAccountIdValue] = useState(normalizedStripeAccountId);
  const [stripePublishableKeyValue, setStripePublishableKeyValue] = useState(normalizedStripePublishableKey);
  const [showStripeManualInstructions, setShowStripeManualInstructions] = useState(false);
  const showManualWebhookWarning =
    useCustomStripe &&
    Boolean(
      stripeAccountIdValue && stripePublishableKeyValue && shouldShowManualStripeWebhookWarning,
    );
  const webhookStatusInfo = useMemo(() => {
    switch (stripeWebhookStatus) {
      case 'verified':
        return { text: 'Verified (platform-managed)', color: 'text-emerald-600' };
      case 'pending':
        return { text: 'Pending (manual webhook setup required)', color: 'text-amber-600' };
      case 'error':
        return {
          text: stripeWebhookLastError ? `Error: ${stripeWebhookLastError}` : 'Webhook error',
          color: 'text-rose-600',
        };
      default:
        return { text: 'Status unknown', color: 'text-zinc-500' };
    }
  }, [stripeWebhookStatus, stripeWebhookLastError]);
  const [stripeWebhookSecretValue, setStripeWebhookSecretValue] = useState(initialStripeWebhookSecret ?? '');
  const [useVenmo, setUseVenmo] = useState(Boolean(normalizedVenmoHandle));
  const [useZelle, setUseZelle] = useState(Boolean(normalizedZelleHandle));
  const [venmoHandleValue, setVenmoHandleValue] = useState(normalizedVenmoHandle);
  const [zelleHandleValue, setZelleHandleValue] = useState(normalizedZelleHandle);
  const [autocompleteInput, setAutocompleteInput] = useState('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const domain = extractDomainFromUrl(websiteInput);
    if (!domain) {
      setAutoIconDomain(null);
      return;
    }
    if (!autoIconDomain && companyIconUrl.trim()) {
      return;
    }
    if (autoIconDomain === domain && companyIconUrl.trim()) {
      return;
    }
    const faviconUrl = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
    setCompanyIconUrl(faviconUrl);
    setAutoIconDomain(domain);
  }, [websiteInput, companyIconUrl, autoIconDomain]);

  useEffect(() => {
    const domain = extractDomainFromUrl(websiteInput);
    if (!domain) {
      setAutoLogoDomain(null);
      return;
    }
    if (!autoLogoDomain && companyLogoUrl.trim()) {
      return;
    }
    if (autoLogoDomain === domain && companyLogoUrl.trim()) {
      return;
    }
    if (companyLogoUrl.trim() && autoLogoDomain === null) {
      return;
    }
    let active = true;
    const controller = new AbortController();

    const fetchLogo = async () => {
      try {
        const params = new URLSearchParams({
          domain,
          size: '256',
          fallback: 'true',
          transparent: 'true',
        });
        const response = await fetch(`/api/ritekit-logo?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          return;
        }
        const data = await response.json();
        const fetchedLogo = data.square || data.original || data.svg;
        if (fetchedLogo && active) {
          setCompanyLogoUrl(fetchedLogo);
          setAutoLogoDomain(domain);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        console.error('Failed to fetch RiteKit logo', error);
      }
    };

    void fetchLogo();

    return () => {
      active = false;
      controller.abort();
    };
  }, [websiteInput, companyLogoUrl, autoLogoDomain]);
  
  const venmoLink = useMemo(() => {
    if (!useVenmo || !venmoHandleValue.trim()) return undefined;
    const normalized = venmoHandleValue.trim().replace(/^@/, '');
    const encodedNote = encodeURIComponent('Invoice payment');
    return `https://venmo.com/u/${normalized}?txn=pay&note=${encodedNote}`;
  }, [useVenmo, venmoHandleValue]);
  
  const venmoQrUrl = useMemo(() => {
    if (!venmoLink) return undefined;
    const encodedQrLink = encodeURIComponent(venmoLink);
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodedQrLink}`;
  }, [venmoLink]);
  const [mailToAddressEnabled, setMailToAddressEnabled] = useState(defaultMailToEnabled);
  const [payableOption, setPayableOption] = useState<'same' | 'custom'>(
    normalizedMailTo && normalizedMailTo === (initialName ?? '') ? 'same' : normalizedMailTo ? 'custom' : 'same',
  );
  const [customPayableValue, setCustomPayableValue] = useState(normalizedMailTo);
  const [leadTokenValue, setLeadTokenValue] = useState(normalizedTrackdriveToken);
  const [leadTokenEnabled, setLeadTokenEnabled] = useState(normalizedTrackdriveEnabled);
  const [stripeMessage, setStripeMessage] = useState<string | null>(null);
  const [stripeErrorLink, setStripeErrorLink] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [googleMapsLoaded, setGoogleMapsLoaded] = useState(false);

  useEffect(() => {
    setUseHeaderLogo(Boolean(initialUseHeaderLogo));
  }, [initialUseHeaderLogo]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const enabled = Boolean(useHeaderLogo);
    const currentLogo = enabled ? (companyLogoUrl?.trim() || normalizedInitialLogo) : '';
    window.dispatchEvent(new CustomEvent('company-logo-toggle', { detail: enabled }));
    window.dispatchEvent(new CustomEvent('company-logo-uploaded', { detail: currentLogo || '' }));
  }, [useHeaderLogo, companyLogoUrl, normalizedInitialLogo]);

  useEffect(() => {
    setCompanyIconUrl(normalizedInitialIcon);
  }, [normalizedInitialIcon]);

  useEffect(() => {
    setIndustrySelection(initialIndustrySelection);
    setIndustryCustom(initialIndustryCustom);
  }, [initialIndustrySelection, initialIndustryCustom]);

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [personalName, setPersonalName] = useState(normalizedUserName);
  const [positionName, setPositionName] = useState(normalizedPositionName);
  const showPersonalFields = onboardingMode && !hidePersonalFields;

  const roleLabel = (role ?? 'USER').toUpperCase();
  const isOwner = roleLabel === 'OWNER';
  const isAdmin = roleLabel === 'ADMIN';
  const hasCompanyAccess = isOwner || isAdmin;

  const normalizedInitialName = effectiveInitialName?.trim() ?? '';
  const normalizedWebsite = initialWebsite?.trim() ?? '';
  const nameDirty = companyInput.trim().length > 0 && companyInput.trim() !== normalizedInitialName;
  const websiteDirty = websiteInput.trim() !== normalizedWebsite;
  const personalNameDirty = showPersonalFields && personalName.trim() !== normalizedUserName;
  const positionDirty = showPersonalFields && positionName.trim() !== normalizedPositionName;
  const phoneDirty = companyPhone.trim() !== normalizedInitialPhone;
  const emailDirty = companyEmail.trim() !== normalizedInitialEmail;
  const addressDirty =
    addressLine1.trim() !== normalizedInitialAddress.addressLine1 ||
    addressLine2.trim() !== normalizedInitialAddress.addressLine2 ||
    city.trim() !== normalizedInitialAddress.city ||
    stateValue.trim() !== normalizedInitialAddress.state ||
    postalCode.trim() !== normalizedInitialAddress.postalCode ||
    country.trim() !== normalizedInitialAddress.country;
  const logoDirty = companyLogoUrl.trim() !== normalizedInitialLogo;
  const accentDirty = accentColor !== sanitizedInitialPrimary;
  const stripeDirty =
    stripeAccountIdValue.trim() !== normalizedStripeAccountId ||
    stripePublishableKeyValue.trim() !== normalizedStripePublishableKey ||
    useCustomStripe !== Boolean(normalizedStripeAccountId || normalizedStripePublishableKey);
  const venmoDirty = venmoHandleValue.trim() !== normalizedVenmoHandle || useVenmo !== Boolean(normalizedVenmoHandle);
  const zelleDirty = zelleHandleValue.trim() !== normalizedZelleHandle || useZelle !== Boolean(normalizedZelleHandle);
  const mailToDirty =
    mailToAddressEnabled !== defaultMailToEnabled ||
    (mailToAddressEnabled &&
      (payableOption === 'same'
        ? (companyInput.trim() || normalizedInitialName) !== normalizedMailTo
        : customPayableValue.trim() !== normalizedMailTo));
  const leadDirty =
    leadTokenEnabled !== normalizedTrackdriveEnabled || leadTokenValue.trim() !== normalizedTrackdriveToken;
  const iconDirty = companyIconUrl.trim() !== normalizedInitialIcon;
  const sloganDirty = companySlogan.trim() !== normalizedInitialSlogan;
  const computedIndustryValue = useMemo(() => {
    if (!industrySelection) return '';
    return industrySelection === OTHER_INDUSTRY_VALUE ? industryCustom.trim() : industrySelection;
  }, [industrySelection, industryCustom]);
  const industryDirty = computedIndustryValue !== normalizedInitialIndustry;

  const canSubmit = Boolean(
    nameDirty ||
      websiteDirty ||
      phoneDirty ||
      emailDirty ||
      industryDirty ||
      iconDirty ||
      sloganDirty ||
      addressDirty ||
      logoDirty ||
      accentDirty ||
      stripeDirty ||
      venmoDirty ||
      zelleDirty ||
      mailToDirty ||
      leadDirty ||
      personalNameDirty ||
      positionDirty,
  );
  // Only disable button if not hydrated or pending
  const disabled = !hydrated || isPending;
  const buttonLabel = isPending ? 'Saving...' : (onboardingMode ? 'Save & Continue' : 'Save Changes');
  const description = onboardingMode
    ? 'Fill in these details so your workspace can start sending invoices.'
    : 'Update the business identity that appears on invoices and documents.';
  const companyLabel = useMemo(
    () => companyInput.trim() || normalizedInitialName || 'Your Company',
    [companyInput, normalizedInitialName],
  );
  const computedMailToValue = useMemo(() => {
    if (!mailToAddressEnabled) return '';
    if (payableOption === 'same') return companyLabel;
    return customPayableValue.trim() || companyLabel;
  }, [mailToAddressEnabled, payableOption, customPayableValue, companyLabel]);


  const uploadImage = async (file: File) => {
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
    return data.secureUrl as string;
  };

  const handleLogoChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setLogoError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setLogoError('Only image files are allowed.');
      return;
    }
    setUploadingLogo(true);
    try {
      const secureUrl = await uploadImage(file);
      setCompanyLogoUrl(secureUrl);
      setAutoLogoDomain(null);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('company-logo-uploaded', { detail: secureUrl }));
        if (useHeaderLogo) {
          window.dispatchEvent(new CustomEvent('company-logo-toggle', { detail: true }));
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      setLogoError(message);
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleIconChange = async (event: ChangeEvent<HTMLInputElement>) => {
    setIconError(null);
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setIconError('Only image files are allowed.');
      return;
    }
    setUploadingIcon(true);
    try {
      const secureUrl = await uploadImage(file);
      setCompanyIconUrl(secureUrl);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed.';
      setIconError(message);
    } finally {
      setUploadingIcon(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = companyInput.trim();
    const trimmedWebsite = websiteInput.trim();
    startTransition(async () => {
      setError(null);
      setMessage(null);

      try {
          const payload: Record<string, unknown> = {
            name: trimmed,
            websiteUrl: websiteInput.trim() || null,
            phone: companyPhone.trim() || null,
            email: companyEmail.trim() || null,
            userName: showPersonalFields ? personalName.trim() || null : undefined,
            userPositionName: showPersonalFields ? positionName.trim() || 'Owner' : undefined,
            logoUrl: companyLogoUrl.trim() || null,
            iconUrl: companyIconUrl.trim() || null,
            slogan: companySlogan.trim() || null,
            addressLine1: addressLine1.trim() || null,
            addressLine2: addressLine2.trim() || null,
            city: city.trim() || null,
            state: normalizeStateValue(stateValue.trim() || undefined) ?? null,
            postalCode: postalCode.trim() || null,
            country: country.trim() || null,
            stripeAccountId: useCustomStripe ? stripeAccountIdValue.trim() || null : null,
            stripePublishableKey: useCustomStripe ? stripePublishableKeyValue.trim() || null : null,
            venmoHandle: useVenmo ? venmoHandleValue.trim() || null : null,
            zelleHandle: useZelle ? zelleHandleValue.trim() || null : null,
            mailToAddressEnabled,
            mailToAddressTo: mailToAddressEnabled ? computedMailToValue : null,
            trackdriveLeadToken: leadTokenEnabled ? leadTokenValue.trim() || null : null,
            trackdriveLeadEnabled: leadTokenEnabled,
            primaryColor: accentColor || null,
            industry: computedIndustryValue || null,
            useHeaderLogo,
            ...(showManualWebhookWarning ? { stripeWebhookSecret: stripeWebhookSecretValue.trim() || null } : {}),
        };
        if (onboardingMode) {
          payload.completeOnboarding = true;
        }
        const res = await fetch('/api/company', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          cache: 'no-store',
          body: JSON.stringify(payload),
        });
        const bodyText = await res.text();
        let responsePayload: { error?: string; details?: any } | null = null;
        if (bodyText) {
          try {
            responsePayload = JSON.parse(bodyText);
          } catch {
            responsePayload = null;
          }
        }
        if (!res.ok) {
          let errorMsg = typeof responsePayload?.error === 'string' ? responsePayload.error : 'Unable to update company information.';
          if (responsePayload?.details) {
            errorMsg += '\nDetails: ' + (typeof responsePayload.details === 'object' ? JSON.stringify(responsePayload.details, null, 2) : String(responsePayload.details));
          }
          setError(errorMsg);
          setMessage(null);
          return;
        }
        setCompanyInput(trimmed);
        setMessage('Settings saved.');
        setError(null);
        // After save, update all accent color variables for global design (fallback to defaults when cleared)
        updateAllAccentColors(accentColor || defaultPalette);
        // After save, redirect to dashboard (non-onboarding) or trigger onboarding callback
        if (onboardingMode && onSaveSuccess) {
          // In onboarding mode, call the success callback to move to next step
          onSaveSuccess();
        } else {
          window.location.href = '/dashboard';
        }
      } catch (err) {
        const reason = err instanceof Error ? err.message : 'Request failed.';
        setError(reason);
        setMessage(null);
      }
    });
  };

 

  const paymentDisabled = !(isOwner || isAdmin);
  const paymentLabelClass = paymentDisabled
    ? 'flex items-center gap-2 text-sm font-semibold text-zinc-500'
    : 'flex items-center gap-2 text-sm font-semibold text-zinc-800';
  const inputClass =
    'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-500 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10';
  const disabledInputClass = `${inputClass} bg-zinc-100 text-zinc-500 placeholder:text-zinc-400 cursor-not-allowed`;

  const countryOptions = useMemo<CountryModel[]>(() => {
    const all: CountryModel[] = Country.getAllCountries();
    const us = all.find((c) => c.isoCode === 'US');
    const rest = all.filter((c) => c.isoCode !== 'US');
    return us ? [us, ...rest] : all;
  }, []);
  const selectedCountry = useMemo(
    () => countryOptions.find((c) => c.name === country || c.isoCode === country),
    [country, countryOptions],
  );
  const stateOptions = useMemo<StateModel[]>(
    () => (selectedCountry ? State.getStatesOfCountry(selectedCountry.isoCode) : []),
    [selectedCountry],
  );
  const stateMatch = useMemo(
    () => stateOptions.find((s) => s.name === stateValue || s.isoCode === stateValue),
    [stateOptions, stateValue],
  );
  const stateIso = stateMatch?.isoCode;
  const cityOptions = useMemo<CityModel[]>(
    () => (selectedCountry && stateIso ? City.getCitiesOfState(selectedCountry.isoCode, stateIso) : []),
    [selectedCountry, stateIso],
  );
  const showStateField = onboardingMode ? Boolean(country) : true;
  const showCityAndAddress = onboardingMode ? Boolean(stateIso) : true;
  const addressQuery = useMemo(() => {
    // Show map as soon as street + city are entered (don't wait for all fields)
    const hasMinimumAddress = Boolean(addressLine1?.trim() && city?.trim());
    if (!hasMinimumAddress) return '';
    
    const parts = [addressLine1, city, stateValue, postalCode, country].map((p) => p?.trim()).filter(Boolean);
    return parts.join(', ');
  }, [addressLine1, city, stateValue, postalCode, country]);
  const [mapMode, setMapMode] = useState<'roadmap' | 'satellite'>('roadmap');
  const STRIPE_LOSS_DOC = 'https://dashboard.stripe.com/settings/connect/platform-profile';

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

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Load Google Maps JavaScript API with Places library
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.google?.maps?.places) {
      setGoogleMapsLoaded(true);
      return;
    }
    
    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existingScript) {
      // Wait for it to load
      if (window.google?.maps) {
        setGoogleMapsLoaded(true);
      } else {
        existingScript.addEventListener('load', () => setGoogleMapsLoaded(true));
      }
      return;
    }
    
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      console.warn('Google Maps API key not found');
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google Maps API loaded successfully');
      setGoogleMapsLoaded(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Maps API');
    };
    document.head.appendChild(script);

    // Don't remove the script on unmount - keep it for other instances
  }, []);

  useEffect(() => {
    if (!autocompleteInputRef.current || typeof window === 'undefined' || !googleMapsLoaded) return;
    const googleMaps = window.google?.maps;
    if (!googleMaps?.places) return;

    const autocomplete = new googleMaps.places.Autocomplete(autocompleteInputRef.current, {
      types: ['address'],
      fields: ['address_components', 'formatted_address', 'geometry'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.address_components) return;

      let street = '';
      let city = '';
      let state = '';
      let zip = '';
      let country = '';

      for (const component of place.address_components) {
        const types = component.types;
        if (types.includes('street_number')) {
          street = component.long_name + ' ';
        }
        if (types.includes('route')) {
          street += component.long_name;
        }
        if (types.includes('locality')) {
          city = component.long_name;
        }
        if (types.includes('administrative_area_level_1')) {
          state = component.long_name;
        }
        if (types.includes('postal_code')) {
          zip = component.long_name;
        }
        if (types.includes('country')) {
          country = component.long_name;
        }
      }

      setAddressLine1(street.trim());
      setCity(city);
      setStateValue(state);
      setPostalCode(zip);
      setCountry(country);
      setAutocompleteInput('');
    });

    console.log('Google Places Autocomplete initialized');
  }, [googleMapsLoaded]);

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }

    setLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const googleMaps = window.google?.maps;
          if (!googleMaps) {
            alert('Google Maps API not loaded yet. Please try again.');
            setLoadingLocation(false);
            return;
          }
          const geocoder = new googleMaps.Geocoder();
          geocoder.geocode({ location: { lat: latitude, lng: longitude } }, (results: any, status: any) => {
            if (status === 'OK' && results && results[0]) {
              const place = results[0];
              let street = '';
              let city = '';
              let state = '';
              let zip = '';
              let country = '';

              for (const component of place.address_components) {
                const types = component.types;
                if (types.includes('street_number')) {
                  street = component.long_name + ' ';
                }
                if (types.includes('route')) {
                  street += component.long_name;
                }
                if (types.includes('locality')) {
                  city = component.long_name;
                }
                if (types.includes('administrative_area_level_1')) {
                  state = component.long_name;
                }
                if (types.includes('postal_code')) {
                  zip = component.long_name;
                }
                if (types.includes('country')) {
                  country = component.long_name;
                }
              }

              setAddressLine1(street.trim());
              setCity(city);
              setStateValue(state);
              setPostalCode(zip);
              setCountry(country);
            }
            setLoadingLocation(false);
          });
        } catch (error) {
          console.error('Geocoding error:', error);
          setLoadingLocation(false);
        }
      },
      (error) => {
        let errorMessage = 'Unable to retrieve your location';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = 'Location access denied. Please enable location permissions in your browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage = 'Location request timed out.';
            break;
          default:
            errorMessage = `Location error: ${error.message || 'Unknown error'}`;
        }
        
        console.error('Geolocation error:', errorMessage, error);
        alert(errorMessage);
        setLoadingLocation(false);
      }
    );
  };

  const resetStripeFields = () => {
    setStripeAccountIdValue('');
    setStripePublishableKeyValue('');
    setUseCustomStripe(false);
    setStripeMessage('Stripe disconnected. Save to keep the change.');
    setStripeErrorLink(null);
  };

  const toLocalUrl = (value: string) => {
    return value;
  };

  const requestStripeLink = async (
    endpoint: '/api/payments/account-link' | '/api/payments/dashboard-link',
    mode: 'express' | 'standard' = 'express',
  ) => {
    setStripeMessage('Opening Stripe...');
    setStripeErrorLink(null);
    try {
      let returnUrl: string | undefined;
      if (onboardingMode) {
        let params = '';
        if (typeof window !== 'undefined') {
          const searchParams = new URLSearchParams(window.location.search);
          searchParams.set('step', '2');
          params = searchParams.toString();
        }
        returnUrl = `/dashboard/onboarding${params ? `?${params}` : ''}`;
      } else {
        returnUrl = '/dashboard/settings?tab=business';
      }
      const payload: Record<string, string> = {};
      if (endpoint === '/api/payments/account-link') {
        payload.mode = mode;
      }
      if (returnUrl) {
        payload.returnUrl = returnUrl;
      }
      const body = Object.keys(payload).length ? JSON.stringify(payload) : undefined;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body,
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      const url = toLocalUrl(data?.url as string | undefined ?? '');
      if (url) {
        window.location.assign(url);
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

  const handleStripeLink = (
    endpoint: '/api/payments/account-link' | '/api/payments/dashboard-link',
    mode: 'express' | 'standard' = 'express',
  ) => {
    if (paymentDisabled) return;
    void requestStripeLink(endpoint, mode);
  };





  return (
 <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white/70 p-6 mb-2 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Business Details</p>
        </div>

      <form onSubmit={handleSubmit} className="space-y-4 company-settings-form">
        <section className="space-y-4 rounded-2xl  bg-white/70 p-0">
          {showPersonalFields ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-zinc-700">Your Name</label>
                <input
                  name="Name"
                  value={personalName}
                  onChange={(event) => setPersonalName(event.target.value)}
                  placeholder="Jane Smith"
                  className={inputClass}
                />
                <p className="text-xs text-zinc-500">We&apos;ll set this as your profile name for invoices and emails.</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-zinc-700">Business Name</label>
                <input
                  name="Company"
                  value={companyInput}
                  onChange={(event) => {
                    setCompanyInput(event.target.value);
                    if (error) setError(null);
                  }}
                  className={inputClass}
                />
                <p className="text-xs text-zinc-500">This name will show up on invoices, documents, and your workspace.</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-sm font-semibold text-zinc-700">Business Name</label>
                <input
                  name="Company"
                  value={companyInput}
                  onChange={(event) => {
                    setCompanyInput(event.target.value);
                    if (error) setError(null);
                  }}
                  className={inputClass}
                />
                <p className="text-xs text-zinc-500">This name will show up on invoices, documents, and your workspace.</p>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-semibold text-zinc-700">Business Email</label>
                <input
                  name="email"
                  value={companyEmail}
                  onChange={(event) => setCompanyEmail(event.target.value)}
                  placeholder="billing@company.com"
                  className={inputClass}
                />
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-zinc-700">Business Phone</label>
              <input
                name="busPhone"
                value={companyPhone}
                onChange={(event) => setCompanyPhone(event.target.value)}
                placeholder="(555) 555-5555"
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-zinc-700">Website URL</label>
              <input
                name="website"
                value={websiteInput}
                onChange={(event) => {
                  setWebsiteInput(event.target.value);
                }}
                placeholder="https://example.com"
                className={inputClass}
              />
              <p className="text-xs text-zinc-500">Add your website.</p>
            </div>
          </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-zinc-700">Industry</label>
          <select
            value={industrySelection}
            onChange={(event) => {
              const nextValue = event.target.value;
              setIndustrySelection(nextValue);
              if (nextValue !== OTHER_INDUSTRY_VALUE) {
                setIndustryCustom('');
              }
            }}
            className={inputClass}
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
              className={inputClass}
            />
          )}
          <p className="text-xs text-zinc-500">
            Choose the option that best describes your primary services. Use Other if nothing here fits.
          </p>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-zinc-700">Slogan / tagline</label>
          <input
            value={companySlogan}
            onChange={(event) => setCompanySlogan(event.target.value)}
            placeholder="A short line that summarizes your business"
            className={inputClass}
          />
          <p className="text-xs text-zinc-500">Optional line that can appear on invoices and client-facing docs.</p>
        </div>

          {!hidePersonalFields && (
            <div className="space-y-1">
              <label className="text-sm font-semibold text-zinc-700">Your Position</label>
              <input
                name="Position"
                list="position-suggestions"
                value={positionName}
                onChange={(event) => setPositionName(event.target.value || 'Owner')}
                placeholder="Owner"
                className={inputClass}
              />
              <datalist id="position-suggestions">
                <option>Owner</option>
                <option>CEO</option>
                <option>Founder</option>
                <option>Managing Director</option>
              </datalist>
              <p className="text-xs text-zinc-500">Default is Owner. Change it if you prefer a different title.</p>
            </div>
          )}
          
          <div className="space-y-3">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <label className="text-sm font-semibold text-zinc-700">Business Logo</label>
                <div className="flex items-center gap-4 mt-1">
                  <div className="relative h-20 w-20 rounded-xl border border-zinc-300 bg-white shadow-sm">
                    {companyLogoUrl ? (
                      <>
                        <img src={companyLogoUrl} alt="company logo" className="h-full w-full object-contain rounded-xl" />
                        <button
                          type="button"
                          onClick={() => {
                            setCompanyLogoUrl('');
                            setAutoLogoDomain(null);
                            handleHeaderLogoToggle(false);
                            // Clear the stored logo URL in AppHeader
                            if (typeof window !== 'undefined') {
                              window.dispatchEvent(new CustomEvent('company-logo-uploaded', { detail: '' }));
                            }
                          }}
                          className="absolute -top-1.5 -right-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary-600 text-white shadow-md hover:bg-brand-primary-700 transition-colors"
                          title="Remove logo"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">No logo</div>
                    )}
                  </div>
                  <label className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 cursor-pointer">
                    Upload logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingLogo}
                      onChange={handleLogoChange}
                    />
                  </label>
                </div>
                {uploadingLogo && <p className="text-xs text-zinc-500">Uploading logo...</p>}
                {logoError && <p className="text-xs text-rose-500">{logoError}</p>}
              </div>

              <div>
                <label className="text-sm font-semibold text-zinc-700">Business Icon</label>
                <div className="flex items-center gap-4 mt-1">
                  <div className="relative h-16 w-16 rounded-2xl border border-zinc-300 bg-white shadow-sm">
                    {companyIconUrl ? (
                      <>
                        <img src={companyIconUrl} alt="company icon" className="h-full w-full object-contain rounded-2xl" />
                        <button
                          type="button"
                          onClick={() => {
                            setCompanyIconUrl('');
                            setAutoIconDomain(null);
                          }}
                          className="absolute -top-1 -right-1 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-brand-primary-600 text-white shadow-md hover:bg-brand-primary-700 transition-colors"
                          title="Remove icon"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </>
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">No icon</div>
                    )}
                  </div>
                  <label className="inline-flex items-center justify-center rounded-full border border-zinc-300 px-4 py-2 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400 cursor-pointer">
                    Upload icon
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingIcon}
                      onChange={handleIconChange}
                    />
                  </label>
                </div>
                {uploadingIcon && <p className="text-xs text-zinc-500">Uploading icon...</p>}
                {iconError && <p className="text-xs text-rose-500">{iconError}</p>}
                <p className="text-xs text-zinc-500">Use a compact square icon for compact placements.</p>
              </div>

              <div>
                {/* Primary Brand Color Picker */}
                <label className="text-sm font-semibold text-zinc-700">Primary Brand / Theme Color</label>
                <div className="flex items-center gap-3 mt-1">
                  <div className="relative inline-flex">
                    <button
                      type="button"
                      onClick={() => setShowColorPicker((prev) => !prev)}
                      className="h-8 w-8 rounded-full border border-zinc-300 shadow-sm transition hover:border-zinc-400"
                      style={{ backgroundColor: accentColor || 'transparent' }}
                      aria-label="Pick primary brand color"
                    />
                    {(accentColor || '').length > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          resetPrimaryColor();
                        }}
                        className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-white text-[10px] font-bold text-zinc-600 shadow-md ring-1 ring-zinc-300 hover:bg-zinc-100"
                        title="Reset color"
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <span className="text-xs text-zinc-500">{accentColor || 'Not set'}</span>
                </div>
                {showColorPicker && (
                  <div
                    ref={colorPickerRef}
                    className="absolute z-50 mt-3 rounded-2xl border border-zinc-200 bg-white p-3 shadow-2xl"
                  >
                    <HexColorPicker
                      color={accentColor || '#1d4ed8'}
                      onChange={(c) => {
                        userEditedAccentRef.current = true;
                        setAccentColor(c);
                        updateAllAccentColors(c);
                      }}
                    />
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => {
                          userEditedAccentRef.current = true;
                          const next = e.target.value;
                          setAccentColor(next);
                          updateAllAccentColors(next);
                        }}
                        className="w-28 rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-800 shadow-sm focus:border-brand-primary-400 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
                        aria-label="Hex color"
                      />
                      <button
                        type="button"
                        onClick={() => setShowColorPicker(false)}
                        className="ml-auto rounded-full border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
                <p className="text-xs text-zinc-500 mt-1">This color is used for highlights and accent UI elements.</p>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-sm font-semibold text-zinc-700">Use company logo in header</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="use-header-logo"
                  type="checkbox"
                  checked={useHeaderLogo}
                  onChange={(e) => handleHeaderLogoToggle(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
                />
                <p className="text-xs text-zinc-500">
                  Temporarily available while we tune the feature—toggle it to show the company logo in the app header.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-zinc-700">Business Address</label>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.5fr)_minmax(240px,1.5fr)]">
              <div className="space-y-2">
                {/* Google Places Autocomplete Input */}
                <div className="space-y-2">
                  <input
                    name="address1"
                    ref={autocompleteInputRef}
                    value={autocompleteInput}
                    onChange={(e) => setAutocompleteInput(e.target.value)}
                    placeholder="Search for your address..."
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={handleUseMyLocation}
                    disabled={loadingLocation}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-brand-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingLocation ? (
                      <>
                        <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                        Getting location...
                      </>
                    ) : (
                      <>
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Use my location
                      </>
                    )}
                  </button>
                </div>

                {/* Street Address - Shows first */}
                <input
                  name="address1"
                  value={addressLine1}
                  onChange={(event) => setAddressLine1(event.target.value)}
                  placeholder="Street address"
                  className={inputClass}
                />
                
                {/* Show after street address is entered */}
                {addressLine1 && (
                  <>
                    <input
                      name="address2"
                      value={addressLine2}
                      onChange={(event) => setAddressLine2(event.target.value)}
                      placeholder="Apt, suite, etc. (optional)"
                      className={inputClass}
                    />
                    
                    {/* City, State, Postal Code */}
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        name="city"
                        value={city}
                        onChange={(event) => setCity(event.target.value)}
                        placeholder="City"
                        className={inputClass}
                      />
                      <input
                        name="zip"
                        value={postalCode}
                        onChange={(event) => setPostalCode(event.target.value)}
                        placeholder="ZIP / Postal code"
                        className={inputClass}
                      />
                    </div>
                    
                    {/* State/Province - conditional based on country */}
                    {showStateField &&
                      (stateOptions.length ? (
                        <SearchableSelect
                          value={stateValue}
                          onChange={(val) => setStateValue(val)}
                          options={stateOptions.map((s) => ({ label: s.name, value: s.name }))}
                          placeholder="Select state / province"
                        />
                      ) : (
                        <input
                          value={stateValue}
                          onChange={(event) => setStateValue(event.target.value)}
                          placeholder="State / Province"
                          className={inputClass}
                        />
                      ))}
                    
                    {/* Country - Last */}
                    <SearchableSelect
                      value={countryOptions.find(c => c.name === country)?.isoCode || country}
                      onChange={(val) => {
                        const selected = countryOptions.find(c => c.isoCode === val);
                        setCountry(selected ? selected.name : val);
                        if (!stateValue && !city && !postalCode) {
                          setStateValue('');
                        }
                      }}
                      options={countryOptions.map((c) => ({ label: c.name, value: c.isoCode }))}
                      placeholder="Select country"
                    />
                  </>
                )}
              </div>
              <div className="relative rounded-xl border border-zinc-200 bg-white p-3 shadow-sm">
                <div className="absolute right-3 top-3 z-10 inline-flex rounded-full border border-zinc-200 bg-white/90 p-1 text-xs font-semibold text-zinc-700 shadow-sm">
                  <button
                    type="button"
                    onClick={() => setMapMode('roadmap')}
                    className={`rounded-full px-2 py-1 ${mapMode === 'roadmap' ? 'bg-brand-primary-700 text-white' : ''}`}
                  >
                    Map
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapMode('satellite')}
                    className={`rounded-full px-2 py-1 ${mapMode === 'satellite' ? 'bg-brand-primary-700 text-white' : ''}`}
                  >
                    Satellite
                  </button>
                </div>
                {addressQuery ? (
                  <iframe
                    title="Address map preview"
                    src={`https://www.google.com/maps?q=${encodeURIComponent(addressQuery)}&t=${mapMode === 'satellite' ? 'k' : 'm'}&output=embed`}
                    className="h-72 w-full rounded-lg border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="flex h-72 items-center justify-center text-xs text-zinc-500">
                    Enter an address to preview the map.
                  </div>
                )}
              </div>
            </div>
          </div>

        </section>

        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white/70 p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Payment Details</p>
          </div>
          {!(isOwner || isAdmin) && (
            <div className="rounded-lg border border-brand-primary-100 bg-brand-primary-50/80 p-3 text-xs text-brand-primary-700">
              Only workspace owners or admins can manage payment details. Contact an owner or admin to update these fields.
            </div>
          )}
            <p className="text-sm font-semibold text-zinc-900">Choose which options you want to have on your invoices:</p>

          <fieldset className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3 md:w-1/2">
                <label className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                  <input
                    type="checkbox"
                    checked={mailToAddressEnabled}
                    onChange={(event) => setMailToAddressEnabled(event.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
                    disabled={paymentDisabled}
                  />
                  Send Check to Address
                </label>

                {mailToAddressEnabled && (
                  <div className="space-y-2 rounded-lg border border-dashed border-zinc-200 bg-white p-3">
                    <p className="text-sm font-semibold text-zinc-900">Checks should be made payable to:</p>
                    <label className={paymentLabelClass}>
                      <input
                        type="radio"
                        name="mailToAddressPayableOptionCompany"
                        value="same"
                        checked={payableOption === 'same'}
                        onChange={() => {
                          setPayableOption('same');
                          setCustomPayableValue('');
                        }}
                        disabled={paymentDisabled}
                        className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
                      />
                      Business Name
                    </label>
                    <label className={paymentLabelClass}>
                      <input
                        type="radio"
                        name="mailToAddressPayableOption"
                        value="custom"
                        checked={payableOption === 'custom'}
                        onChange={() => setPayableOption('custom')}
                        disabled={paymentDisabled}
                        className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
                      />
                      Custom Name
                    </label>
                    {payableOption === 'custom' && (
                      <input
                        type="text"
                        placeholder="e.g. John A. Smith, LLC"
                        value={customPayableValue}
                        onChange={(event) => setCustomPayableValue(event.target.value)}
                        className={paymentDisabled ? disabledInputClass : inputClass}
                      />
                    )}
                  </div>
                )}
              </div>

              {mailToAddressEnabled && (
                <div className="md:w-1/2 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[var(--color-brand-logo-text)] bg-zinc-100 px-2 py-0.5 text-[0.65rem] font-semibold uppercase text-[var(--color-brand-logo-text)]">
                      Preview
                    </span>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">Mail &amp; Issue Check To:</p>
                    <p className="text-lg font-semibold text-zinc-900">{computedMailToValue || 'Your Company'}</p>
                    <div className="mt-3 space-y-1 text-sm text-gray-700">
                      {addressLine1 && <div>{addressLine1}</div>}
                      {addressLine2 && <div>{addressLine2}</div>}
                      {(city || stateValue || postalCode) && (
                        <div className="flex flex-wrap gap-1">
                          {city && <span>{city},</span>}
                          {stateValue && <span> {stateValue}</span>}
                          {postalCode && <span>{postalCode}</span>}
                        </div>
                      )}
                      {country && <div>{country}</div>}
                      {!addressLine1 && !addressLine2 && !city && !stateValue && !postalCode && !country && (
                        <div className="text-xs text-zinc-400">Enter an address above to preview it here.</div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </fieldset>
             
                  <div
            id="stripe"
            className={`space-y-3 ${paymentDisabled ? 'pointer-events-none opacity-60' : ''}`}
            aria-disabled={paymentDisabled}
          >
           
            
            <label className={paymentLabelClass}>
              <input
                type="checkbox"
                checked={useVenmo}
                onChange={(e) => setUseVenmo(e.target.checked)}
                disabled={paymentDisabled}
                className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
              />
              Venmo
            </label>
            {useVenmo && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-700">Venmo handle or phone number</label>
                  <input
                    value={venmoHandleValue}
                    onChange={(event) => setVenmoHandleValue(event.target.value)}
                    placeholder="@handle or phone"
                    className={paymentDisabled ? disabledInputClass : inputClass}
                  />
                </div>
                {venmoQrUrl && (
                  <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white p-3">
                    <img src={venmoQrUrl} alt="Venmo QR code" className="h-24 w-24 rounded-lg border border-zinc-200" />
                    <div className="text-xs text-zinc-600">
                      <p className="font-semibold text-zinc-900">QR Code Preview</p>
                      <p>This code will appear on invoices for easy Venmo payments.</p>
                    </div>
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
                className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
              />
              Zelle
            </label>
            {useZelle && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-zinc-700">Zelle handle or phone number</label>
                <input
                  value={zelleHandleValue}
                  onChange={(event) => setZelleHandleValue(event.target.value)}
                  placeholder="phone or email"
                  className={paymentDisabled ? disabledInputClass : inputClass}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className={paymentLabelClass}>
                <input
                  type="checkbox"
                  checked={useCustomStripe}
                  onChange={(e) => setUseCustomStripe(e.target.checked)}
                  disabled={paymentDisabled}
                  className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
                />
                Online Payment (Requires Stripe Account) (PRO)
              </label>
              {useCustomStripe && (
                <div className="space-y-4 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
                  {stripeAccountIdValue && stripePublishableKeyValue ? (
                    <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">
                      Stripe connected.
                    </div>
                  ) : (
                    <p className="text-sm text-zinc-600">
                      Connect Stripe to automatically fill your publishable key and Connect account ID via OAuth.
                    </p>
                  )}
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-700">Stripe Publishable Key</label>
                      <input
                        value={stripePublishableKeyValue}
                        onChange={(event) => setStripePublishableKeyValue(event.target.value)}
                        placeholder="pk_live_..."
                        className={paymentDisabled ? disabledInputClass : inputClass}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-zinc-700">Stripe Connect Account ID</label>
                      <input
                        value={stripeAccountIdValue}
                        onChange={(event) => setStripeAccountIdValue(event.target.value)}
                        placeholder="acct_..."
                        className={paymentDisabled ? disabledInputClass : inputClass}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        stripeAccountIdValue && stripePublishableKeyValue
                          ? resetStripeFields()
                          : handleStripeLink('/api/payments/account-link')
                      }
                      disabled={paymentDisabled}
                      className="inline-flex w-full items-center justify-center rounded-full border border-brand-primary-600 bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:border-brand-primary-200 disabled:bg-brand-primary-200 disabled:text-zinc-500"
                    >
                      {stripeAccountIdValue && stripePublishableKeyValue ? 'Disconnect Stripe' : 'Connect with Stripe'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStripeLink('/api/payments/account-link', 'standard')}
                      disabled={paymentDisabled}
                      className="text-xs font-semibold text-zinc-600 underline-offset-4 hover:text-zinc-900 disabled:text-zinc-400"
                    >
                      Advanced: Connect existing Stripe (Standard, manual webhook required)
                    </button>
                    {(!stripeAccountIdValue || !stripePublishableKeyValue) && (
                      <div className="rounded-xl border border-dashed border-zinc-200 bg-zinc-50 p-3">
                        <button
                          type="button"
                          onClick={() => setShowStripeManualInstructions((prev) => !prev)}
                          className="flex w-full items-center justify-between text-left text-sm font-semibold text-zinc-800"
                        >
                          <span>Alternative instructions</span>
                          <span className="text-xs text-zinc-500">{showStripeManualInstructions ? 'Hide' : 'Show'}</span>
                        </button>
                        {showStripeManualInstructions && (
                          <div className="mt-2 space-y-2 text-xs text-zinc-600">
                            <p>
                              1. Log into your Stripe Dashboard, open Developers → API keys, and copy your{' '}
                              <code className="rounded bg-zinc-200 px-1 py-0.5 text-[0.65rem] text-zinc-900">pk_live...</code>{' '}
                              publishable key into the first field above.
                            </p>
                            <p>
                              2. Go to Settings → Connect → Accounts and copy your connected account ID (
                              <code className="rounded bg-zinc-200 px-1 py-0.5 text-[0.65rem] text-zinc-900">acct_...</code>) into the second field.
                            </p>
                            <p>3. Save the form to enable online payments without using the automatic Stripe flow.</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                    {stripeMessage && <p className="text-xs text-amber-600">{stripeMessage}</p>}
                    {stripeErrorLink && stripeErrorLink.trim().length > 0 && (
                      <p className="text-xs text-amber-600">
                        Please review Stripe&rsquo;s loss responsibility notice.{' '}
                        <a href={stripeErrorLink.trim() || 'https://dashboard.stripe.com/settings/connect/platform-profile'} target="_blank" rel="noreferrer" className="underline">
                          Learn more
                        </a>
                        .
                      </p>
                    )}
                    {showManualWebhookWarning && (
                      <div className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950">
                        <div className="space-y-1 text-sm text-zinc-800">
                          <label className="text-xs font-semibold text-zinc-700">Webhook signing secret</label>
                          <input
                            value={stripeWebhookSecretValue}
                            onChange={(event) => setStripeWebhookSecretValue(event.target.value)}
                            placeholder="whsec_..."
                            className={paymentDisabled ? disabledInputClass : inputClass}
                            disabled={paymentDisabled}
                          />
                          <p className="text-[0.65rem] text-zinc-600">
                            Paste the signing secret from the webhook endpoint you created in Stripe so we can validate inbound events for this account.
                          </p>
                          <p className="text-[0.65rem] text-zinc-500">
                            Webhook status:
                            <span className={`ml-1 font-semibold ${webhookStatusInfo.color}`}>
                              {webhookStatusInfo.text}
                            </span>
                          </p>
                        </div>
                        <StripeWebhookManualWarning />
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </section>

        <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white/70 p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Lead generation</p>
          </div>
          <label className={paymentLabelClass}>
            <input
              type="checkbox"
              checked={leadTokenEnabled}
              onChange={(event) => setLeadTokenEnabled(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
              disabled={paymentDisabled}
            />
            Enable TrackDrive
          </label>
          {leadTokenEnabled && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-zinc-700">TrackDrive token</label>
              <input
                value={leadTokenValue}
                onChange={(event) => setLeadTokenValue(event.target.value)}
                placeholder="Enter TrackDrive token"
                className={paymentDisabled ? disabledInputClass : inputClass}
              />
            </div>
          )}
        </section>

        {hydrated && (
          <div className="flex flex-col gap-2">
            <div className={`flex items-center gap-3 ${onboardingMode ? 'justify-end' : 'justify-between'}`}>
              {!onboardingMode && (
                <div className="text-sm text-zinc-500">
                  {message ? <span className="font-semibold text-emerald-700">{message}</span> : null}
                </div>
              )}
              <div className="flex items-center gap-3 sm:ml-auto">
                <button
                  type="submit"
                  disabled={disabled}
                  className="inline-flex items-center justify-center rounded-lg border border-brand-primary-300 bg-brand-primary-600 px-4 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:border-brand-primary-600 hover:bg-brand-primary-700 disabled:opacity-60"
                >
                  {isPending && (
                    <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                  {buttonLabel}
                </button>
                {onboardingMode && message && <p className="text-sm text-emerald-600">{message}</p>}
              </div>
            </div>
            {onboardingMode && error && <p className="text-sm text-rose-600">{error}</p>}
            {!onboardingMode && error && (
              <div className="rounded-lg border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700">
                <strong>Error:</strong> {error}
              </div>
            )}
          </div>
        )}
      </form>
    </section>
  );
}
