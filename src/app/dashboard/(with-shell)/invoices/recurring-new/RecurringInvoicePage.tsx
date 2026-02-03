"use client";
// src/app/dashboard/(with-shell)/invoices/recurring-new/RecurringInvoicePage.tsx
// Duplicate of new invoice page, but disables unchecking recurring

import { Suspense } from 'react';
import CreateRecurringInvoiceContent from './RecurringInvoiceContent';

export default function RecurringInvoicePage() {
  return (
    <Suspense fallback={<div className="px-4 py-10 text-sm text-zinc-500">Loading recurring invoice...</div>}>
      <CreateRecurringInvoiceContent />
    </Suspense>
  );
}
import { useEffect, useMemo, useState, useTransition } from 'react';
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
} from '../new/actions';
import { GripVertical } from 'lucide-react';
import { ClientForm, type ClientFormValues } from '@/components/ClientForm';
import DocumentPreview from '@/components/invoicing/DocumentPreview';
import { useClientOptions } from '@/components/invoicing/useClientOptions';
import { ClientSelect } from '@/components/invoicing/ClientSelect';



