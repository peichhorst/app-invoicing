import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { sendInvoiceEmail } from '@/lib/email';
import type { Prisma } from '@prisma/client';

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  if (!isOwnerOrAdmin) {
    return NextResponse.json({ error: 'Only owners/admins can mark proposals as complete' }, { status: 403 });
  }

  const { id } = await params;
  const companyId = user.companyId ?? user.company?.id ?? null;

  const proposal = await prisma.proposal.findFirst({
    where: {
      id,
      user: { companyId: companyId ?? undefined },
    },
    include: {
      client: true,
      user: { include: { company: true } },
    },
  });

  if (!proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (proposal.status !== 'SIGNED') {
    return NextResponse.json({ error: 'Proposal must be signed before completing' }, { status: 400 });
  }

  if (proposal.invoiceId) {
    return NextResponse.json({ error: 'Invoice already generated for this proposal' }, { status: 400 });
  }

  // Get the last invoice number for this user
  const lastInvoice = await prisma.invoice.findFirst({
    where: { userId: proposal.userId },
    orderBy: { createdAt: 'desc' },
    select: { invoiceNumber: true },
  });
  const nextNumber = (lastInvoice ? Number(lastInvoice.invoiceNumber) || 0 : 0) + 1;
  const invoiceNumber = nextNumber.toString();

  // Parse line items from proposal
  const lineItems = Array.isArray(proposal.lineItems) ? proposal.lineItems : [];
  const itemsForCreate = lineItems.map((item: any) => ({
    name: item.description || item.name || 'Item',
    description: item.description || '',
    quantity: Number(item.quantity) || 1,
    unitPrice: Number(item.rate) || Number(item.unitPrice) || 0,
    taxRate: 0,
    total: Number(item.amount) || Number(item.total) || 0,
  }));

  const now = new Date();
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + 30); // 30 day payment terms

  // Create invoice and update proposal in transaction
  const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const invoice = await tx.invoice.create({
      data: {
        userId: proposal.userId,
        clientId: proposal.clientId,
        invoiceNumber,
        title: proposal.title,
        issueDate: now,
        dueDate,
        status: 'UNPAID',
        sentCount: 1,
        currency: proposal.currency,
        subTotal: Number(proposal.total),
        taxRate: 0,
        taxAmount: 0,
        total: Number(proposal.total),
        notes: proposal.notes,
        items: {
          create: itemsForCreate,
        },
      },
      include: {
        client: true,
        items: true,
        user: { include: { company: true } },
      },
    });

    const updatedProposal = await tx.proposal.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedAt: now,
        invoiceId: invoice.id,
      },
    });

    return { invoice, proposal: updatedProposal };
  });

  // Send invoice email
  const dueDays = 30;
  const emailInvoice = {
    ...result.invoice,
    dueDays,
    items: result.invoice.items.map((item: typeof result.invoice.items[0]) => ({
      ...item,
      amount: item.total ?? Number(item.unitPrice) * Number(item.quantity),
    })),
  };

  await sendInvoiceEmail(emailInvoice, result.invoice.client, result.invoice.user).catch((err) => {
    console.error('Failed to send invoice email:', err);
  });

  return NextResponse.json({
    ok: true,
    invoiceId: result.invoice.id,
    invoiceNumber: result.invoice.invoiceNumber,
  });
}
