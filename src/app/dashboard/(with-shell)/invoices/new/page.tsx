'use client';

import { Suspense, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import type { InvoiceStatus } from '@prisma/client';
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer';
import {
  createInvoiceAction,
  createRecurringInvoiceAction,
  type ClientOption,
} from './actions';
import { GripVertical } from 'lucide-react';
import { ClientForm, type ClientFormValues } from '@/components/ClientForm';
import DocumentPreview from '@/components/invoicing/DocumentPreview';
import { useClientOptions } from '@/components/invoicing/useClientOptions';
import { ClientSelect } from '@/components/invoicing/ClientSelect';

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Unit price must be 0 or greater'),
  taxRate: z.number().min(0, 'Tax rate must be 0 or greater').optional(),
  taxEnabled: z.boolean().optional(),
});

const invoiceSchema = z
  .object({
    clientId: z.string().min(1, 'Client is required'),
    issueDate: z.string().min(1, 'Issue date is required'),
    dueDate: z.string().optional(),
    notes: z
      .string()
      .max(1000, 'Notes must be under 1000 characters')
      .optional()
      .or(z.literal('')),
    recurringEnabled: z.boolean().optional(),
    recurringInterval: z
      .enum(['day', 'week', 'month', 'quarter', 'year'])
      .optional(),
    recurringDayOfMonth: z
      .number()
      .int()
      .min(1, 'Day of month must be between 1 and 31')
      .max(31, 'Day of month must be between 1 and 31')
      .optional(),
    recurringDayOfWeek: z
      .number()
      .int()
      .min(1, 'Day of week must be between 1 and 7')
      .max(7, 'Day of week must be between 1 and 7')
      .optional(),
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

type ExistingInvoiceState = {
  status: string;
  recurring: boolean;
  nextOccurrence?: string | null;
  recurringParentId?: string | null;
};

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
  const { clients: loadedClients, loading: clientsLoading, error: clientsError } = useClientOptions();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [isPending, startTransition] = useTransition();
  const [savingStatus, setSavingStatus] = useState<InvoiceStatus | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [dueEnabled, setDueEnabled] = useState(true);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [planTier, setPlanTier] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(true);
  const [assignableUsers, setAssignableUsers] = useState<AssignableUserOption[]>([]);
  const [canAssignClients, setCanAssignClients] = useState(false);
  const [currentUser, setCurrentUser] = useState<any | null>(null);
  const [existingInvoice, setExistingInvoice] = useState<ExistingInvoiceState | null>(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [addingClient, setAddingClient] = useState(false);
  const [sendFirstNow, setSendFirstNow] = useState(true);
  const [hasMounted, setHasMounted] = useState(false);
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
    const format = (date: Date) => date.toISOString().split('T')[0];
    return {
      issueDate: format(today),
      dueDate: format(dueDate),
    };
  }, []);
  const defaultRecurringDay = useMemo(() => {
    const date = new Date(defaultDates.issueDate);
    return date.getDate();
  }, [defaultDates.issueDate]);
  const recurringUpgradeHref = '/payment?mode=subscription';
  const recurringParam = searchParams.get('recurring') === 'true';

  const {
    control,
    register,
    getValues,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: '',
      issueDate: defaultDates.issueDate,
      dueDate: defaultDates.dueDate,
      notes: '',
      recurringEnabled: false,
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
        // Only owners/admins can assign; otherwise force unassigned
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
      const option: ClientOption = {
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
    setHasMounted(true);
  }, []);

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
              if (!isMounted) return;
              setAssignableUsers(payload.members ?? []);
            })
            .catch(() => {
              if (isMounted) setAssignableUsers([]);
            });
        }
      })
      .catch(() => {
        if (isMounted) {
          setPlanTier(null);
        }
      })
      .finally(() => {
        if (isMounted) {
          setPlanLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (recurringParam) {
      setValue('recurringEnabled', true);
    }
  }, [recurringParam, setValue]);

  useEffect(() => {
    if (!editId) {
      setExistingInvoice(null);
      return;
    }
    setIsGeneratingPdf(true);
    fetch(`/api/invoices/${editId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        reset({
          clientId: data.clientId,
          issueDate: data.issueDate ? data.issueDate.split('T')[0] : defaultDates.issueDate,
          dueDate: data.dueDate ? data.dueDate.split('T')[0] : '',
          notes: data.notes || '',
          recurringEnabled: Boolean(data.recurring),
          recurringInterval: data.recurringInterval ?? 'month',
          recurringDayOfMonth:
            data.recurringDayOfMonth ??
            new Date(data.issueDate ?? defaultDates.issueDate).getDate(),
          recurringDayOfWeek: data.recurringDayOfWeek ?? 1,
          items: data.items.map((item: any) => ({
            description: item.description || item.name || '',
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unitPrice) || 0,
            taxRate: Number(item.taxRate) || 0,
            taxEnabled: Number(item.taxRate) > 0,
          })),
        });
        setDueEnabled(Boolean(data.dueDate));
        setExistingInvoice({
          status: data.status,
          recurring: Boolean(data.recurring),
          nextOccurrence: data.nextOccurrence ?? null,
          recurringParentId: data.recurringParentId ?? null,
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
  const watchedDueDate = useWatch<InvoiceFormValues, 'dueDate'>({
    control,
    name: 'dueDate',
  });
  const recurringEnabledWatch = useWatch<InvoiceFormValues, 'recurringEnabled'>({
    control,
    name: 'recurringEnabled',
  });
  const recurringIntervalWatch = useWatch<InvoiceFormValues, 'recurringInterval'>({
    control,
    name: 'recurringInterval',
  });
  const recurringDayOfMonthWatch = useWatch<InvoiceFormValues, 'recurringDayOfMonth'>({
    control,
    name: 'recurringDayOfMonth',
  });
  const recurringDayOfWeekWatch = useWatch<InvoiceFormValues, 'recurringDayOfWeek'>({
    control,
    name: 'recurringDayOfWeek',
  });
  const issueDateWatch = useWatch<InvoiceFormValues, 'issueDate'>({
    control,
    name: 'issueDate',
  });
  const canUseRecurring = planTier === 'PRO' || planTier === 'PRO_TRIAL';
  const nextRecurringPreview = useMemo(() => {
    if (!canUseRecurring || !recurringEnabledWatch) {
      return null;
    }
    return calculateNextRecurringDate(
      issueDateWatch,
      recurringIntervalWatch ?? 'month',
      recurringDayOfMonthWatch ?? 1,
      recurringDayOfWeekWatch ?? 1
    );
  }, [
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
    const isRecurring = Boolean(recurringEnabledWatch && (recurringParam || canUseRecurring));
    const todayLabel = formatPreviewDate(new Date());
    const nextPreviewLabel = formatPreviewDate(nextRecurringPreview);
  useEffect(() => {
    if (!recurringEnabledWatch) {
      setSendFirstNow(true);
    }
  }, [recurringEnabledWatch]);

  const handlePauseRecurring = () => {
    setValue('recurringEnabled', false);
    setExistingInvoice((prev) => (prev ? { ...prev, recurring: false } : prev));
    setToast({ message: 'Recurring invoices paused', variant: 'success' });
  };

  const handleCancelRecurring = async () => {
    if (existingInvoice?.recurringParentId) {
      try {
        const res = await fetch(`/api/recurring/${existingInvoice.recurringParentId}/cancel`, {
          method: 'POST',
        });
        if (!res.ok) {
          const payload = await res.json().catch(() => null);
          throw new Error(payload?.error || 'Failed to cancel recurring invoice');
        }
      } catch (error: any) {
        setToast({ message: error?.message ?? 'Failed to cancel recurring invoice', variant: 'error' });
        return;
      }
    }
    setValue('recurringEnabled', false);
    setValue('recurringInterval', 'month');
    setValue('recurringDayOfMonth', 1);
    setValue('recurringDayOfWeek', 1);
    setExistingInvoice((prev) => (prev ? { ...prev, recurring: false } : prev));
    setToast({ message: 'Recurring invoices canceled', variant: 'success' });
  };

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
        const taxEnabled = !!item?.taxEnabled;
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
          const taxEnabled = !!item.taxEnabled;
          const rate = taxEnabled ? Number(item.taxRate) || 0 : 0;
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
                Issued {values.issueDate || 'N/A'}
                {values.dueDate ? ` - Due ${values.dueDate}` : ''}
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
                const taxEnabled = !!item.taxEnabled;
                const rate = taxEnabled ? Number(item.taxRate) || 0 : 0;
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
    if (isPending || savingStatus) return;
    setSavingStatus(status);

    handleSubmit((values) => {
      const normalizedValues = {
        ...values,
        dueDate: dueEnabled && values.dueDate ? values.dueDate : null,
        items:
          values.items?.map((item) => ({
            description: item.description,
            quantity: Number(item.quantity) || 0,
            unitPrice: Number(item.unitPrice) || 0,
            taxRate: item.taxEnabled ? Number(item.taxRate) || 0 : 0,
          })) || [],
      };

      const recurrenceEnabled = canUseRecurring && Boolean(values.recurringEnabled);
      const nextRecurrenceDate = recurrenceEnabled
        ? calculateNextRecurringDate(
            values.issueDate,
            values.recurringInterval,
            values.recurringDayOfMonth,
            values.recurringDayOfWeek
          )
        : null;
      const usesDayOfMonth = values.recurringInterval !== 'week' && values.recurringInterval !== 'day';
      const usesDayOfWeek = values.recurringInterval === 'week';

      const recurrencePayload = {
        recurring: recurrenceEnabled,
        recurringInterval: recurrenceEnabled ? values.recurringInterval ?? 'month' : null,
        recurringDayOfMonth:
          recurrenceEnabled && usesDayOfMonth
            ? Number(values.recurringDayOfMonth ?? 1)
            : null,
        recurringDayOfWeek:
          recurrenceEnabled && usesDayOfWeek
            ? Number(values.recurringDayOfWeek ?? 1)
            : null,
        nextOccurrence: nextRecurrenceDate ? nextRecurrenceDate.toISOString() : null,
      };
        const payloadWithRecurring = {
          ...normalizedValues,
          ...recurrencePayload,
        };

      startTransition(() => {
          if (status === 'SENT') {
              fetch('/api/invoices', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payloadWithRecurring, status }),
              })
                  .then(async (res) => {
                    if (!res.ok) throw new Error(await res.text());
                    const result = await res.json();
                  setToast({
                    message: `Invoice ${result.invoiceNumber} sent successfully`,
                    variant: 'success',
                  });
                window.setTimeout(() => {
                  router.push('/dashboard/invoices');
                }, 800);
              })
              .catch((error) => {
                console.error(error);
                setToast({
                  message: 'Something went wrong while sending the invoice.',
                  variant: 'error',
                });
              })
              .finally(() => setSavingStatus(null));
          } else {
          const action = isEdit
            ? fetch(`/api/invoices/${editId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...payloadWithRecurring, status }),
              }).then(async (res) => {
                if (!res.ok) throw new Error(await res.text());
                return res.json();
              })
            : createInvoiceAction({ ...payloadWithRecurring, status });

              action
                .then(async (result: any) => {
                  setToast({
                    message: isEdit ? `Draft ${result.invoiceNumber} updated` : `Draft ${result.invoiceNumber} saved`,
                    variant: 'success',
                  });

                window.setTimeout(() => {
                  router.push('/dashboard/invoices');
                }, 800);
              })
              .catch((error: any) => {
                console.error(error);
                setToast({
                  message: 'Something went wrong while saving the invoice.',
                  variant: 'error',
                });
              })
              .finally(() => setSavingStatus(null));
          }
        });
    })();
  };

  const selectedClient = clientOptions.find((c) => c.id === getValues('clientId'));

  const companyForPreview = currentUser
    ? {
        name:
          currentUser.company?.name ||
          currentUser.companyName ||
          currentUser.name ||
          'Your Company',
        logoUrl: currentUser.company?.logoUrl || undefined,
        address:
          [
            currentUser.company?.addressLine1,
            currentUser.company?.addressLine2,
            [
              currentUser.company?.city,
              currentUser.company?.state,
              currentUser.company?.postalCode,
            ]
              .filter(Boolean)
              .join(', '),
            currentUser.company?.country,
          ]
            .filter(Boolean)
            .join('\n') || undefined,
        email: currentUser.email || undefined,
        phone: currentUser.phone || undefined,
      }
    : undefined;

  const clientForPreview = selectedClient
    ? {
        name: selectedClient.contactName || selectedClient.companyName || 'Client',
        companyName: selectedClient.companyName || undefined,
      }
    : undefined;

  const lineItemsForPreview = watchedItems?.map((item) => {
    const quantity = Number(item?.quantity) || 0;
    const unitPrice = Number(item?.unitPrice) || 0;
    const taxEnabled = !!item?.taxEnabled;
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
              <h1 className="text-3xl font-semibold text-gray-900">{isEdit ? 'Edit Invoice' : 'Create Invoice'}</h1>
              <p className="text-sm text-gray-500">
                {isEdit
                  ? 'Update your draft or send it when ready.'
                  : 'Select a client, add line items, and save your work as a draft or send the invoice immediately.'}
              </p>
            </div>
          </div>



          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr),minmax(0,1fr)] lg:items-start">
          <form className="space-y-10 rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm new-invoice-form">
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
              <div className="flex-1">
                <ClientSelect
                  value={watch('clientId')}
                  onChange={(value, client) => {
                    setValue('clientId', value, { shouldDirty: true, shouldTouch: true });
                    if (client) {
                      setToast(null);
                    }
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
                  className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-6 py-2 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)]"
                >
                  + Add New Client
                </button>
            </div>
              {errors.clientId && <p className="text-xs text-rose-500">{errors.clientId.message}</p>}
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
                  <span>Due Date</span>
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
                </div>
                {dueEnabled ? (
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
                const taxEnabled = !!item?.taxEnabled;
                const taxRate = taxEnabled ? Number(item?.taxRate) || 0 : 0;
                const lineSubtotal = quantity * unitPrice;
                const lineTax = lineSubtotal * (taxRate / 100);
                const lineTotal = lineSubtotal + lineTax;
                const taxEnabledField = register(`items.${index}.taxEnabled` as const, {
                  onChange: (e) => {
                    if (!e.target.checked) setValue(`items.${index}.taxRate`, 0);
                  },
                });

                return (
                  <div
                    key={field.id}
                    className="space-y-4 rounded-2xl border border-zinc-200 p-4 shadow-sm cursor-grab active:cursor-grabbing transition"
                    draggable
                    onDragStart={(e) => {
                      setDragIndex(index);
                      e.dataTransfer?.setData('text/plain', String(index));
                      // hide default ghost for a cleaner drag feel
                      const img = new Image();
                      img.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
                      e.dataTransfer?.setDragImage(img, 0, 0);
                      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const from = Number(e.dataTransfer?.getData('text/plain'));
                      if (Number.isNaN(from) || from === index) {
                        setDragIndex(null);
                        return;
                      }
                      move(from, index);
                      setDragIndex(null);
                    }}
                    onDragEnd={() => setDragIndex(null)}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <label className="flex items-center gap-2 text-sm font-medium text-zinc-700">
                          <GripVertical className="h-4 w-4 text-zinc-400" aria-hidden="true" />
                          Description
                        </label>
                        <label className="flex items-center gap-2 text-xs font-medium text-zinc-700">
                          <input
                            type="checkbox"
                            {...taxEnabledField}
                            defaultChecked={taxEnabled}
                            className="h-4 w-4 rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          Enable Tax
                        </label>
                      </div>
                      <input
                        type="text"
                        {...register(`items.${index}.description` as const)}
                        defaultValue={field.description}
                        className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900/10"
                        placeholder="Consultation, Service, Product etc."
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

          <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white/80 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Recurring invoices</p>
              {!planLoading && !canUseRecurring && (
                <Link href={recurringUpgradeHref} className="text-xs font-semibold text-purple-700 underline hover:text-purple-600">
                  Upgrade to Pro
                </Link>
              )}
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-zinc-800">
                  <input
                    type="checkbox"
                    {...register('recurringEnabled')}
                    disabled={!canUseRecurring}
                    className={`h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500 ${
                      !canUseRecurring ? 'cursor-not-allowed opacity-50' : ''
                    }`}
                  />
                Send this invoice automatically every...
              </label>
              {recurringEnabledWatch && canUseRecurring && (
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
                    <p className="text-xs text-zinc-600">
                      Next invoice: {nextRecurringPreview.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                  {isRecurring && (
                    <div className="mt-5 rounded-lg bg-purple-50 p-4">
                      <p className="text-sm font-medium text-purple-900 mb-3">First invoice</p>
                      <div className="flex flex-wrap items-center gap-4">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="firstSend"
                            checked={sendFirstNow}
                            onChange={() => setSendFirstNow(true)}
                            className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span>Send today</span>
                        </label>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="firstSend"
                            checked={!sendFirstNow}
                            onChange={() => setSendFirstNow(false)}
                            className="h-4 w-4 rounded border-zinc-300 text-purple-600 focus:ring-purple-500"
                          />
                          <span>Start on next scheduled date</span>
                        </label>
                      </div>
                      <p className="mt-3 text-xs text-purple-700">
                        {sendFirstNow
                          ? `First invoice will be sent today (${todayLabel})`
                          : nextPreviewLabel
                          ? `First invoice will be sent on ${nextPreviewLabel}`
                          : 'First invoice will follow the first scheduled date.'}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            {!planLoading && !canUseRecurring && (
              <p className="text-xs text-purple-700">
                Upgrade to Pro to schedule recurring invoices.{' '}
                <Link href={recurringUpgradeHref} className="font-semibold underline">
                  Upgrade now
                </Link>
              </p>
            )}
            {isEdit && existingInvoice?.recurring && (
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={handlePauseRecurring}
                  className="inline-flex items-center justify-center rounded-lg border border-purple-200 px-4 py-2 text-xs font-semibold text-purple-700 shadow-sm transition hover:bg-purple-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500"
                >
                  Pause recurring
                </button>
                <button
                  type="button"
                  onClick={handleCancelRecurring}
                  className="inline-flex items-center justify-center rounded-lg border border-zinc-200 px-4 py-2 text-xs font-semibold text-zinc-700 shadow-sm transition hover:bg-zinc-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-500"
                >
                  Cancel recurring
                </button>
              </div>
            )}
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

          <div className="mt-6">
            <DocumentPreview
              type="invoice"
              company={companyForPreview}
              client={clientForPreview}
              lineItems={lineItemsForPreview}
              totals={totalsForPreview}
              documentNumber={undefined}
              issueDate={issueDateWatch ? new Date(issueDateWatch) : undefined}
              dueDate={watchedDueDate ? new Date(watchedDueDate) : undefined}
              paymentTerms={getValues('notes') || undefined}
            />
          </div>
          <div className="flex flex-col gap-3 border-t border-zinc-100 pt-0 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-zinc-500">
              All amounts are saved in USD.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={handleSavePdf}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-6 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isGeneratingPdf ? 'Generating...' : 'Download PDF'}
                </button>
                <button
                  type="button"
                  disabled={isPending || savingStatus !== null}
                  onClick={() => triggerSubmit('DRAFT')}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-6 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingStatus === 'DRAFT' ? 'Saving...' : 'Save Draft'}
                </button>
                <button
                  type="button"
                  disabled={isPending || savingStatus !== null}
                  onClick={() => triggerSubmit('SENT')}
                  className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-6 py-3 text-sm font-semibold text-[var(--color-brand-contrast)] shadow-sm transition hover:bg-brand-primary-700 hover:text-[var(--color-brand-contrast)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {savingStatus === 'SENT' ? 'Sending...' : 'Save & Send Invoice'}
                </button>
            </div>
          </div>
        </form>
      </div>
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
