'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CurrentPlan } from '@/lib/plan';
import { ConfirmationModal } from '@/components/ui/ConfirmationModal';

type UpgradeCardProps = {
  currentPlan: CurrentPlan;
  upgradeStatus?: string | null;
  sessionId?: string | null;
};

export function UpgradeCard({ currentPlan, upgradeStatus, sessionId }: UpgradeCardProps) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(
    upgradeStatus === 'cancelled' ? 'Upgrade cancelled.' : null
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [localCancelAt, setLocalCancelAt] = useState<string | null>(null);
  const [contrastIsLight, setContrastIsLight] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateContrastFlag = () => {
      const contrast = getComputedStyle(document.documentElement)
        .getPropertyValue('--color-brand-contrast')
        .trim()
        .replace('#', '');
      if (contrast.length === 6) {
        const r = parseInt(contrast.slice(0, 2), 16);
        const g = parseInt(contrast.slice(2, 4), 16);
        const b = parseInt(contrast.slice(4, 6), 16);
        const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        setContrastIsLight(luminance > 0.5);
      }
    };

    updateContrastFlag();
    window.addEventListener('accent-color-updated', updateContrastFlag);
    return () => window.removeEventListener('accent-color-updated', updateContrastFlag);
  }, []);

  useEffect(() => {
    const confirmUpgrade = async () => {
      if (upgradeStatus !== 'success' || !sessionId) return;
      setMessage('Activating your upgrade...');
      try {
        const res = await fetch(`/api/billing/confirm?session_id=${encodeURIComponent(sessionId)}`);
        if (!res.ok) throw new Error(await res.text());
        setMessage('Upgrade complete! You now have unlimited clients.');
        router.refresh();
      } catch (err: any) {
        setMessage(err?.message || 'Upgrade confirmation failed.');
      }
    };
    void confirmUpgrade();
  }, [upgradeStatus, sessionId, router]);

  const planLabel =
    currentPlan.planTier === 'PRO_TRIAL'
      ? currentPlan.isInGracePeriod
        ? 'Pro Trial (Grace)'
        : 'Pro Trial'
      : currentPlan.planTier === 'PRO'
        ? 'Pro'
        : 'Free';
  const daysLeft =
    currentPlan.planTier === 'PRO_TRIAL' && currentPlan.trialEndsAt
      ? Math.max(0, Math.ceil((currentPlan.trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;
  const isPro = currentPlan.planTier === 'PRO';
  const displayedCancelAtDate =
    localCancelAt ? new Date(localCancelAt) : currentPlan.subscriptionCancelAt ?? null;
  const hasCancellation = displayedCancelAtDate !== null;

  const handleSubscriptionAction = async () => {
    setIsProcessing(true);
    setMessage(hasCancellation ? 'Resuming your subscription...' : 'Cancelling subscription...');
    try {
      const endpoint = hasCancellation ? '/api/billing/resume-subscription' : '/api/billing/cancel-subscription';
      const res = await fetch(endpoint, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || (hasCancellation ? 'Failed to resume subscription' : 'Failed to cancel subscription'));
      if (hasCancellation) {
        setLocalCancelAt(null);
        setMessage('Subscription resumed!');
      } else {
        setLocalCancelAt(data?.cancelAt ?? null);
        setMessage(
          data?.cancelAt
            ? `Subscription will end on ${new Date(data.cancelAt).toLocaleDateString()}.`
            : 'Subscription cancelled.'
        );
      }
      router.refresh();
    } catch (err: any) {
      setMessage(err?.message || (hasCancellation ? 'Unable to resume.' : 'Unable to cancel.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const buttonLabel = hasCancellation
    ? isProcessing
      ? 'Resuming...'
      : 'Resubscribe Now'
    : isProcessing
      ? 'Cancelling...'
      : 'Cancel Subscription';

  return (
    <div className="rounded-2xl border border-brand-primary-700 bg-brand-primary-700 p-6 shadow-sm text-[var(--color-brand-contrast)]">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-brand-contrast)] opacity-80">Plan</p>
          <h2 className="text-xl font-semibold text-[var(--color-brand-contrast)]">{planLabel}</h2>
          {daysLeft !== null && daysLeft >= 0 && (
            <p className="text-xs text-[var(--color-brand-contrast)] opacity-80">
              Trial ends in {daysLeft} day{daysLeft === 1 ? '' : 's'}.
            </p>
          )}
          {hasCancellation && displayedCancelAtDate && (
            <p className="text-xs text-[var(--color-brand-contrast)] opacity-80">
              Subscription cancelled — ends on {displayedCancelAtDate.toLocaleDateString()}.
            </p>
          )}
          {message && <p className="mt-1 text-sm text-[var(--color-brand-contrast)]">{message}</p>}
        </div>

        <div className="flex flex-col gap-3 items-start">
          {!isPro ? (
            <>
              <div className="text-sm text-[var(--color-brand-contrast)]">               
              </div>
              <button
                type="button"
                onClick={() => router.push('/payment?mode=subscription')}
                className={
                  contrastIsLight
                    ? 'inline-flex items-center justify-center rounded-lg border border-brand-primary-600 bg-white px-4 py-2 text-sm font-semibold text-brand-primary-700 shadow-sm transition hover:bg-white/90'
                    : 'inline-flex items-center justify-center rounded-lg border border-black/70 bg-white px-4 py-2 text-sm font-semibold text-black shadow-sm transition hover:bg-black/5'
                }
              >
                Upgrade Plan
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => {
                if (hasCancellation) {
                  handleSubscriptionAction();
                } else {
                  setShowCancelConfirm(true);
                }
              }}
              disabled={isProcessing}
              className="inline-flex items-center justify-center rounded-lg border border-brand-primary-200 bg-white/10 px-4 py-2 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:bg-white/20 cursor-pointer disabled:cursor-not-allowed disabled:border-brand-primary-300 disabled:text-brand-primary-300"
            >
              {buttonLabel}
            </button>
          )}
        </div>
      </div>
      <ConfirmationModal
        isOpen={showCancelConfirm}
        onClose={() => setShowCancelConfirm(false)}
        onConfirm={handleSubscriptionAction}
        title="Cancel subscription?"
        message="Are you sure you want to cancel your Pro subscription?"
        confirmText="Cancel subscription"
        cancelText="Keep Pro"
        align="center"
      />
    </div>
  );
}
