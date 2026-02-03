import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { InvoiceStatus } from '@prisma/client';

function escapeCsv(value: unknown) {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'string' ? value : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return '';
  return new Date(value).toISOString();
};

const PAID_STATUSES: InvoiceStatus[] = [InvoiceStatus.PAID];
const UNPAID_STATUSES: InvoiceStatus[] = [InvoiceStatus.UNPAID, InvoiceStatus.VIEWED, InvoiceStatus.OVERDUE];

const getStatusesForFilter = (filter?: string | null): InvoiceStatus[] | null => {
  if (filter === 'paid') return PAID_STATUSES;
  if (filter === 'sent') return UNPAID_STATUSES;
  return null;
};

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const url = new URL(request.url);
  const requestedFilter = url.searchParams.get('filter');
  const statuses = getStatusesForFilter(requestedFilter);
  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const companyId = user.companyId ?? user.company?.id ?? null;

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(isOwnerOrAdmin
        ? { user: { companyId: companyId ?? undefined } }
        : { userId: user.id }),
      ...(statuses ? { status: { in: statuses } } : {}),
    },
    include: {
      client: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  const header = [
    'Invoice number',
    'Status',
    'Client company',
    'Client contact',
    'Client email',
    'Issue date',
    'Due date',
    'Sent count',
    'Amount',
    'Currency',
    'Tax rate',
    'Notes',
    'Short code',
    'Created at',
    'Updated at',
  ];

  const rows = invoices.map((invoice: any) => {
    const total = typeof invoice.total === 'number' ? invoice.total : 0;
    return [
      invoice.invoiceNumber,
      invoice.status,
      invoice.client?.companyName,
      invoice.client?.contactName,
      invoice.client?.email,
      formatDate(invoice.issueDate),
      formatDate(invoice.dueDate),
      invoice.sentCount ?? 0,
      total.toFixed(2),
      invoice.currency,
      invoice.taxRate ?? '',
      invoice.notes,
      invoice.shortCode,
      formatDate(invoice.createdAt),
      formatDate(invoice.updatedAt),
    ]
      .map(escapeCsv)
      .join(',');
  });

  const csv = [header.map(escapeCsv).join(','), ...rows].join('\n');
  const filename = `invoices-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
