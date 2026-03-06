'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DocumentEditor, type DocumentEditorConfig } from '@/components/invoicing/DocumentEditor';
import { createInvoiceAction } from './actions';
import { buildUnpaidInvoiceRequest } from './submit';

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-sm text-zinc-500">Loading invoice...</div>}>
      <CreateInvoiceContent />
    </Suspense>
  );
}

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

function CreateInvoiceContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const preselectedClientId = searchParams.get('clientId')?.trim() || '';
  const isEdit = Boolean(editId);
  const [editLoadState, setEditLoadState] = useState<{
    id: string | null;
    error: string | null;
    initialValues?: DocumentEditorConfig['initialValues'];
  }>({ id: null, error: null, initialValues: undefined });

  const loadingInvoice = Boolean(isEdit && editId && editLoadState.id !== editId);
  const invoiceError = isEdit && editId === editLoadState.id ? editLoadState.error : null;
  const initialValues = isEdit && editId === editLoadState.id ? editLoadState.initialValues : undefined;

  useEffect(() => {
    let active = true;
    if (!isEdit || !editId) {
      return () => {
        active = false;
      };
    }
    if (editLoadState.id === editId) {
      return () => {
        active = false;
      };
    }

    fetch(`/api/invoices/${encodeURIComponent(editId)}`, { credentials: 'include', cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || 'Failed to load invoice');
        }
        return res.json();
      })
      .then((invoice: {
        invoiceNumber?: string | null;
        clientId?: string;
        title?: string | null;
        issueDate?: string;
        dueDate?: string | null;
        notes?: string | null;
        recurring?: boolean;
        recurringInterval?: 'day' | 'week' | 'month' | 'quarter' | 'year' | null;
        recurringDayOfMonth?: number | null;
        recurringDayOfWeek?: number | null;
        items?: Array<{
          description?: string | null;
          name?: string | null;
          quantity?: number | string | null;
          unitPrice?: number | string | null;
          taxRate?: number | string | null;
        }>;
      }) => {
        if (!active) return;
        setEditLoadState({
          id: editId,
          error: null,
          initialValues: {
          invoiceNumber: invoice.invoiceNumber ?? '',
          clientId: invoice.clientId ?? '',
          title: invoice.title ?? '',
          issueDate: invoice.issueDate ? String(invoice.issueDate).slice(0, 10) : '',
          dueDate: invoice.dueDate ? String(invoice.dueDate).slice(0, 10) : '',
          notes: invoice.notes ?? '',
          recurringEnabled: Boolean(invoice.recurring),
          recurringInterval: invoice.recurringInterval ?? 'month',
          recurringDayOfMonth: invoice.recurringDayOfMonth ?? undefined,
          recurringDayOfWeek: invoice.recurringDayOfWeek ?? undefined,
          items:
            Array.isArray(invoice.items) && invoice.items.length > 0
              ? invoice.items.map((item) => ({
                  description: item.description || item.name || '',
                  quantity: Number(item.quantity ?? 1) || 1,
                  unitPrice: Number(item.unitPrice ?? 0) || 0,
                  taxRate: Number(item.taxRate ?? 0) || 0,
                  taxEnabled: Number(item.taxRate ?? 0) > 0,
                }))
              : undefined,
          },
        });
      })
      .catch((error) => {
        if (!active) return;
        setEditLoadState({
          id: editId,
          error: error instanceof Error ? error.message : 'Failed to load invoice',
          initialValues: undefined,
        });
      });

    return () => {
      active = false;
    };
  }, [isEdit, editId, editLoadState.id]);

  const mapValuesToInvoicePayload = useCallback((values: any, status: string) => {
    const recurringEnabled = Boolean(values.recurringEnabled);
    const recurringInterval = recurringEnabled ? (values.recurringInterval ?? 'month') : null;
    const recurringDayOfMonth =
      recurringEnabled && recurringInterval !== 'week' && recurringInterval !== 'day'
        ? values.recurringDayOfMonth ?? null
        : null;
    const recurringDayOfWeek =
      recurringEnabled && recurringInterval === 'week'
        ? values.recurringDayOfWeek ?? 1
        : null;
    const nextOccurrence = recurringEnabled
      ? calculateNextOccurrence(
          values.issueDate,
          recurringInterval ?? undefined,
          recurringDayOfMonth ?? undefined,
          recurringDayOfWeek ?? undefined
        )
      : null;

    return {
      ...values,
      status,
      recurring: recurringEnabled,
      recurringInterval,
      recurringDayOfMonth,
      recurringDayOfWeek,
      nextOccurrence,
    };
  }, []);

  const config: DocumentEditorConfig = useMemo(() => ({
    type: 'invoice',
    title: isEdit ? 'Edit Invoice' : 'Create Invoice',
    subtitle: isEdit
      ? 'Update invoice details and save changes.'
      : 'Select a client, add line items, and save your work as a draft or send the invoice immediately.',
    backHref: '/dashboard/invoices',
    enableRecurring: true,
    showTitle: true,
    enableTax: true,
    upgradeHref: '/payment?mode=subscription',
    lockClientSelection: isEdit,
    initialValues: isEdit
      ? initialValues
      : preselectedClientId
        ? { clientId: preselectedClientId }
        : undefined,
    onSubmit: async (values, status) => {
      const payload = mapValuesToInvoicePayload(values, status);

      if (isEdit && editId) {
        const res = await fetch(`/api/invoices/${encodeURIComponent(editId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      }

      if (status === 'OPEN') {
        const requestConfig = buildUnpaidInvoiceRequest({
          isEdit: false,
          editId: null,
          body: payload,
        });

        const res = await fetch(requestConfig.url, requestConfig.options);
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      } else {
        return createInvoiceAction(payload);
      }
    },
  }), [editId, initialValues, isEdit, mapValuesToInvoicePayload, preselectedClientId]);

  if (loadingInvoice) {
    return <div className="px-4 py-10 text-sm text-zinc-500">Loading invoice...</div>;
  }

  if (invoiceError) {
    return <div className="px-4 py-10 text-sm text-rose-600">{invoiceError}</div>;
  }

  return <DocumentEditor config={config} />;
}
