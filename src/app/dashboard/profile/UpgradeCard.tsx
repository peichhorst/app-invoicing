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

  useEffect(() => {
    const confirm = async () => {
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
    void confirm();
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

  return (
    <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6 shadow-sm">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-purple-700">Plan</p>
          <h2 className="text-xl font-semibold text-purple-900">{planLabel}</h2>
          {daysLeft !== null && daysLeft >= 0 && (
            <p className="text-xs text-purple-700">
              Trial ends in {daysLeft} day{daysLeft === 1 ? '' : 's'}.
            </p>
          )}
          {message && <p className="mt-1 text-sm text-purple-800">{message}</p>}
        </div>
        <div className="flex flex-col gap-3 items-start">
          {!isPro && (
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
          )}
          <button
            type="button"
            onClick={() => router.push('/payment?mode=subscription')}
            disabled={isPro}
            className="inline-flex items-center justify-center rounded-lg bg-purple-700 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-800 cursor-pointer disabled:cursor-not-allowed disabled:bg-purple-400"
          >
            {isPro ? 'Already Upgraded' : 'Upgrade to Pro ($19/mo)'}
          </button>
        </div>
      </div>
    </div>
  );
}
