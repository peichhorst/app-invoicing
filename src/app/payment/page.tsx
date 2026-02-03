'use client';

import { useSearchParams } from 'next/navigation';
import InvoicePaymentFlow from '@/components/InvoicePaymentFlow';
import SubscriptionPaymentFlow from '@/components/SubscriptionPaymentFlow';

export default function PaymentPage() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode');
  const invoiceId = searchParams.get('invoice');

  if (mode === 'subscription') {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-primary-700 via-brand-secondary-700 to-brand-accent-700 px-4 pb-12 pt-10">
        <div className="grid-overlay" />
        <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-3 text-white">
            <SubscriptionPaymentFlow />
          </div>
        </div>
      </div>
    );
  }

  if (invoiceId) {
    return (
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-primary-700 via-brand-secondary-700 to-brand-accent-700 px-4 pb-12 pt-10">
        <div className="grid-overlay" />
        <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-start">
          <div className="flex-1 space-y-3 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.25em]">ClientWave</p>
            <h1 className="text-3xl font-semibold leading-tight">Complete your payment securely.</h1>
            <InvoicePaymentFlow invoiceId={invoiceId} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-brand-primary-700 via-brand-secondary-700 to-brand-accent-700 px-4 pb-12 pt-10">
      <div className="grid-overlay" />
      <div className="mx-auto flex max-w-5xl flex-col gap-8 lg:flex-row lg:items-start">
        <div className="flex-1 space-y-3 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.25em]">ClientWave</p>
          <h1 className="text-3xl font-semibold leading-tight">Complete your payment securely.</h1>
          <div className="rounded-2xl border border-white/20 bg-white/10 p-6 text-white shadow-xl backdrop-blur">
            <p className="text-sm text-white/70">Invalid payment link</p>
          </div>
        </div>
      </div>
    </div>
  );
}
