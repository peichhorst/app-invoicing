'use client';

import { DocumentEditor, type DocumentEditorConfig } from '@/components/invoicing/DocumentEditor';
import { createInvoiceAction } from '../new/actions';
import { buildUnpaidInvoiceRequest } from '../new/submit';

function parseLocalDateInput(value?: string) {
  if (!value) return null;
  const normalized = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function calculateNextOccurrence(
  issueDateStr: string | undefined,
  interval: 'day' | 'week' | 'month' | 'quarter' | 'year' | undefined,
  dayOfMonth: number | undefined,
  dayOfWeek: number | undefined
): string | null {
  if (!issueDateStr || !interval) return null;
  const base = parseLocalDateInput(issueDateStr);
  if (!base) return null;

  if (interval === 'day') {
    const next = new Date(base);
    next.setDate(base.getDate() + 1);
    return next.toISOString();
  }

  if (interval === 'week') {
    const target = Math.min(Math.max(dayOfWeek ?? 1, 1), 7);
    const currentDow = base.getDay() === 0 ? 7 : base.getDay();
    let diff = target - currentDow;
    if (diff <= 0) diff += 7;
    const next = new Date(base);
    next.setDate(base.getDate() + diff);
    return next.toISOString();
  }

  const monthsToAdd = interval === 'quarter' ? 3 : interval === 'year' ? 12 : 1;
  const next = new Date(base);
  next.setDate(1);
  next.setMonth(next.getMonth() + monthsToAdd);
  const requestedDay = Math.max(dayOfMonth ?? base.getDate(), 1);
  const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(requestedDay, daysInMonth));
  return next.toISOString();
}

export default function CreateRecurringInvoicePage() {
  const config: DocumentEditorConfig = {
    type: 'recurring-invoice',
    title: 'Create Recurring Invoice',
    subtitle: 'Select a client, add line items, and save your work as a recurring invoice.',
    backHref: '/dashboard/invoices',
    alwaysRecurring: true,
    enableTax: true,
    onSubmit: async (values, status) => {
      const recurringInterval = values.recurringInterval ?? 'month';
      const recurringDayOfMonth =
        recurringInterval === 'week' || recurringInterval === 'day'
          ? null
          : values.recurringDayOfMonth ?? null;
      const recurringDayOfWeek = recurringInterval === 'week' ? values.recurringDayOfWeek ?? 1 : null;
      const nextOccurrence = calculateNextOccurrence(
        values.issueDate,
        recurringInterval,
        recurringDayOfMonth ?? undefined,
        recurringDayOfWeek ?? undefined
      );

      const payload = {
        ...values,
        status,
        recurring: true,
        recurringInterval,
        recurringDayOfMonth,
        recurringDayOfWeek,
        nextOccurrence,
      };

      if (status === 'OPEN') {
        const requestConfig = buildUnpaidInvoiceRequest({
          isEdit: false,
          editId: null,
          body: payload,
        });
        const res = await fetch(requestConfig.url, requestConfig.options);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      }

      return createInvoiceAction(payload);
    },
  };

  return <DocumentEditor config={config} />;
}
