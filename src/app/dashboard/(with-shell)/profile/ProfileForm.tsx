'use client';

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState, useTransition, type PointerEvent as ReactPointerEvent, type TouchEvent as ReactTouchEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { StripeConnectGuide } from '@/components/StripeConnectGuide';
import { StripeWebhookManualWarning } from '@/components/StripeWebhookManualWarning';
import { DEFAULT_BUSINESS_TIME_ZONE } from '@/lib/timezone';
import { changeEmailAction, type ChangeEmailResult } from './actions/change-email';

const TIMEZONE_OPTIONS = [
  { label: 'Pacific (US)', value: 'America/Los_Angeles' },
  { label: 'Mountain (US)', value: 'America/Denver' },
  { label: 'Central (US)', value: 'America/Chicago' },
  { label: 'Eastern (US)', value: 'America/New_York' },
  { label: 'London', value: 'Europe/London' },
  { label: 'UTC', value: 'UTC' },
];

type ProfileFormProps = {
  initial: {
    name: string;
    email: string;
    companyName?: string | null;
    logoDataUrl?: string | null;
    signatureDataUrl?: string | null;
    phone?: string | null;
    stripeAccountId?: string | null;
    stripePublishableKey?: string | null;
    venmoHandle?: string | null;
    zelleHandle?: string | null;
    mailToAddressEnabled?: boolean | null;
    mailToAddressTo?: string | null;
    trackdriveLeadToken?: string | null;
    trackdriveLeadEnabled?: boolean | null;
    reportsToId?: string | null;
    positionId?: string | null;
    timezone?: string | null;
  };
  canAcceptPayments: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  showPaymentAndLead?: boolean;
  showProfileDetails?: boolean;
  positions?: { id: string; name: string }[];
  onSaveSuccess?: () => void;
  skipRedirect?: boolean;
  simplePositionInput?: boolean;
  allowSetAsAdministrator?: boolean;
  initialRole?: string | null;
  shouldShowManualStripeWebhookWarning?: boolean;
};

