'use client';

import { Suspense, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { InvoiceStatus } from '@prisma/client';
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import { GripVertical } from 'lucide-react';
import { ClientForm, type ClientFormValues } from '@/components/ClientForm';
import DocumentPreview from '@/components/invoicing/DocumentPreview';
import { useClientOptions } from '@/components/invoicing/useClientOptions';
import { ClientSelect } from '@/components/invoicing/ClientSelect';

export type DocumentType = 'invoice' | 'recurring-invoice' | 'proposal' | 'contract';

export type DocumentEditorConfig = {
  type: DocumentType;
  title: string;
  subtitle?: string;
  backHref: string;
  enableRecurring?: boolean; // Show recurring toggle (invoices only)
  alwaysRecurring?: boolean; // Force recurring mode (recurring invoices)
  requireSignature?: boolean; // Contracts need signature
  showTitle?: boolean; // Optional title field
  showScope?: boolean; // Proposals/contracts have scope
  showDescription?: boolean; // Proposals have description
  showValidUntil?: boolean; // Proposals have valid until date
  enableTax?: boolean; // Invoices support tax
  upgradeHref?: string; // Upgrade link for Pro features
  onSubmit: (values: any, status: string) => Promise<{ id?: string; invoiceNumber?: string }>;
};

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be 0 or greater'),
  taxRate: z.number().min(0, 'Tax rate must be 0 or greater').optional(),
  taxEnabled: z.boolean().optional(),
});

