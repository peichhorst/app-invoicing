// src/app/api/invoices/[id]/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendInvoiceEmail } from '@/lib/email';
import type { Prisma } from '@prisma/client';
import { getCurrentUser } from '@/lib/auth';
import { withAuth, getScopedDb, AuthenticatedUser } from '@/lib/auth-filters';
import { generateUniqueShortCode } from '@/lib/shortcodes';

async function getInvoiceHandler(user: AuthenticatedUser, id: string) {
  // For invoice access, users can only access their own invoices
  const invoice = await prisma.invoice.findUnique({
    where: { 
      id,
      userId: user.id  // Users can only access their own invoices
    },
    include: {
      client: true,
      items: true,
      user: { include: { company: true } },
    },
  });
  
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
  }
  
  return NextResponse.json(invoice);
}

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { id } = await params;
  return getInvoiceHandler(user, id);
}

async function updateInvoiceHandler(request: Request, user: AuthenticatedUser, id: string) {
  try {
    const body = await request.json();

    type InvoiceItemCreatePayload = {
      name: string;
      description: string;
      quantity: number;
      unitPrice: number;
      taxRate: number;
      total: number;
    };

    const itemsInput = Array.isArray(body.items) ? body.items : [];

    const itemsForCreate: InvoiceItemCreatePayload[] = itemsInput.map((item: any) => {
      const quantity = Number(item.quantity ?? 1) || 1;
      const unitPrice = Number(item.unitPrice ?? 0) || 0;
      const taxRate = 0; // tax disabled for now
      const lineSubtotal = quantity * unitPrice;
      return {
        name: item.name ?? item.description ?? 'Item',
        description: item.description ?? item.name ?? '',
        quantity,
        unitPrice,
        taxRate,
        total: lineSubtotal,
      };
    });

    const totals = itemsForCreate.reduce<{ subTotal: number }>(
      (acc, item) => {
        const lineSubtotal = Number(item.quantity) * Number(item.unitPrice);
        acc.subTotal += lineSubtotal;
        return acc;
      },
      { subTotal: 0 }
    );
    const total = totals.subTotal;

    // Verify the user can access this invoice
    const existing = await prisma.invoice.findUnique({
      where: { 
        id,
        userId: user.id  // Users can only access their own invoices
      },
    });
    
    if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const shortCode = existing.shortCode || (await generateUniqueShortCode(prisma));

    const requestedStatus = body.status as any;
    const nextStatus =
      existing.status !== 'DRAFT' && requestedStatus === 'DRAFT'
        ? existing.status
        : (requestedStatus ?? existing.status);

    const nextSentCount =
      requestedStatus === 'UNPAID' ? (existing.sentCount ?? 0) + 1 : existing.sentCount ?? 0;

    const updated = (await prisma.invoice.update({
      where: { 
        id,
        userId: user.id  // Ensure user can only update their own invoices
      },
      data: {
        title: body.title?.trim() ? body.title.trim() : null,
        issueDate: body.issueDate ? new Date(body.issueDate) : undefined,
        dueDate: body.dueDate === null ? null : body.dueDate ? new Date(body.dueDate) : undefined,
        notes: body.notes?.trim() ? body.notes.trim() : null,
        recurring: body.recurring ?? false,
        recurringInterval: body.recurringInterval ?? null,
        recurringDayOfMonth: body.recurringDayOfMonth ?? null,
        recurringDayOfWeek: body.recurringDayOfWeek ?? null,
        nextOccurrence: body.nextOccurrence ? new Date(body.nextOccurrence) : null,
        status: nextStatus,
        sentCount: nextSentCount,
        shortCode,
        subTotal: totals.subTotal,
        taxRate: 0,
        taxAmount: 0,
        total,
        items: {
          deleteMany: {},
          create: itemsForCreate,
        },
      },
      include: {
        client: true,
        items: true,
        user: { include: { company: true } },
      },
    })) as Prisma.InvoiceGetPayload<{
      include: { client: true; items: true; user: { include: { company: true } } };
    }>;

    if (requestedStatus === 'UNPAID') {
      const dueDays =
        updated.dueDate != null
          ? Math.max(
              0,
              Math.round(
                (new Date(updated.dueDate).getTime() - new Date(updated.issueDate).getTime()) / (1000 * 60 * 60 * 24)
              )
            )
          : 0;

      const emailInvoice = {
        ...updated,
        dueDays,
        items: updated.items.map((item) => ({
          ...item,
          amount: item.total ?? Number(item.unitPrice) * Number(item.quantity),
        })),
      };
      await sendInvoiceEmail(emailInvoice, updated.client, updated.user);
    }
    
    // Generate and store PDF if status is changing to SENT or UNPAID and no PDF exists yet
    if ((requestedStatus === 'SENT' || requestedStatus === 'UNPAID') && !updated.pdfUrl) {
      // Import needed modules locally to avoid circular dependencies
      const { InvoicePDF } = await import('@/components/InvoicePDF');
      const { renderToBuffer } = await import('@react-pdf/renderer');
      const { uploadToCloudinary, generatePublicId } = await import('@/lib/cloudinary');
      const React = await import('react');
      
      // Generate PDF
      const pdfElement = React.createElement(InvoicePDF as any, { 
        invoice: updated, 
        client: updated.client, 
        user: updated.user 
      });
      
      const pdfBuffer = await renderToBuffer(pdfElement as any);
      
      // Generate a unique public ID for Cloudinary
      const publicId = generatePublicId('invoice', updated.id);
      
      try {
        // Upload to Cloudinary
        const result = await uploadToCloudinary(pdfBuffer, publicId, 'raw');
        const pdfUrl = result.secure_url;
        
        // Update the invoice with the PDF URL
        await prisma.invoice.update({
          where: { id: updated.id },
          data: { pdfUrl }
        });
        
        // Refresh the updated invoice to include the pdfUrl
        const refreshedInvoice = await prisma.invoice.findUnique({
          where: { id: updated.id },
          include: {
            client: true,
            items: true,
            user: { include: { company: true } },
          }
        });
        
        return NextResponse.json(refreshedInvoice);
      } catch (error) {
        console.error('PDF upload failed:', error);
        // Still return the updated invoice even if PDF upload fails
        return NextResponse.json(updated);
      }
    }

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update invoice failed:', error);
    return NextResponse.json({ error: 'Failed to update invoice', details: error?.message || String(error) }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { id } = await params;
  return updateInvoiceHandler(request, user, id);
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  
  const { id } = await params;
  
  try {
    // Verify the user can access this invoice
    const existing = await prisma.invoice.findUnique({
      where: { 
        id,
        userId: user.id  // Users can only access their own invoices
      },
    });
    
    if (!existing) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    
    await prisma.invoice.delete({ 
      where: { 
        id,
        userId: user.id  // Ensure user can only delete their own invoices
      } 
    });
    
    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error('Delete invoice failed:', error);
    return NextResponse.json({ error: 'Failed to delete invoice', details: error?.message || String(error) }, { status: 500 });
  }
}