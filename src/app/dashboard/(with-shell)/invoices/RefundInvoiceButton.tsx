'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

type InvoiceRefundPayload = {
  amountPaid?: number | null;
  serviceAmountPaid?: number | null;
  serviceRefundableAmount?: number | null;
  amountRefunded?: number | null;
  refundPolicy?: {
    feeRefundable?: boolean;
    note?: string;
  } | null;
};

type RefundInvoiceButtonProps = {
  invoiceId: string;
};

export function RefundInvoiceButton({ invoiceId }: RefundInvoiceButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [info, setInfo] = useState<InvoiceRefundPayload | null>(null);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return undefined;
    const controller = new AbortController();
    setFetching(true);
    setFetchError(null);
    fetch(`/api/invoices/${invoiceId}`, { cache: 'no-store', signal: controller.signal })
      .then((res) => {
        if (!res.ok) {
          throw new Error('Unable to load invoice details');
        }
        return res.json();
      })
      .then((payload: InvoiceRefundPayload) => {
        const hasServiceRefundable = typeof payload.serviceRefundableAmount === 'number';
        const servicePaid =
          typeof payload.serviceAmountPaid === 'number'
            ? payload.serviceAmountPaid
            : typeof payload.amountPaid === 'number'
              ? payload.amountPaid
              : null;
        const amountRefunded = typeof payload.amountRefunded === 'number' ? payload.amountRefunded : null;
        const serviceRefundableAmount =
          hasServiceRefundable
            ? payload.serviceRefundableAmount ?? null
            : servicePaid != null && amountRefunded != null
              ? Math.max(0, servicePaid - amountRefunded)
              : null;
        setInfo({
          amountPaid: servicePaid,
          amountRefunded: serviceRefundableAmount != null && servicePaid != null
            ? Math.max(0, servicePaid - serviceRefundableAmount)
            : amountRefunded,
          serviceAmountPaid: servicePaid,
          serviceRefundableAmount,
          refundPolicy: payload.refundPolicy ?? {
            feeRefundable: false,
            note: 'Refunds apply to service amount only. Processing fees are non-refundable.',
          },
        });
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error('Failed to load refund info', error);
        setFetchError('Unable to load refund info right now.');
      })
      .finally(() => {
        setFetching(false);
      });

    return () => controller.abort();
  }, [isOpen, invoiceId]);

  const dollarsToCents = (value?: number | null) =>
    Number.isFinite(value ?? NaN) ? Math.round((value ?? 0) * 100) : 0;

  const refundableCents = useMemo(() => {
    if (!info) return null;
    const paidCents = dollarsToCents(info.amountPaid);
    const refundedCents = dollarsToCents(info.amountRefunded);
    return Math.max(0, paidCents - refundedCents);
  }, [info]);

  useEffect(() => {
    if (refundableCents !== null && amountInput.trim() === '') {
      setAmountInput((refundableCents / 100).toFixed(2));
    }
  }, [refundableCents, amountInput]);

  const refundableLabel =
    refundableCents === null ? '-' : currencyFormatter.format(refundableCents / 100);

  const canSubmit =
    refundableCents !== null && refundableCents > 0 && !submitting && !fetching;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApiError(null);
    setFeedback(null);

    if (refundableCents === null || refundableCents <= 0) {
      setApiError('Nothing left to refund.');
      return;
    }

    const parsed = Number(amountInput);
    if (Number.isNaN(parsed) || parsed <= 0) {
      setApiError('Enter a valid refund amount.');
      return;
    }

    const requestedCents = Math.min(Math.round(parsed * 100), refundableCents);
    setSubmitting(true);

    try {
      const payload: Record<string, unknown> = { amount: requestedCents };
      const trimmedReason = reason.trim();
      if (trimmedReason) {
        payload.reason = trimmedReason;
      }

      const response = await fetch(`/api/invoices/${invoiceId}/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = 'Refund request failed';
        try {
          const data = await response.json();
          if (typeof data?.error === 'string' && data.error.trim()) {
            message = data.error;
          }
        } catch {
          const text = await response.text();
          if (text?.trim()) {
            message = text;
          }
        }
        throw new Error(message);
      }

      setFeedback('Refund request sent. Refreshing data...');
      setAmountInput((refundableCents / 100).toFixed(2));
      setTimeout(() => setFeedback(null), 3000);
      router.refresh();
    } catch (error: any) {
      console.error('Refund request failed', error);
      setApiError(error?.message || 'Unable to process the refund.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-1 text-sm">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center rounded-md border border-brand-primary-200 bg-white px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary-700 shadow-sm transition hover:border-brand-primary-300 hover:bg-brand-primary-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary-400"
      >
        Issue refund
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/30 px-4 py-6 md:items-center">
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-lg space-y-3 rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Refund details</div>
              <button
                type="button"
                className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-700"
                onClick={() => setIsOpen(false)}
              >
                Close
              </button>
            </div>
            {fetching && <p className="text-sm text-gray-500">Loading invoice info...</p>}
            {fetchError && <p className="text-sm text-rose-500">{fetchError}</p>}
            {!fetching && !fetchError && (
              <>
                <p className="text-left text-xs text-zinc-600">
                  Refundable balance: <span className="font-semibold text-gray-900">{refundableLabel}</span>
                </p>
                <p className="text-left text-xs text-zinc-500">
                  {info?.refundPolicy?.note || 'Refunds apply to service amount only. Processing fees are non-refundable.'}
                </p>
                <label className="flex flex-col items-start text-left text-xs text-zinc-500">
                  <span className="mb-1">Amount</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={refundableCents !== null ? (refundableCents / 100).toFixed(2) : undefined}
                    value={amountInput}
                    onChange={(event) => setAmountInput(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
                    placeholder="0.00"
                  />
                </label>
                <label className="flex flex-col items-start text-left text-xs text-zinc-500">
                  <span className="mb-1">Reason (optional)</span>
                  <textarea
                    rows={2}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
                    placeholder="Let the client know why you are refunding."
                  />
                </label>
              </>
            )}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={!canSubmit}
                className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition ${
                  canSubmit
                    ? 'bg-brand-primary-600 hover:bg-brand-primary-700'
                    : 'cursor-not-allowed bg-zinc-300 text-zinc-500'
                }`}
              >
                {submitting ? 'Submitting...' : 'Submit refund'}
              </button>
            </div>
            {feedback && <p className="text-xs text-emerald-600">{feedback}</p>}
            {apiError && <p className="text-xs text-rose-500">{apiError}</p>}
          </form>
        </div>
      )}
    </div>
  );
}