const createSchema = (config: DocumentEditorConfig) =>
  z
    .object({
      clientId: z.string().min(1, 'Client is required'),
      title: config.showTitle
        ? z.string().max(200, 'Title must be 200 characters or fewer').optional()
        : z.string().optional(),
      description: config.showDescription ? z.string().optional() : z.string().optional(),
      scope: config.showScope ? z.string().optional() : z.string().optional(),
      issueDate: z.string().min(1, 'Issue date is required'),
      dueDate: z.string().optional(),
      validUntil: config.showValidUntil ? z.string().optional() : z.string().optional(),
      notes: z.string().max(1000, 'Notes must be under 1000 characters').optional().or(z.literal('')),
      recurringEnabled: config.alwaysRecurring ? z.literal(true) : z.boolean().optional(),
      recurringInterval: z.enum(['day', 'week', 'month', 'quarter', 'year']).optional(),
      recurringDayOfMonth: z.number().int().min(1).max(31).optional(),
      recurringDayOfWeek: z.number().int().min(1).max(7).optional(),
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

type FormValues = z.infer<ReturnType<typeof createSchema>>;
type ToastState = { message: string; variant: 'success' | 'error' };
type AssignableUserOption = { id: string; name: string | null; email: string | null };

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const formatCurrency = (value: number) => currencyFormatter.format(Number.isFinite(value) ? value : 0);

function calculateNextRecurringDate(
  issueDateStr: string | undefined,
  interval: 'day' | 'week' | 'month' | 'quarter' | 'year' | undefined,
  dayOfMonth: number | undefined,
  dayOfWeek: number | undefined
): Date | null {
  if (!issueDateStr || !interval) return null;
  const base = new Date(issueDateStr);
  if (Number.isNaN(base.getTime())) return null;

  if (interval === 'day') {
    const next = new Date(base);
    next.setDate(base.getDate() + 1);
    return next;
  }

  if (interval === 'week') {
    const target = Math.min(Math.max(dayOfWeek ?? 1, 1), 7);
    const currentDow = base.getDay() === 0 ? 7 : base.getDay();
    let diff = target - currentDow;
    if (diff <= 0) diff += 7;
    const next = new Date(base);
    next.setDate(base.getDate() + diff);
    return next;
  }

  const monthsToAdd = interval === 'quarter' ? 3 : interval === 'year' ? 12 : 1;
  const next = new Date(base);
  next.setDate(1);
  next.setMonth(next.getMonth() + monthsToAdd);
  const requestedDay = Math.max(dayOfMonth ?? base.getDate(), 1);
  const daysInMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(requestedDay, daysInMonth));
  return next;
}

export function DocumentEditor({ config }: { config: DocumentEditorConfig }) {
  const router = useRouter();
  const [clientOptions, setClientOptions] = useState<any[]>([]);
  const { clients: loadedClients, loading: clientsLoading, error: clientsError } = useClientOptions();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [savingStatus, setSavingStatus] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [dueEnabled, setDueEnabled] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [planTier, setPlanTier] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUserOption[]>([]);
  const [canAssignClients, setCanAssignClients] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [sendFirstNow, setSendFirstNow] = useState(true);

  const defaultDates = useMemo(() => {
    const today = new Date();
    const dueDate = new Date(today);
    const nextMonthBase = new Date(today);
    nextMonthBase.setDate(1);
    nextMonthBase.setMonth(nextMonthBase.getMonth() + 1);
    const daysNextMonth = new Date(nextMonthBase.getFullYear(), nextMonthBase.getMonth() + 1, 0).getDate();
    dueDate.setFullYear(nextMonthBase.getFullYear());
    dueDate.setMonth(nextMonthBase.getMonth());
    dueDate.setDate(Math.min(today.getDate(), daysNextMonth));
    const format = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    return {
      issueDate: format(today),
      dueDate: format(dueDate),
    };
  }, []);

  const defaultRecurringDay = useMemo(() => {
    const date = new Date(defaultDates.issueDate);
    return date.getDate();
  }, [defaultDates.issueDate]);

  const schema = useMemo(() => createSchema(config), [config]);

  const {
    control,
    register,
    getValues,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      clientId: '',
      title: '',
      description: '',
      scope: '',
      issueDate: defaultDates.issueDate,
      dueDate: defaultDates.dueDate,
      validUntil: config.showValidUntil
        ? (() => {
            const date = new Date();
            date.setFullYear(date.getFullYear() + 1);
            return date.toISOString().split('T')[0];
          })()
        : '',
      notes: '',
      recurringEnabled: config.alwaysRecurring || false,
      recurringInterval: 'month',
      recurringDayOfMonth: defaultRecurringDay,
      recurringDayOfWeek: 1,
      items: [
        {
          description: '',
          quantity: 1,
          unitPrice: undefined,
          taxRate: 0,
          taxEnabled: false,
        },
      ],
    },
  });

  const { fields, append, remove, move } = useFieldArray({
    control,
    name: 'items',
  });

  const handleAddClient = async (values: ClientFormValues) => {
    setAddingClient(true);
    try {
      const payload = {
        ...values,
        assignedToId: canAssignClients ? values.assignedToId ?? null : null,
        isLead: values.isLead,
      };
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Failed to create client');
      }
      const newClient = await res.json();
      const option = {
        id: newClient.id,
        companyName: newClient.companyName ?? '',
        contactName: newClient.contactName ?? '',
      };
      setClientOptions((prev) => [option, ...prev]);
      setValue('clientId', newClient.id, { shouldDirty: true, shouldTouch: true });
      setShowNewClient(false);
      setToast({ message: 'Client added successfully', variant: 'success' });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to add client';
      setToast({ message, variant: 'error' });
    } finally {
      setAddingClient(false);
    }
  };

  useEffect(() => {
    setClientOptions(loadedClients);
  }, [loadedClients]);

  useEffect(() => {
    let isMounted = true;
    fetch('/api/auth/me')
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load plan');
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        setCurrentUser(data?.user ?? null);
        const tier = (data?.planTier ?? data?.user?.planTier ?? '').toUpperCase();
        setPlanTier(tier || null);
        const role = (data?.user?.role ?? '').toUpperCase();
        const elevated = role === 'OWNER' || role === 'ADMIN';
        setCanAssignClients(elevated);
        if (elevated) {
          fetch('/api/company/members')
            .then(async (res) => {
              if (!res.ok) throw new Error(await res.text());
              return res.json();
            })
            .then((payload) => {
              if (isMounted) setAssignableUsers(payload.members ?? []);
            })
            .catch(() => {
              if (isMounted) setAssignableUsers([]);
            });
        }
      })
      .catch(() => {
        if (isMounted) setPlanTier(null);
      })
      .finally(() => {
        if (isMounted) setPlanLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const watchedItems = useWatch({ control, name: 'items' });
  const watchedDueDate = useWatch({ control, name: 'dueDate' });
  const watchedNotes = useWatch({ control, name: 'notes' });
  const watchedTitle = useWatch({ control, name: 'title' });
  const watchedScope = useWatch({ control, name: 'scope' });
  const watchedDescription = useWatch({ control, name: 'description' });
  const recurringEnabledWatch = useWatch({ control, name: 'recurringEnabled' });
  const recurringIntervalWatch = useWatch({ control, name: 'recurringInterval' });
  const recurringDayOfMonthWatch = useWatch({ control, name: 'recurringDayOfMonth' });
  const recurringDayOfWeekWatch = useWatch({ control, name: 'recurringDayOfWeek' });
  const issueDateWatch = useWatch({ control, name: 'issueDate' });

  const canUseRecurring = planTier === 'PRO' || planTier === 'PRO_TRIAL';

  const nextRecurringPreview = useMemo(() => {
    if (!config.enableRecurring && !config.alwaysRecurring) return null;
    if (config.enableRecurring && !canUseRecurring) return null;
    if (!recurringEnabledWatch) return null;
    return calculateNextRecurringDate(
      issueDateWatch,
      recurringIntervalWatch ?? 'month',
      recurringDayOfMonthWatch ?? 1,
      recurringDayOfWeekWatch ?? 1
    );
  }, [
    config.enableRecurring,
    config.alwaysRecurring,
    canUseRecurring,
    recurringEnabledWatch,
    issueDateWatch,
    recurringIntervalWatch,
    recurringDayOfMonthWatch,
    recurringDayOfWeekWatch,
  ]);

  const formatPreviewDate = (date: Date | null) =>
    date?.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }) ?? '';

  const todayLabel = formatPreviewDate(new Date());
  const nextPreviewLabel = formatPreviewDate(nextRecurringPreview);

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
        const taxEnabled = config.enableTax ? !!item?.taxEnabled : false;
        const rate = taxEnabled ? Number(item?.taxRate) || 0 : 0;
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
  }, [watchedItems, config.enableTax]);

  const triggerSubmit = (status: string) => {
    if (isPending || savingStatus) return;
    setSavingStatus(status);

    const onValid = async (values: FormValues) => {
      try {
        startTransition(async () => {
          const result = await config.onSubmit(values, status);
          setToast({
            message: `${config.title} ${result.invoiceNumber || ''} ${status === 'DRAFT' ? 'saved' : 'sent'} successfully`,
            variant: 'success',
          });
          setTimeout(() => {
            router.push(config.backHref);
          }, 800);
        });
      } catch (error: any) {
        setToast({
          message: error?.message || 'Something went wrong',
          variant: 'error',
        });
        setSavingStatus(null);
      }
    };

    const onInvalid = () => {
      setSavingStatus(null);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    handleSubmit(onValid, onInvalid)();
  };

  const selectedClient = clientOptions.find((c) => c.id === getValues('clientId'));

  const companyForPreview = currentUser
    ? {
        name: currentUser.company?.name || currentUser.companyName || currentUser.name || 'Your Company',
        logoUrl: currentUser.company?.logoUrl || undefined,
        address:
          [
            currentUser.company?.addressLine1,
            currentUser.company?.addressLine2,
            [currentUser.company?.city, currentUser.company?.state, currentUser.company?.postalCode]
              .filter(Boolean)
              .join(', '),
            currentUser.company?.country,
          ]
            .filter(Boolean)
            .join('\n') || undefined,
        email: currentUser.company?.email || currentUser.email || undefined,
        phone: currentUser.company?.phone || undefined,
      }
    : undefined;

  const clientForPreview = selectedClient
    ? {
        name: selectedClient.contactName || selectedClient.companyName || 'Client',
        companyName: selectedClient.companyName || undefined,
      }
    : undefined;

  const lineItemsForPreview =
    watchedItems?.map((item) => {
      const quantity = Number(item?.quantity) || 0;
      const unitPrice = Number(item?.unitPrice) || 0;
      const taxEnabled = config.enableTax ? !!item?.taxEnabled : false;
      const rate = taxEnabled ? Number(item?.taxRate) || 0 : 0;
      const lineSubtotal = quantity * unitPrice;
      const lineTax = lineSubtotal * (rate / 100);
      return {
        description: item?.description || '',
        quantity,
        rate: unitPrice,
        amount: lineSubtotal + lineTax,
      };
    }) ?? [];

  const totalsForPreview = {
    subtotal: summary.subtotal,
    tax: summary.tax,
    total: summary.total,
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        {toast && (
          <div
            className={`fixed right-6 top-6 z-50 rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
              toast.variant === 'success' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold text-gray-900">{config.title}</h1>
              {config.subtitle && <p className="text-sm text-gray-500">{config.subtitle}</p>}
            </div>
            <Link
              href={config.backHref}
              className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
            >
              ← Back
            </Link>
          </div>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] lg:items-start">
            <form className="space-y-10 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
              <section className="grid gap-6 lg:grid-cols-2">
                <div className="space-y-2">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                    <div className="flex-1">
                      <ClientSelect
                        value={watch('clientId')}
                        onChange={(value) => {
                          setValue('clientId', value, { shouldDirty: true, shouldTouch: true });
                        }}
                        clients={clientOptions}
                        loading={clientsLoading}
                        label="Client"
                        required
                      />
                      {clientsError && <p className="text-xs text-rose-500">{clientsError}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewClient(true)}
                      className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-6 py-2 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm hover:bg-brand-primary-700"
                    >
                      + Add New Client
                    </button>
                  </div>
                  {errors.clientId && <p className="text-xs text-rose-500">{errors.clientId.message}</p>}

                  {config.showTitle && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">
                        Title <span className="text-xs text-zinc-500">(optional)</span>
                      </label>
                      <input
                        type="text"
                        {...register('title')}
                        maxLength={200}
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                        placeholder="Project title or description"
                      />
                      {errors.title && <p className="text-xs text-rose-500">{errors.title.message}</p>}
                    </div>
                  )}

                  {config.showDescription && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Description</label>
                      <textarea
                        {...register('description')}
                        rows={3}
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                        placeholder="Brief overview"
                      />
                    </div>
                  )}

                  {config.showScope && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-zinc-700">Scope of Work</label>
                      <textarea
                        {...register('scope')}
                        rows={5}
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                        placeholder="Deliverables, timeline, etc."
                      />
                    </div>
                  )}
                </div>

                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-zinc-700">Issue Date</label>
                    <input
                      type="date"
                      {...register('issueDate')}
                      min={defaultDates.issueDate}
                      className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    />
                    {errors.issueDate && <p className="text-xs text-rose-500">{errors.issueDate.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-zinc-700">
                      <span>{config.showValidUntil ? 'Valid Until' : 'Due Date'}</span>
                      {!config.showValidUntil && (
                        <>
                          {dueEnabled ? (
                            <button
                              type="button"
                              onClick={() => {
                                setDueEnabled(false);
                                setValue('dueDate', '');
                              }}
                              className="text-xs font-medium text-rose-600 hover:text-rose-700"
                            >
                              No Due Date
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setDueEnabled(true);
                                setValue('dueDate', defaultDates.dueDate);
                              }}
                              className="text-xs font-medium text-purple-600 hover:text-purple-700"
                            >
                              Set due date
                            </button>
                          )}
                        </>
                      )}
                    </div>
                    {config.showValidUntil ? (
                      <input
                        type="date"
                        {...register('validUntil')}
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                      />
                    ) : dueEnabled ? (
                      <input
                        type="date"
                        {...register('dueDate')}
                        min={defaultDates.issueDate}
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                      />
                    ) : (
                      <div className="w-full rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
                        No due date set
                      </div>
                    )}
                    {errors.dueDate && <p className="text-xs text-rose-500">{errors.dueDate.message}</p>}
                  </div>
                </div>
              </section>

              {/* Line Items Section */}
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
                        taxEnabled: false,
                      })
                    }
                    className="inline-flex items-center justify-center rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 shadow-sm transition hover:border-zinc-300 hover:bg-zinc-50"
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
                    const taxEnabled = config.enableTax ? !!item?.taxEnabled : false;
                    const taxRate = taxEnabled ? Number(item?.taxRate) || 0 : 0;
                    const lineSubtotal = quantity * unitPrice;
                    const lineTax = lineSubtotal * (taxRate / 100);
                    const lineTotal = lineSubtotal + lineTax;
                    const taxEnabledField = config.enableTax
                      ? register(`items.${index}.taxEnabled` as const, {
                          onChange: (e) => {
                            if (!e.target.checked) setValue(`items.${index}.taxRate`, 0);
                          },
                        })
                      : undefined;

                    return (
                      <div
                        key={field.id}
                        className="space-y-4 rounded-2xl border border-zinc-200 p-4 shadow-sm"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3">
                            <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                              <GripVertical className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                              Description
                            </label>
                            {config.enableTax && taxEnabledField && (
                              <label className="flex items-center gap-2 text-xs font-medium text-zinc-700">
                                <input
                                  type="checkbox"
                                  {...taxEnabledField}
                                  defaultChecked={taxEnabled}
                                  className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                Enable Tax
                              </label>
                            )}
                          </div>
                          <input
                            type="text"
                            {...register(`items.${index}.description` as const)}
                            defaultValue={field.description}
                            className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                            placeholder="Service, product, consultation, etc."
                          />
                          {itemErrors?.description && (
                            <p className="text-xs text-rose-500">{itemErrors.description.message}</p>
                          )}
                        </div>

                        <div className={`grid gap-4 ${config.enableTax ? 'md:grid-cols-4' : 'md:grid-cols-3'}`}>
                          <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-700">Quantity</label>
                            <input
                              type="number"
                              min={1}
                              step={1}
                              {...register(`items.${index}.quantity` as const, { valueAsNumber: true })}
                              defaultValue={field.quantity ?? ''}
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
                              defaultValue={field.unitPrice ?? ''}
                              className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                            />
                            {itemErrors?.unitPrice && (
                              <p className="text-xs text-rose-500">{itemErrors.unitPrice.message}</p>
                            )}
                          </div>

                          {config.enableTax && (
                            <div className="space-y-2">
                              <label className="text-sm font-medium text-zinc-700">Tax Rate (%)</label>
                              {taxEnabled ? (
                                <input
                                  type="number"
                                  step="0.01"
                                  min={0}
                                  {...register(`items.${index}.taxRate` as const, { valueAsNumber: true })}
                                  defaultValue={field.taxRate ?? ''}
                                  className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                                />
                              ) : (
                                <div className="w-full rounded-xl border border-dashed border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
                                  Tax disabled
                                </div>
                              )}
                            </div>
                          )}

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
                              className="text-sm font-medium text-rose-500 hover:text-rose-600"
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

              {/* Recurring Section (if enabled) */}
              {(config.enableRecurring || config.alwaysRecurring) && (
                <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
                      Recurring invoices
                    </p>
                    {config.enableRecurring && !planLoading && !canUseRecurring && config.upgradeHref && (
                      <Link
                        href={config.upgradeHref}
                        className="text-xs font-semibold text-purple-700 underline hover:text-purple-600"
                      >
                        Upgrade to Pro
                      </Link>
                    )}
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                      <input
                        type="checkbox"
                        {...register('recurringEnabled')}
                        disabled={config.alwaysRecurring || (config.enableRecurring && !canUseRecurring)}
                        checked={config.alwaysRecurring || recurringEnabledWatch}
                        className={`h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500 ${
                          config.alwaysRecurring || (config.enableRecurring && !canUseRecurring)
                            ? 'cursor-not-allowed opacity-50'
                            : ''
                        }`}
                      />
                      Send this invoice automatically every...
                    </label>
                    {recurringEnabledWatch && (
                      <div className="space-y-3 rounded-2xl border border-dashed border-zinc-200 bg-zinc-50 p-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-zinc-600">Interval</label>
                            <select
                              {...register('recurringInterval')}
                              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                            >
                              <option value="day">Day</option>
                              <option value="week">Week</option>
                              <option value="month">Month</option>
                              <option value="quarter">Quarter</option>
                              <option value="year">Year</option>
                            </select>
                          </div>
                          {recurringIntervalWatch !== 'day' && (
                            <div className="space-y-2">
                              <label className="text-xs font-semibold text-zinc-600">
                                {recurringIntervalWatch === 'week' ? 'Day of week' : 'Day of month'}
                              </label>
                              {recurringIntervalWatch === 'week' ? (
                                <select
                                  {...register('recurringDayOfWeek', { valueAsNumber: true })}
                                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                                >
                                  <option value={1}>Monday</option>
                                  <option value={2}>Tuesday</option>
                                  <option value={3}>Wednesday</option>
                                  <option value={4}>Thursday</option>
                                  <option value={5}>Friday</option>
                                  <option value={6}>Saturday</option>
                                  <option value={7}>Sunday</option>
                                </select>
                              ) : (
                                <select
                                  {...register('recurringDayOfMonth', { valueAsNumber: true })}
                                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                                >
                                  {Array.from({ length: 31 }, (_, idx) => idx + 1).map((day) => (
                                    <option key={day} value={day}>
                                      {day}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          )}
                        </div>
                        {nextRecurringPreview && (
                          <p className="text-xs text-zinc-600">Next invoice: {nextPreviewLabel}</p>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Notes and Totals */}
              <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-zinc-700">Notes</label>
                  <textarea
                    rows={5}
                    {...register('notes')}
                    className="w-full rounded-2xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                    placeholder="Terms, payment instructions, or additional information"
                  />
                  {errors.notes && <p className="text-xs text-rose-500">{errors.notes.message}</p>}
                </div>

                <div className="space-y-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-5">
                  <div className="flex items-center justify-between text-sm text-zinc-600">
                    <span>Subtotal</span>
                    <span className="font-medium text-zinc-900">{formatCurrency(summary.subtotal)}</span>
                  </div>
                  {config.enableTax && (
                    <div className="flex items-center justify-between text-sm text-zinc-600">
                      <span>Tax</span>
                      <span className="font-medium text-zinc-900">{formatCurrency(summary.tax)}</span>
                    </div>
                  )}
                  <div className="border-t border-dashed border-zinc-200 pt-4">
                    <div className="flex items-center justify-between text-base font-semibold text-zinc-900">
                      <span>Total</span>
                      <span>{formatCurrency(summary.total)}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 border-t border-zinc-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-zinc-500">All amounts are saved in USD.</p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={isPending || savingStatus !== null}
                    onClick={() => triggerSubmit('DRAFT')}
                    className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-6 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingStatus === 'DRAFT' ? 'Saving...' : 'Save Draft'}
                  </button>
                  <button
                    type="button"
                    disabled={isPending || savingStatus !== null}
                    onClick={() => triggerSubmit(config.type === 'proposal' || config.type === 'contract' ? 'SENT' : 'UNPAID')}
                    className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-6 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:bg-brand-primary-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingStatus ? 'Sending...' : 'Save & Send'}
                  </button>
                </div>
              </div>
            </form>

            {/* Preview */}
            <div className="sticky top-8">
              <DocumentPreview
                type={config.type === 'contract' ? 'contract' : config.type === 'proposal' ? 'proposal' : 'invoice'}
                company={companyForPreview}
                client={clientForPreview}
                lineItems={lineItemsForPreview}
                totals={totalsForPreview}
                documentNumber={undefined}
                issueDate={issueDateWatch ? new Date(issueDateWatch) : undefined}
                dueDate={
                  config.showValidUntil && watch('validUntil')
                    ? new Date(watch('validUntil') + 'T00:00:00')
                    : watchedDueDate
                    ? new Date(watchedDueDate + 'T00:00:00')
                    : undefined
                }
                paymentTerms={watchedNotes || undefined}
                notes={watchedScope || undefined}
                proposalTitle={watchedTitle || undefined}
                proposalDescription={watchedDescription || undefined}
              />
            </div>
          </div>

          {/* Add Client Modal */}
          {showNewClient && (
            <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-black/30 px-4 py-6">
              <div className="w-full max-w-lg rounded-2xl border border-zinc-200 bg-white p-6 shadow-2xl max-h-[calc(100vh-2rem)] overflow-y-auto">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-zinc-900">Create Client</h3>
                  <button
                    type="button"
                    className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 hover:text-zinc-700"
                    onClick={() => setShowNewClient(false)}
                  >
                    Close
                  </button>
                </div>
                <ClientForm
                  onSubmit={handleAddClient}
                  onCancel={() => setShowNewClient(false)}
                  submitLabel="Create client"
                  submitting={addingClient}
                  assignableUsers={assignableUsers}
                  canAssign={canAssignClients}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
