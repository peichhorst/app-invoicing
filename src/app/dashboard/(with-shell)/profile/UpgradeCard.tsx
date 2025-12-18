'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CurrentPlan } from '@/lib/plan';

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
    if (!hasCancellation && !confirm('Are you sure you want to cancel your Pro subscription?')) return;
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
    <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Plan</p>
          <h2 className="text-xl font-semibold text-purple-900">{planLabel}</h2>
          {daysLeft !== null && daysLeft >= 0 && (
            <p className="text-xs text-purple-700">
              Trial ends in {daysLeft} day{daysLeft === 1 ? '' : 's'}.
            </p>
          )}
          {hasCancellation && displayedCancelAtDate && (
            <p className="text-xs text-purple-700">
              Subscription cancelled — ends on {displayedCancelAtDate.toLocaleDateString()}.
            </p>
          )}
          {message && <p className="mt-1 text-sm text-purple-800">{message}</p>}
        </div>

        <div className="flex flex-col gap-3 items-start">
          {!isPro ? (
            <>
              <div className="text-sm text-purple-900">
                <div className="font-semibold">Pro Plan Includes:</div>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
                  <li>Unlimited Clients & Invoices</li>
                  <li>Payment Methods (Venmo / Zelle)</li>
                  <li>Stripe Online Payment Integration</li>
                  <li>Invoice Reminders</li>
                  <li>Recurring Invoices</li>
                </ul>
              </div>
              <button
                type="button"
                onClick={() => router.push('/payment?mode=subscription')}
                className="inline-flex items-center justify-center rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-800"
              >
                Upgrade to Pro ($19/mo)
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={handleSubscriptionAction}
              disabled={isProcessing}
              className="inline-flex items-center justify-center rounded-lg border border-purple-700 bg-white/90 px-4 py-2 text-sm font-semibold text-purple-700 shadow-sm transition hover:bg-white cursor-pointer disabled:cursor-not-allowed disabled:border-purple-300 disabled:text-purple-300"
            >
              {buttonLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
