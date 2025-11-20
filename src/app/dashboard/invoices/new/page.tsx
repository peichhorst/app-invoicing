'use client';

import { Suspense, useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { InvoiceStatus } from '@prisma/client';
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import {
  createInvoiceAction,
  fetchClientOptionsAction,
  type ClientOption,
} from './actions';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be 0 or greater'),
  taxRate: z.number().min(0, 'Tax rate must be 0 or greater'),
});

const invoiceSchema = z
  .object({
    clientId: z.string().min(1, 'Client is required'),
    issueDate: z.string().min(1, 'Issue date is required'),
    dueDate: z.string().min(1, 'Due date is required'),
    notes: z
      .string()
      .max(1000, 'Notes must be under 1000 characters')
      .optional()
      .or(z.literal('')),
    items: z.array(lineItemSchema).min(1, 'Add at least one line item'),
  })
  .refine(
    (data) => {
      if (!data.issueDate || !data.dueDate) return true;
      return new Date(data.dueDate) >= new Date(data.issueDate);
    },
    {
      message: 'Due date must be on or after the issue date',
      path: ['dueDate'],
    }
  );

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

type ToastState = {
  message: string;
  variant: 'success' | 'error';
};

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const formatCurrency = (value: number) => currencyFormatter.format(Number.isFinite(value) ? value : 0);

export default function CreateInvoicePage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-sm text-zinc-500">Loading invoice...</div>}>
      <CreateInvoiceContent />
    </Suspense>
  );
}

function CreateInvoiceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get('edit');
  const isEdit = Boolean(editId);
  const [clientOptions, setClientOptions] = useState<ClientOption[]>([]);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const defaultDates = useMemo(() => {
    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 7);
    const format = (date: Date) => date.toISOString().split('T')[0];
    return {
      issueDate: format(today),
      dueDate: format(dueDate),
    };
  }, []);

  const {
    control,
    register,
    getValues,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: '',
      issueDate: defaultDates.issueDate,
      dueDate: defaultDates.dueDate,
      notes: '',
      items: [
        {
          description: '',
          quantity: 1,
          unitPrice: 0,
          taxRate: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  useEffect(() => {
    let isMounted = true;

    fetchClientOptionsAction()
      .then((options) => {
        if (isMounted) {
          setClientOptions(options);
        }
      })
      .catch(() => {
        if (isMounted) {
          setToast({
            message: 'Unable to load clients. Please refresh and try again.',
            variant: 'error',
          });
        }
      })
      .finally(() => {
        if (isMounted) {
          setClientsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!editId) return;
    setIsGeneratingPdf(true);
    fetch(`/api/invoices/${editId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        reset({
          clientId: data.clientId,
          issueDate: data.issueDate ? data.issueDate.split('T')[0] : defaultDates.issueDate,
          dueDate: data.dueDate ? data.dueDate.split('T')[0] : defaultDates.dueDate,
          notes: data.notes || '',
          items: data.items.map((item: any) => ({
            description: item.description || item.name || '',
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            taxRate: 0,
          })),
        });
      })
      .catch((err) => {
        console.error('Failed to load invoice', err);
        setToast({ message: 'Failed to load invoice.', variant: 'error' });
      })
      .finally(() => setIsGeneratingPdf(false));
  }, [editId, reset, defaultDates.issueDate, defaultDates.dueDate]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const watchedItems = useWatch<InvoiceFormValues, 'items'>({
    control,
    name: 'items',
  });

  type Totals = {
    subtotal: number;
    tax: number;
    total: number;
  };

  const summary = useMemo<Totals>(() => {
    const items = watchedItems ?? [];

    if (!items.length) {
      return { subtotal: 0, tax: 0, total: 0 };
    }

    return items.reduce<Totals>(
      (acc, item) => {
        const quantity = Number(item?.quantity) || 0;
        const unitPrice = Number(item?.unitPrice) || 0;
        const rate = Number(item?.taxRate) || 0;

        const lineSubtotal = quantity * unitPrice;
        const lineTax = lineSubtotal * (rate / 100);

        return {
          subtotal: acc.subtotal + lineSubtotal,
          tax: acc.tax + lineTax,
          total: acc.total + lineSubtotal + lineTax,
        };
      },
      { subtotal: 0, tax: 0, total: 0 }
    );
  }, [watchedItems]);

  const handleSavePdf = async () => {
    const values = getValues();
    if (!values.items || !values.items.length) {
      setToast({ message: 'Add at least one line item before saving a PDF.', variant: 'error' });
      return;
    }

    setIsGeneratingPdf(true);
    try {
      const items = values.items ?? [];
      const totals = items.reduce<Totals>(
        (acc, item) => {
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unitPrice) || 0;
          const rate = Number(item.taxRate) || 0;
          const lineSubtotal = quantity * unitPrice;
          const lineTax = lineSubtotal * (rate / 100);
          return {
            subtotal: acc.subtotal + lineSubtotal,
            tax: acc.tax + lineTax,
            total: acc.total + lineSubtotal + lineTax,
          };
        },
        { subtotal: 0, tax: 0, total: 0 }
      );

      const styles = StyleSheet.create({
        page: { padding: 32, fontSize: 11, color: '#111' },
        header: { marginBottom: 16 },
        title: { fontSize: 20, fontWeight: 700, marginBottom: 4 },
        subtitle: { fontSize: 11, color: '#555' },
        section: { marginBottom: 14 },
        sectionTitle: { fontSize: 12, fontWeight: 600, marginBottom: 6 },
        tableHeader: { flexDirection: 'row', borderBottom: '1 solid #ddd', paddingBottom: 6, marginBottom: 6 },
        th: { flex: 1, fontSize: 10, fontWeight: 600, color: '#444' },
        thRight: { textAlign: 'right' },
        tableRow: { flexDirection: 'row', paddingVertical: 4, borderBottom: '1 solid #f0f0f0' },
        td: { flex: 1, fontSize: 10, color: '#111' },
        tdRight: { textAlign: 'right' },
        totals: { marginTop: 10, alignItems: 'flex-end' },
        totalRow: { flexDirection: 'row', justifyContent: 'space-between', width: 200, fontSize: 11 },
      });

      const doc = (
        <Document>
          <Page size="A4" style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.title}>Invoice (PDF draft)</Text>
              <Text style={styles.subtitle}>
                Issued {values.issueDate || 'N/A'} - Due {values.dueDate || 'N/A'}
              </Text>
              <Text style={styles.subtitle}>Status: {values.clientId ? 'SENT' : 'DRAFT'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bill To</Text>
              <Text>{clientOptions.find((c) => c.id === values.clientId)?.companyName || 'No client selected'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Line Items</Text>
              <View style={styles.tableHeader}>
                <Text style={styles.th}>Description</Text>
                <Text style={[styles.th, styles.thRight]}>Qty</Text>
                <Text style={[styles.th, styles.thRight]}>Unit</Text>
                <Text style={[styles.th, styles.thRight]}>Tax %</Text>
                <Text style={[styles.th, styles.thRight]}>Total</Text>
              </View>
              {items.map((item, idx) => {
                const quantity = Number(item.quantity) || 0;
                const unitPrice = Number(item.unitPrice) || 0;
                const rate = Number(item.taxRate) || 0;
                const lineSubtotal = quantity * unitPrice;
                const lineTax = lineSubtotal * (rate / 100);
                const lineTotal = lineSubtotal + lineTax;
                return (
                  <View key={`${item.description}-${idx}`} style={styles.tableRow}>
                    <Text style={styles.td}>{item.description || 'Item'}</Text>
                    <Text style={[styles.td, styles.tdRight]}>{quantity}</Text>
                    <Text style={[styles.td, styles.tdRight]}>{formatCurrency(unitPrice)}</Text>
                    <Text style={[styles.td, styles.tdRight]}>{rate}%</Text>
                    <Text style={[styles.td, styles.tdRight]}>{formatCurrency(lineTotal)}</Text>
                  </View>
                );
              })}
            </View>

            <View style={styles.totals}>
              <View style={styles.totalRow}>
                <Text>Subtotal</Text>
                <Text>{formatCurrency(totals.subtotal)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text>Tax</Text>
                <Text>{formatCurrency(totals.tax)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={{ fontWeight: 700 }}>Total</Text>
                <Text style={{ fontWeight: 700 }}>{formatCurrency(totals.total)}</Text>
              </View>
            </View>

            {values.notes && (
              <View style={[styles.section, { marginTop: 12 }]}>
                <Text style={styles.sectionTitle}>Notes</Text>
                <Text>{values.notes}</Text>
              </View>
            )}
          </Page>
        </Document>
      );

      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'invoice.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setToast({ message: 'PDF downloaded', variant: 'success' });
    } catch (error) {
      console.error(error);
      setToast({ message: 'Failed to generate PDF.', variant: 'error' });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const triggerSubmit = (status: InvoiceStatus) => {
    if (isPending) return;

    handleSubmit((values) => {
      startTransition(() => {
        if (status === 'SENT') {
          fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...values, status }),
          })
            .then(async (res) => {
              if (!res.ok) throw new Error(await res.text());
              const result = await res.json();
              setToast({
                message: `Invoice ${result.invoiceNumber} sent successfully`,
                variant: 'success',
              });
              window.setTimeout(() => {
                router.push('/dashboard');
              }, 800);
            })
            .catch((error) => {
              console.error(error);
              setToast({
                message: 'Something went wrong while sending the invoice.',
                variant: 'error',
              });
            });
        } else {
          const action = isEdit
            ? fetch(`/api/invoices/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...values, status }),
              }).then(async (res) => {
                if (!res.ok) throw new Error(await res.text());
                return res.json();
              })
            : createInvoiceAction({ ...values, status });

          action
            .then((result: any) => {
              setToast({
                message: isEdit ? `Draft ${result.invoiceNumber} updated` : `Draft ${result.invoiceNumber} saved`,
                variant: 'success',
              });

              window.setTimeout(() => {
                router.push('/dashboard');
              }, 800);
            })
            .catch((error: any) => {
              console.error(error);
              setToast({
                message: 'Something went wrong while saving the invoice.',
                variant: 'error',
              });
            });
        }
      });
    })();
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10">
      {toast && (
        <div
          className={`fixed right-6 top-6 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
            toast.variant === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col gap-2">
          <h1 className="text-3xl font-semibold text-zinc-900">
            {isEdit ? 'Edit Invoice' : 'Create Invoice'}
          </h1>
          <p className="text-sm text-zinc-500">
            {isEdit
              ? 'Update your draft or send it when ready.'
              : 'Select a client, add line items, and save your work as a draft or send the invoice immediately.'}
          </p>
        </div>

        <form className="space-y-10">
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">
                Client <span className="text-rose-500">*</span>
              </label>
              <select
                {...register('clientId')}
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10 cursor-pointer"
                disabled={clientsLoading || isEdit}
                defaultValue=""
              >
                <option value="" disabled>
                  {clientsLoading ? 'Loading clients...' : 'Select a client'}
                </option>
                {!clientsLoading && clientOptions.length === 0 && (
                  <option value="" disabled>
                    No clients found
                  </option>
                )}
                {clientOptions.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.companyName}
                    {client.contactName ? ` - ${client.contactName}` : ''}
                  </option>
                ))}
              </select>
              {errors.clientId && <p className="text-xs text-rose-500">{errors.clientId.message}</p>}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Issue Date</label>
                <input
                  type="date"
                  {...register('issueDate')}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
                {errors.issueDate && <p className="text-xs text-rose-500">{errors.issueDate.message}</p>}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-700">Due Date</label>
                <input
                  type="date"
                  {...register('dueDate')}
                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                />
                {errors.dueDate && <p className="text-xs text-rose-500">{errors.dueDate.message}</p>}
              </div>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Line Items</h2>
                <p className="text-sm text-zinc-500">Add your billable work, quantities, and pricing.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  append({
                    description: '',
                    quantity: 1,
                    unitPrice: 0,
                    taxRate: 0,
                  })
                }
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer"
              >
                + Add Item
              </button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => {
                const item = watchedItems?.[index];
                const itemErrors = Array.isArray(errors.items) ? errors.items[index] : undefined;
                const quantity = Number(item?.quantity) || 0;
                const unitPrice = Number(item?.unitPrice) || 0;
                const taxRate = Number(item?.taxRate) || 0;
                const lineSubtotal = quantity * unitPrice;
                const lineTax = lineSubtotal * (taxRate / 100);
                const lineTotal = lineSubtotal + lineTax;

                return (
                  <div key={field.id} className="space-y-4 rounded-2xl border border-zinc-200 p-4 shadow-sm">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Description</label>
                      <input
                        type="text"
                        {...register(`items.${index}.description` as const)}
                        defaultValue={field.description}
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                        placeholder="Website design, consultation, etc."
                      />
                      {itemErrors?.description && (
                        <p className="text-xs text-rose-500">{itemErrors.description.message}</p>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700">Quantity</label>
                        <input
                          type="number"
                          min={1}
                          step={1}
                          {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                          defaultValue={field.quantity}
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                        />
                        {itemErrors?.quantity && (
                          <p className="text-xs text-rose-500">{itemErrors.quantity.message}</p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700">Unit Price</label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          {...register(`items.${index}.unitPrice` as const, { valueAsNumber: true })}
                          defaultValue={field.unitPrice}
                          className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                        />
                        {itemErrors?.unitPrice && (
                          <p className="text-xs text-rose-500">{itemErrors.unitPrice.message}</p>
                        )}
                      </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Tax Rate (%)</label>
              <input
                type="number"
                value={0}
                readOnly
                className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm bg-zinc-50 text-zinc-500 cursor-not-allowed"
              />
              <p className="text-xs text-zinc-500">Tax is fixed at 0% for now.</p>
            </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700">Total</label>
                        <div className="flex h-11 items-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 text-sm font-semibold text-zinc-900">
                          {formatCurrency(lineTotal)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm text-zinc-500">Subtotal: {formatCurrency(lineSubtotal)}</span>
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(index)}
                          className="text-sm font-medium text-rose-500 hover:text-rose-600 cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700">Notes</label>
              <textarea
                rows={5}
                {...register('notes')}
                className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                placeholder="Include optional terms, payment instructions, or a thank-you note."
              />
              {errors.notes && <p className="text-xs text-rose-500">{errors.notes.message}</p>}
            </div>

            <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
              <div className="flex items-center justify-between text-sm text-zinc-600">
                <span>Subtotal</span>
                <span className="font-medium text-zinc-900">{formatCurrency(summary.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between text-sm text-zinc-600">
                <span>Tax</span>
                <span className="font-medium text-zinc-900">{formatCurrency(summary.tax)}</span>
              </div>
              <div className="border-t border-dashed border-zinc-200 pt-4">
                <div className="flex items-center justify-between text-base font-semibold text-zinc-900">
                  <span>Total</span>
                  <span>{formatCurrency(summary.total)}</span>
                </div>
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">
              Totals update automatically as you edit line items. All amounts are saved in USD.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                disabled={isPending}
                onClick={() => triggerSubmit('DRAFT')}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-5 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                Save Draft
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => triggerSubmit('SENT')}
                className="inline-flex items-center justify-center rounded-xl bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-zinc-800 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? 'Sending...' : 'Send Invoice'}
              </button>
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={handleSavePdf}
                className="inline-flex items-center justify-center rounded-xl border border-zinc-300 px-6 py-2.5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-50 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGeneratingPdf ? 'Generating...' : 'Save PDF'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
