'use client';

import { useSearchParams } from 'next/navigation';
import InvoicePaymentFlow from '@/components/InvoicePaymentFlow';
import SubscriptionPaymentFlow from '@/components/SubscriptionPaymentFlow';

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const invoiceId = searchParams.get('invoice');
  const applyStripeFeeParam = (searchParams.get('applyStripeFee') || '').toLowerCase();
  const applyStripeFee =
    applyStripeFeeParam === '1' ||
    applyStripeFeeParam === 'true' ||
    applyStripeFeeParam === 'yes' ||
    applyStripeFeeParam === 'on';

  if (mode === 'subscription') {
    return (
      <div className="min-h-screen bg-[#d8e6f2] px-4 pb-12 pt-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-3 text-zinc-900">
            <SubscriptionPaymentFlow />
          </div>
        </div>
      </div>
    );
  }

  if (invoiceId) {
    return (
      <div className="min-h-screen bg-[#d8e6f2] px-4 pb-12 pt-10">
        <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-3 text-zinc-900">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-600">ClientWave</p>
            <h1 className="text-3xl font-semibold leading-tight">Complete your payment securely.</h1>
            <InvoicePaymentFlow invoiceId={invoiceId} applyStripeFee={applyStripeFee} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#d8e6f2] px-4 pb-12 pt-10">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-3 text-zinc-900">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-600">ClientWave</p>
          <h1 className="text-3xl font-semibold leading-tight">Complete your payment securely.</h1>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm">
            <p className="text-sm text-zinc-600">Invalid payment link</p>
          </div>
        </div>
      </div>
    </div>
  );
}
