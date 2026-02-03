import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isOwnerOrAdmin = user.role === 'OWNER' || user.role === 'ADMIN';
  const companyId = user.companyId ?? user.company?.id;

  // Build the where clause
  const where = {
    status: 'PAID' as const,
    ...(isOwnerOrAdmin
      ? { user: { companyId } } // All paid invoices in the company
      : { userId: user.id }), // Only user's own paid invoices
  };

  try {
    const [count, lastPaid, lastChanged] = await Promise.all([
      prisma.invoice.count({ where }),
      prisma.invoice.findFirst({
        where,
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          updatedAt: true,
          client: {
            select: {
              companyName: true,
              contactName: true,
            },
          },
        },
      }),
      prisma.invoice.findFirst({
        where: isOwnerOrAdmin ? { user: { companyId } } : { userId: user.id },
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          updatedAt: true,
          client: {
            select: {
              companyName: true,
              contactName: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      paidCount: count,
      lastPaid: lastPaid
        ? {
            id: lastPaid.id,
            invoiceNumber: lastPaid.invoiceNumber,
            clientName:
              lastPaid.client?.companyName ||
              lastPaid.client?.contactName ||
              null,
            timestamp: lastPaid.updatedAt.getTime(),
          }
        : null,
      lastChanged: lastChanged
        ? {
            id: lastChanged.id,
            invoiceNumber: lastChanged.invoiceNumber,
            clientName:
              lastChanged.client?.companyName ||
              lastChanged.client?.contactName ||
              null,
            status: lastChanged.status,
            timestamp: lastChanged.updatedAt.getTime(),
          }
        : null,
    });
  } catch (error) {
    console.error('Error fetching paid invoice status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
