import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the contract
    const contract = await prisma.contract.findUnique({
      where: { id },
      include: { 
        client: true,
        proposal: true,
      },
    });

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    if (contract.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (contract.status !== 'signed') {
      return NextResponse.json(
        { error: 'Only signed contracts can be converted to invoices' },
        { status: 400 }
      );
    }

    // Get the next invoice number for this user
    const lastInvoice = await prisma.invoice.findFirst({
      where: { userId: user.id },
      orderBy: { invoiceNumber: 'desc' },
    });

    const nextNumber = lastInvoice
      ? String(parseInt(lastInvoice.invoiceNumber) + 1).padStart(6, '0')
      : '000001';

    // Calculate amounts from payment milestones or use a default
    let subTotal = 0;
    const invoiceItems: any[] = [];

    if (contract.paymentMilestones && Array.isArray(contract.paymentMilestones)) {
      const milestones = contract.paymentMilestones as any[];
      invoiceItems.push(
        ...milestones.map((m: any) => {
          const amount = m.amount || 0;
          return {
            name: m.description || 'Milestone',
            description: m.dueDate ? `Due: ${m.dueDate}` : undefined,
            quantity: 1,
            unitPrice: amount,
            total: amount,
          };
        })
      );
      subTotal = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    } else {
      // If no milestones, create a single line item
      invoiceItems.push({
        name: contract.title,
        description: 'Contract work',
        quantity: 1,
        unitPrice: 0,
        total: 0,
      });
    }

    // Create the invoice with nested invoice items
    const invoice = await prisma.invoice.create({
      data: {
        userId: user.id,
        clientId: contract.clientId || '',
        invoiceNumber: nextNumber,
        title: contract.title,
        status: 'DRAFT',
        issueDate: new Date(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        currency: 'USD',
        subTotal: subTotal,
        taxRate: 0,
        taxAmount: 0,
        total: subTotal,
        notes: `Generated from contract: ${contract.title}`,
        items: {
          create: invoiceItems,
        },
      },
    });

    // Update contract status to completed
    await prisma.contract.update({
      where: { id },
      data: { status: 'completed' },
    });

    return NextResponse.json({
      success: true,
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
    });
  } catch (error: any) {
    console.error('Error generating invoice from contract:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
