// src/app/api/invoices/[id]/resend/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';
import type { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { generateUniqueShortCode } from '@/lib/shortcodes';

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ResendMode = 'original' | 'reminder';

const normalizeMode = (value: unknown): ResendMode => {
  if (typeof value !== 'string') return 'original';
  return value.trim().toLowerCase() === 'reminder' ? 'reminder' : 'original';
};

async function resendInvoice(req: Request, params: RouteContext['params']) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing invoice id' }, { status: 400 });
    }

    const existing = await prisma.invoice.findUnique({
      where: { id },
      include: {
        client: true,
        items: true,
        user: { include: { company: true } },
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const viewerRole = user.role ?? 'USER';
    const isSuperAdmin = viewerRole === 'SUPERADMIN';
    const isOwnerOrAdmin = viewerRole === 'OWNER' || viewerRole === 'ADMIN';
    const sameCompany =
      Boolean(user.companyId) &&
      Boolean(existing.user?.companyId) &&
      user.companyId === existing.user.companyId;
    const ownsInvoice = existing.userId === user.id;
    if (!isSuperAdmin && !(isOwnerOrAdmin && sameCompany) && !ownsInvoice) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const requestUrl = new URL(req.url);
    let mode: ResendMode = normalizeMode(requestUrl.searchParams.get('mode'));
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      mode = normalizeMode(body?.mode ?? mode);
    }

    const shortCode = existing.shortCode || (await generateUniqueShortCode(prisma));

    const invoice = (await prisma.invoice.update({
      where: { id },
      data: {
        sentCount: (existing.sentCount || 0) + 1,
        status: existing.status === 'PAID' ? 'PAID' : 'OPEN',
        shortCode,
      },
      include: {
        client: true,
        items: true,
        user: { include: { company: true } },
      },
    })) as Prisma.InvoiceGetPayload<{
      include: { client: true; items: true; user: { include: { company: true } } };
    }>;

    const dueDays =
      invoice.dueDate != null && invoice.issueDate != null
        ? Math.max(
            0,
            Math.round(
              (new Date(invoice.dueDate).getTime() - new Date(invoice.issueDate).getTime()) /
                (1000 * 60 * 60 * 24)
            )
          )
        : 0;

    const emailInvoice = {
      ...invoice,
      dueDays,
      items: invoice.items.map((item) => ({
        ...item,
        amount: item.total ?? Number(item.unitPrice) * Number(item.quantity),
      })),
    };

    if (mode === 'reminder') {
      await sendInvoiceEmail(emailInvoice, invoice.client, invoice.user, {
        reminderSubject: `Reminder: Invoice #${invoice.invoiceNumber}`,
        reminderNotice: 'This is a friendly reminder to review your invoice.',
      });
    } else {
      await sendInvoiceEmail(emailInvoice, invoice.client, invoice.user);
    }

    return NextResponse.json({ success: true, mode });
  } catch (error: any) {
    console.error('Resend invoice failed:', error);
    return NextResponse.json(
      { error: 'Failed to resend invoice', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function GET(req: Request, { params }: RouteContext) {
  return resendInvoice(req, params);
}

export async function POST(req: Request, { params }: RouteContext) {
  return resendInvoice(req, params);
}