export function ProfileForm({
  initial,
  canAcceptPayments,
  isOwner,
  isAdmin,
  showPaymentAndLead = true,
  showProfileDetails = true,
  positions: initialPositions = [],
  onSaveSuccess,
  skipRedirect = false,
  simplePositionInput = false,
  allowSetAsAdministrator = false,
  initialRole = null,
  shouldShowManualStripeWebhookWarning = false,
}: ProfileFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [emailMessage, setEmailMessage] = useState<string | null>(null);
  const [newEmailValue, setNewEmailValue] = useState('');
  const [isEmailPending, startEmailTransition] = useTransition();
  const [showEmailUpdateSection, setShowEmailUpdateSection] = useState(false);
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
  const fallbackName = initial.name?.trim() ?? '';
  const [companyNameValue, setCompanyNameValue] = useState(initial.companyName ?? fallbackName);
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
  const [signatureDataUrl, setSignatureDataUrl] = useState(initial.signatureDataUrl ?? '');
  const [signatureMessage, setSignatureMessage] = useState<string | null>(null);
  const [isSignatureSaving, setIsSignatureSaving] = useState(false);
  const [hasSignatureStroke, setHasSignatureStroke] = useState(Boolean(initial.signatureDataUrl));
  const [isDrawingSignature, setIsDrawingSignature] = useState(false);
  const signatureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastPointerRef = useRef<number | null>(null);
  const [showSignatureEditor, setShowSignatureEditor] = useState(!initial.signatureDataUrl);
  const [leadTokenValue, setLeadTokenValue] = useState(initial.trackdriveLeadToken ?? '');
  const [leadTokenEnabled, setLeadTokenEnabled] = useState(initial.trackdriveLeadEnabled ?? false);
  const paymentDisabled = !canAcceptPayments || !isOwner;
  const showManualWebhookWarning =
    useCustomStripe &&
    Boolean(stripeAccountIdValue && stripePublishableKeyValue && shouldShowManualStripeWebhookWarning);
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
  const showAdminToggle = allowSetAsAdministrator && initialRole !== 'OWNER';
  const leadSectionDisabled = !canAcceptPayments || !isOwner;
  const leadFieldsetClass = `space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4${
    leadSectionDisabled ? ' opacity-80' : ''
  }`;
  const leadControlsClass = leadSectionDisabled ? 'space-y-3 pointer-events-none opacity-60' : 'space-y-3';
  const profileInitials = useMemo(() => {
    const rawName = companyNameValue.trim() || initial.name?.trim() || '';
    if (!rawName) return '?';
    const tokens = rawName
      .split(/[\s._-]+/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (tokens.length === 0) {
      return rawName.charAt(0).toUpperCase() || '?';
    }
    return tokens.map((segment) => segment.charAt(0).toUpperCase()).join('');
  }, [companyNameValue, initial.name]);
  const companyLabel = useMemo(() => companyNameValue.trim() || 'Your Company', [companyNameValue]);
  const computedMailToValue = useMemo(() => {
    if (!mailToAddressEnabled) {
      return '';
    }
    if (payableOption === 'same') return companyLabel;
    return customPayableValue.trim() || companyLabel;
  }, [companyLabel, customPayableValue, mailToAddressEnabled, payableOption]);
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

  const [setAsAdministrator, setSetAsAdministrator] = useState(initialRole === 'ADMIN');

  useEffect(() => {
    setSetAsAdministrator(initialRole === 'ADMIN');
  }, [initialRole]);


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

  useEffect(() => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#111827';
  }, []);

  useEffect(() => {
    if (!leadSectionDisabled) return;
    setLeadTokenEnabled(false);
    setLeadTokenValue('');
  }, [leadSectionDisabled]);

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

  const [positions, setPositions] = useState(initialPositions);
  const [positionsError, setPositionsError] = useState<string | null>(null);
  const [positionsLoading, setPositionsLoading] = useState(false);
  const [positionSelection, setPositionSelection] = useState<string>(initial.positionId ?? '');
  const [customPositionName, setCustomPositionName] = useState(
    simplePositionInput
      ? initialPositions.find((p) => p.id === initial.positionId)?.name ?? 'Owner'
      : initial.positionId
      ? ''
      : initialPositions.find((p) => p.id === initial.positionId)?.name ?? ''
  );
  const isOtherSelected = !simplePositionInput && positionSelection === '__other';

  useEffect(() => {
    setPositions(initialPositions);
  }, [initialPositions]);

  useEffect(() => {
    if (simplePositionInput) return;
    if (!isOwner) return;
    let active = true;
    const fetchPositions = async () => {
      setPositionsLoading(true);
      try {
        const res = await fetch('/api/positions');
        if (!res.ok) throw new Error(await res.text());
        const data = (await res.json()) as { id: string; name: string }[];
        if (!active) return;
        setPositions(data);
        setPositionsError(null);
      } catch (error) {
        if (!active) return;
        const msg = error instanceof Error ? error.message : 'Unable to load positions';
        setPositionsError(msg);
      } finally {
        if (active) setPositionsLoading(false);
      }
    };

    if (!initialPositions || initialPositions.length === 0) {
      void fetchPositions();
    }
    const refreshHandler = () => void fetchPositions();
    window.addEventListener('positions-updated', refreshHandler);
    return () => {
      active = false;
      window.removeEventListener('positions-updated', refreshHandler);
    };
  }, [initialPositions, isOwner, simplePositionInput]);

  const handleRemoveProfileImage = () => {
    setLogoDataUrl('');
    setLogoError(null);
  };

  const getCanvasPoint = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = signatureCanvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    return { x, y };
  };

  const handleSignaturePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const ctx = signatureCanvasRef.current?.getContext('2d');
    const point = getCanvasPoint(event);
    if (!ctx || !point) return;
    event.preventDefault();
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
    setIsDrawingSignature(true);
    setHasSignatureStroke(true);
    setSignatureMessage(null);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleSignaturePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingSignature) return;
    const ctx = signatureCanvasRef.current?.getContext('2d');
    const point = getCanvasPoint(event);
    if (!ctx || !point) return;
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  };

  const handleSignaturePointerUp = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingSignature) return;
    setIsDrawingSignature(false);
    lastPointerRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const clearSignaturePad = () => {
    const canvas = signatureCanvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleClearSignature = () => {
    clearSignaturePad();
    setHasSignatureStroke(false);
    setSignatureMessage(null);
  };

  const handleResetSavedSignature = () => {
    setSignatureDataUrl('');
    setShowSignatureEditor(true);
    setSignatureMessage(null);
    setHasSignatureStroke(false);
    clearSignaturePad();
  };

  const handleSaveSignature = async () => {
    if (!hasSignatureStroke) {
      setSignatureMessage('Draw your signature before saving.');
      return;
    }
    const canvas = signatureCanvasRef.current;
    if (!canvas) return;
    setIsSignatureSaving(true);
    setSignatureMessage(null);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), 'image/png');
    });
    if (!blob) {
      setSignatureMessage('Unable to capture signature.');
      setIsSignatureSaving(false);
      return;
    }
    const file = new File([blob], 'signature.png', { type: 'image/png' });
    const formData = new FormData();
    formData.append('signature', file);
    try {
      const res = await fetch('/api/cloudinary/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? 'Upload failed');
      }
      setSignatureDataUrl(data.secureUrl);
      setSignatureMessage('Signature saved.');
      setShowSignatureEditor(false);
      clearSignaturePad();
      setHasSignatureStroke(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Upload failed.';
      setSignatureMessage(message);
    } finally {
      setIsSignatureSaving(false);
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const payload = Object.fromEntries(form.entries()) as Record<string, string>;
    const canonicalName = companyNameValue.trim() || fallbackName;
    payload.name = canonicalName;
    payload.companyName = canonicalName;
    payload.trackdriveLeadToken = leadTokenValue.trim();
    payload.trackdriveLeadEnabled = leadTokenEnabled ? 'true' : 'false';
    payload.signatureDataUrl = signatureDataUrl ?? '';
    payload.setAsAdministrator = setAsAdministrator ? 'true' : 'false';
    startTransition(async () => {
      setMessage(null);
      let resolvedPositionId = positionSelection;
      if (isOwner) {
        if (simplePositionInput) {
          const trimmed = (customPositionName || 'Owner').trim();
          if (!resolvedPositionId) {
            try {
              const res = await fetch('/api/positions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed || 'Owner' }),
              });
              if (!res.ok) {
                const txt = await res.text();
                setMessage(txt || 'Unable to create position.');
                return;
              }
              const created = (await res.json()) as { id: string; name: string };
              resolvedPositionId = created.id;
              setPositions((prev) => [...prev, created]);
              setPositionSelection(created.id);
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Unable to create position.';
              setMessage(msg);
              return;
            }
          }
        } else {
          if (isOtherSelected) {
            const trimmed = customPositionName.trim();
            if (!trimmed) {
              setMessage('Enter a position name.');
              return;
            }
            try {
              const res = await fetch('/api/positions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: trimmed }),
              });
              if (!res.ok) {
                const txt = await res.text();
                setMessage(txt || 'Unable to create position.');
                return;
              }
              const created = (await res.json()) as { id: string; name: string };
              resolvedPositionId = created.id;
              setPositions((prev) => [...prev, created]);
              setPositionSelection(created.id);
              setCustomPositionName('');
            } catch (err) {
              const msg = err instanceof Error ? err.message : 'Unable to create position.';
              setMessage(msg);
              return;
            }
          }
        }
        payload.positionId = resolvedPositionId || '';
      }

      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        router.refresh();
        if (onSaveSuccess) {
          onSaveSuccess();
        }
        if (!skipRedirect) {
          window.location.assign('/dashboard');
        } else {
          setMessage('Profile updated.');
        }
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

  const requestStripeLink = async (
    endpoint: '/api/payments/account-link' | '/api/payments/dashboard-link',
    mode: 'express' | 'standard' = 'express',
  ) => {
    setStripeMessage('Opening Stripe...');
    setStripeErrorLink(null);
    try {
      const payload: Record<string, string> = {};
      if (endpoint === '/api/payments/account-link') {
        payload.mode = mode;
      }
      const body = Object.keys(payload).length ? JSON.stringify(payload) : undefined;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body,
      });
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

  const handleStripeLink = (
    endpoint: '/api/payments/account-link' | '/api/payments/dashboard-link',
    mode: 'express' | 'standard' = 'express',
  ) => {
    void requestStripeLink(endpoint, mode);
  };

  const buildPointerEventFromTouch = (
    touch: Touch,
    currentTarget: HTMLCanvasElement
  ): ReactPointerEvent<HTMLCanvasElement> =>
    ({
      pointerId: touch.identifier,
      clientX: touch.clientX,
      clientY: touch.clientY,
      currentTarget,
      preventDefault: () => {},
    } as unknown as ReactPointerEvent<HTMLCanvasElement>);

  const handleSignatureTouchStart = (event: ReactTouchEvent<HTMLCanvasElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    handleSignaturePointerDown(buildPointerEventFromTouch(touch as unknown as Touch, event.currentTarget));
  };

  const handleSignatureTouchMove = (event: ReactTouchEvent<HTMLCanvasElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    handleSignaturePointerMove(buildPointerEventFromTouch(touch as unknown as Touch, event.currentTarget));
  };

  const handleSignatureTouchEnd = (event: ReactTouchEvent<HTMLCanvasElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    event.preventDefault();
    handleSignaturePointerUp(buildPointerEventFromTouch(touch as unknown as Touch, event.currentTarget));
  };

  return (
    <form onSubmit={handleSubmit} className=" p-0 ">
      {showProfileDetails && (
      <section className="space-y-6 rounded-2xl border border-zinc-200 bg-white/70 p-6 mb-2 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Profile Details</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Your Name</label>
            <input
              name="name"
              value={companyNameValue}
              onChange={(event) => setCompanyNameValue(event.target.value)}
              className={inputClass}
            />
          </div>
          <div className="space-y-1">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-4">
              <div className="flex-shrink-0">
                <div className="relative h-20 w-20 rounded-xl border border-zinc-200 bg-zinc-50 shadow-sm">
                  {logoDataUrl ? (
                    <>
                      <img
                        src={logoDataUrl}
                        alt="logo preview"
                        className="h-full w-full rounded-xl object-cover"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveProfileImage}
                        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-xs font-bold text-zinc-600 shadow"
                        aria-label="Remove profile image"
                      >
                        X
                      </button>
                    </>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-zinc-500">
                      {profileInitials}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 space-y-2">
                <label className="block text-sm font-medium text-zinc-700">Profile Picture</label>
                <label className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 cursor-pointer">
                  Upload
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileChange}
                    disabled={uploadingLogo}
                    className="hidden"
                  />
                </label>
                <input type="hidden" name="logoDataUrl" value={logoDataUrl ?? ''} />
                {uploadingLogo && <p className="text-xs text-zinc-500">Uploading...</p>}
                {logoError && <p className="text-xs text-rose-500">{logoError}</p>}
              </div>
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="grid gap-4 md:grid-cols-2">
            {simplePositionInput ? (
              <div className="space-y-1 md:col-span-2">
                <label className="text-sm font-medium text-zinc-700">Position / Title</label>
                <input
                  type="text"
                  value={customPositionName}
                  onChange={(event) => setCustomPositionName(event.target.value)}
                  className={inputClass}
                />
                <p className="text-xs text-zinc-500">Default is owner change as needed.</p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-zinc-700">Position</label>
                  <select
                    name="positionId"
                    value={positionSelection}
                    onChange={(event) => setPositionSelection(event.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select position</option>
                    {positions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.name}
                      </option>
                    ))}
                    <option value="__other">Other (add new)</option>
                  </select>
                  {positionsLoading && <p className="text-xs text-zinc-500">Loading positions...</p>}
                  {positionsError && <p className="text-xs text-rose-600">{positionsError}</p>}
                  <p className="text-xs text-zinc-500">Choose from your team positions or add a new one.</p>
                </div>
                {isOtherSelected && (
                  <div className="space-y-1">
                    <label className="text-sm font-medium text-zinc-700">New position name</label>
                    <input
                      type="text"
                      value={customPositionName}
                      onChange={(event) => setCustomPositionName(event.target.value)}
                      placeholder="e.g. Owner, CEO, Managing Director"
                      className={inputClass}
                    />
                    <p className="text-xs text-zinc-500">We will add this position and set it for you.</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 shadow-sm">
      <div className="space-y-3">
        <p className="text-sm font-medium text-zinc-700">Signature (for documents)</p>
        {showSignatureEditor ? (
          <div className="space-y-3">
            <canvas
              ref={signatureCanvasRef}
              width={320}
              height={140}
              className="h-36 w-full rounded-xl border border-zinc-300 bg-white shadow-sm"
              onPointerDown={handleSignaturePointerDown}
              onPointerMove={handleSignaturePointerMove}
              onPointerUp={handleSignaturePointerUp}
              onPointerLeave={handleSignaturePointerUp}
              onTouchStart={handleSignatureTouchStart}
              onTouchMove={handleSignatureTouchMove}
              onTouchEnd={handleSignatureTouchEnd}
              onTouchCancel={handleSignatureTouchEnd}
              style={{ touchAction: 'none' }}
            />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleClearSignature}
                    className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    disabled={isSignatureSaving}
                    onClick={handleSaveSignature}
                    className="rounded-lg bg-brand-primary-600 px-3 py-1 text-xs font-semibold text-white transition hover:bg-brand-primary-700 disabled:opacity-60"
                  >
                    {isSignatureSaving ? 'Saving...' : 'Save signature'}
                  </button>
                </div>
              </div>
            ) : signatureDataUrl ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-zinc-500">Saved signature</p>
                    <img
                      src={signatureDataUrl}
                      alt="saved signature preview"
                      className="h-20 w-40 rounded-lg border border-zinc-200 object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleResetSavedSignature}
                    className="rounded-lg border border-zinc-300 px-3 py-1 text-xs font-semibold text-zinc-700 transition hover:border-zinc-400"
                  >
                    Clear signature
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">No signature saved yet.</p>
            )}
            {signatureMessage && <p className="text-xs text-zinc-500">{signatureMessage}</p>}
            <input type="hidden" name="signatureDataUrl" value={signatureDataUrl ?? ''} />
          </div>
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
          <label className="text-sm font-medium text-zinc-700">Timezone</label>
          <select
            name="timezone"
            defaultValue={initial.timezone ?? DEFAULT_BUSINESS_TIME_ZONE}
            className={inputClass}
          >
            {TIMEZONE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-500">This timezone controls your scheduler embeds and availability.</p>
        </div>


        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setShowEmailUpdateSection((prev) => !prev)}
            className="text-sm font-medium text-zinc-700  transition hover:text-brand-primary-600 focus:outline-none focus:ring-2 focus:ring-brand-primary-600/30"
            aria-expanded={showEmailUpdateSection}
          >
            Email (Click here to change)
          </button>
          <input
            name="email"
            type="email"
            defaultValue={initial.email}
            readOnly
            disabled
            className="w-full cursor-not-allowed rounded-lg border border-zinc-300 bg-gray-100 px-3 py-2 text-sm text-gray-700 shadow-sm"
          />
        </div>
        {showEmailUpdateSection && (
          <div className="space-y-1">
            <label className="text-sm font-medium text-zinc-700">Update your login email</label>
            <div className="flex flex-wrap items-center gap-3 sm:items-end">
              <input
                type="email"
                value={newEmailValue}
                onChange={(event) => setNewEmailValue(event.target.value)}
                placeholder="new@email.com"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-brand-primary-600 focus:outline-none focus:ring-2 focus:ring-brand-primary-100 sm:max-w-sm"
              />
              <button
                type="button"
                disabled={isEmailPending || !newEmailValue.trim()}
                onClick={() => {
                  if (!newEmailValue.trim()) return;
                  startEmailTransition(async () => {
                    const result: ChangeEmailResult = await changeEmailAction(newEmailValue);
                    setEmailMessage(result.message);
                    if (result.status === 'sent') {
                      setNewEmailValue('');
                    }
                  });
                }}
                className="rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 disabled:opacity-60"
              >
                {isEmailPending ? 'Sending...' : 'Request verification'}
              </button>
            </div>
            {emailMessage && <p className="text-xs text-zinc-500">{emailMessage}</p>}
          </div>
        )}

      </section>
      )}

      {showPaymentAndLead && (
      <>
      <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white/70 p-6 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Payment Details </p>
      </div>
      {!isOwner && (
        <div className="rounded-lg border border-brand-primary-100 bg-brand-primary-50/80 p-3 text-xs text-brand-primary-700">
          Only the workspace owner can manage payment details. Contact an owner to update these fields.
        </div>
      )}

      <fieldset className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
                      <legend className="text-sm font-semibold text-zinc-900">Options</legend>


          <div className="space-y-">
            <input type="hidden" name="mailToAddressEnabled" value="false" />
            <label className={paymentLabelClass}>
              <input
                type="checkbox"
                name="mailToAddressEnabled"
                value="true"
                checked={mailToAddressEnabled}
                onChange={(event) => setMailToAddressEnabled(event.target.checked)}
                className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
              />
              Send Check to Address
            </label>
            {!canAcceptPayments && (
              <p className="text-xs text-brand-primary-700">
                <strong>PRO FEATURES</strong>
              </p>
            )}

            {mailToAddressEnabled && (
              <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
                <div className="space-y-6 rounded-lg border bg-gray-50 p-4 mt-2">
                  <div className="space-y-2">
                                      <p className="text-sm font-semibold text-zinc-900">Checks should be made payable to:</p>

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
                        className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
                      />
                    
                      Company / Personal Name 
                      
                    </label>

                    <label className="flex items-center gap-2 text-sm font-semibold text-zinc-700">
                      <input
                        type="radio"
                        name="mailToAddressPayableOption"
                        value="custom"
                        checked={payableOption === 'custom'}
                        onChange={() => setPayableOption('custom')}
                        className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
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
        </div>
      )}

        {showAdminToggle && (
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-zinc-500">
            <input
              type="checkbox"
              checked={setAsAdministrator}
              onChange={(event) => setSetAsAdministrator(event.target.checked)}
              className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
            />
            <span>Set as Administrator</span>
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
                className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
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
                className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
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
                className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
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
                  <div className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-4 text-sm font-semibold text-emerald-900">
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
                      className="w-full rounded-full border border-brand-primary-600 bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:border-brand-primary-200 disabled:bg-brand-primary-200"
                    >
                      {stripeAccountIdValue && stripePublishableKeyValue ? 'Disconnect Stripe' : 'Connect Stripe Automatically'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStripeLink('/api/payments/account-link', 'standard')}
                      disabled={paymentDisabled}
                      className="text-xs font-semibold text-zinc-600 underline-offset-4 hover:text-zinc-900 disabled:text-zinc-400"
                    >
                      Advanced: Connect existing Stripe (Standard, manual webhook required)
                    </button>
                </div>
              </div>
            )}
            {stripeMessage && <p className="text-xs text-amber-600">{stripeMessage}</p>}
            {stripeErrorLink && stripeErrorLink.trim().length > 0 && (
              <p className="text-xs text-amber-600">
                {"Please review the responsibilities of managing losses for connected accounts at https://dashboard.stripe.com/settings/connect/platform-profile."} This shows up when Stripe asks you to review connected account responsibilities (typically during new account onboarding).{' '}
                <a href={stripeErrorLink.trim() || 'https://dashboard.stripe.com/settings/connect/platform-profile'} target="_blank" rel="noreferrer" className="underline">
                  Learn more in Stripe Connect settings
                </a>
                .
              </p>
            )}
            {showManualWebhookWarning && <StripeWebhookManualWarning />}
          </div>
             </div>

          {paymentDisabled && (
            <Link
              href="/dashboard/settings?upgrade=1"
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-primary-600 bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700 cursor-pointer"
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
      <fieldset className={leadFieldsetClass} aria-disabled={leadSectionDisabled}>
        <legend className="text-sm font-semibold text-zinc-900">Options</legend>
          {leadSectionDisabled && (
            <div className="rounded-lg border border-dashed border-brand-primary-300 bg-brand-primary-50/80 p-3 text-xs text-brand-primary-700">
              Lead capture is a <strong>ClientWave Pro</strong> feature and only the workspace owner can enable it. Upgrade to unlock TrackDrive syncing and keep owner privileges active.
              <Link
                href="/dashboard/settings?upgrade=1"
                className="ml-2 inline-flex items-center text-brand-primary-700 underline hover:text-brand-primary-600"
              >
                Upgrade now
              </Link>
            </div>
          )}
          <div className={leadControlsClass}>
            <label className="flex items-center gap-2 text-sm font-semibold text-zinc-900">
              <input
                type="checkbox"
                checked={leadTokenEnabled}
                onChange={(event) => setLeadTokenEnabled(event.target.checked)}
                disabled={leadSectionDisabled}
                className="h-4 w-4 rounded border-zinc-300 text-brand-primary-600 focus:ring-brand-primary-500"
              />
              TrackDrive
            </label>
            {leadTokenEnabled && !leadSectionDisabled && (
              <div className="space-y-2">
                <div className="text-sm text-zinc-600 space-y-2">
                  <span>
                    Provide the TrackDrive lead token you copy from TrackDrive &amp;rarr; Integrations &amp;rarr; API &amp;amp; Access Tokens and set the webhook (Integrations &amp;rarr; Webhook Subscriptions &amp;rarr; New Lead) to call{' '}
                    <code className="rounded bg-white px-1 py-0.5 text-xs font-mono">
                      {`${process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.clientwave.app'}/api/trackdrive-webhook`}
                    </code>
                    .
                  </span>
                  <div>
                    <strong>Hey [Client Name],</strong>
                    <br />
                    Here&rsquo;s exactly how to auto-send every new TrackDrive lead into ClientWave (takes ~3 minutes):
                    <ol className="mt-2 space-y-1 list-decimal pl-5 text-xs text-zinc-600">
                      <li>
                        Go to <em>TrackDrive &amp;rarr; Integrations &amp;rarr; API &amp;amp; Access Tokens</em> and copy your Lead Token.
                      </li>
                      <li>
                        Go to <em>Integrations &amp;rarr; Webhook Subscriptions</em> and create a new webhook with Event &ldquo;New Lead&rdquo;, URL{' '}
                        <code className="rounded bg-white px-1 py-0.5 text-xs font-mono">https://clientwave.app/api/trackdrive-webhook</code>, and paste the Lead Token.
                      </li>
                      <li>
                        Go to <em>Leads &amp;rarr; Contact Field Mapping</em> and add a mapping where Source Field is <code>{'{{agent.email}}'}</code> and Target Field is <code>agent_email</code>.
                      </li>
                    </ol>
                    That&rsquo;s it&mdash;every new lead now becomes a client in the correct agent&rsquo;s ClientWave account.
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
          </div>
        </fieldset>
      </section>
      </>
      )}

      {message && <p className="text-sm text-rose-600">{message}</p>}

      <div className="flex items-center justify-end gap-3 pt-2">
        {!skipRedirect && (
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 cursor-pointer"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={isPending || uploadingLogo}
          className="rounded-lg border border-brand-primary-300 bg-brand-primary-600 px-4 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:border-brand-primary-600 hover:bg-brand-primary-700 disabled:opacity-60"
        >
          {isPending || uploadingLogo ? 'Saving...' : (skipRedirect ? 'Save & Continue' : 'Save Changes')}
        </button>
      </div>
    </form>
  );
}
