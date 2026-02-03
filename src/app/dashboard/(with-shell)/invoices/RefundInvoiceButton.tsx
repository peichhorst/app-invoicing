'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

type InvoiceRefundPayload = {
  amountPaid?: number | null;
  amountRefunded?: number | null;
  shortCode?: string | null;
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
        setInfo({
          amountPaid: typeof payload.amountPaid === 'number' ? payload.amountPaid : null,
          amountRefunded: typeof payload.amountRefunded === 'number' ? payload.amountRefunded : null,
          shortCode: typeof payload.shortCode === 'string' ? payload.shortCode : null,
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
    refundableCents === null ? '—' : currencyFormatter.format(refundableCents / 100);

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
        const text = await response.text();
        throw new Error(text || 'Refund request failed');
      }

      setFeedback('Refund request sent. Refreshing data…');
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
        onClick={() => setIsOpen((prev) => !prev)}
        className={`font-semibold uppercase tracking-[0.2em] text-xs ${isOpen ? 'text-brand-primary-600' : 'text-zinc-500'} focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary-400`}
      >
        {isOpen ? 'Close refund panel' : 'Issue refund'}
      </button>

      {isOpen && (
        <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-zinc-200 bg-white/90 p-4 shadow-sm">
          <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">Refund details</div>
          {fetching && <p className="text-sm text-gray-500">Loading invoice info…</p>}
          {fetchError && <p className="text-sm text-rose-500">{fetchError}</p>}
          {!fetching && !fetchError && (
            <>
              <p className="text-xs text-zinc-600">
                Refundable balance: <span className="font-semibold text-gray-900">{refundableLabel}</span>
              </p>
              <label className="text-xs text-zinc-500 block">
                Amount
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
              <label className="text-xs text-zinc-500 block">
                Reason (optional)
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-700 focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-100"
                  placeholder="Let the client know why you are refunding."
                />
              </label>
              {info?.shortCode && (
                <a
                  href={`/p/${info.shortCode}`}
                  className="text-xs font-semibold text-brand-primary-700 hover:underline"
                  target="_blank"
                  rel="noreferrer"
                >
                  View public invoice
                </a>
              )}
            </>
          )}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              disabled={!canSubmit}
              className={`rounded-lg px-4 py-2 text-xs font-semibold text-white transition ${
                canSubmit
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-zinc-300 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {submitting ? 'Submitting…' : 'Submit refund'}
            </button>
            {feedback && <p className="text-xs text-emerald-600">{feedback}</p>}
          </div>
          {apiError && <p className="text-xs text-rose-500">{apiError}</p>}
        </form>
      )}
    </div>
  );
}
