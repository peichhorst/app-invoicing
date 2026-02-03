import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    // Get the lead
    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (lead.clientId) {
      return NextResponse.json(
        { error: 'Lead has already been converted to a client' },
        { status: 400 }
      );
    }

    // Create a new client from the lead
    const client = await prisma.client.create({
      data: {
        companyId: lead.companyId,
        assignedToId: lead.assignedToId,
        contactName: lead.name,
        email: lead.email,
        phone: lead.phone,
        companyName: lead.companyName,
        notes: lead.notes,
        isLead: false, // This is now a client, not a lead
        source: lead.source || 'Converted From Lead',
        convertedFromLead: true,
        status: 'Converted From Lead',
      },
    });

    // Delete the lead after conversion
    await prisma.lead.delete({
      where: { id },
    });

    // If redirect is requested, redirect to the new client's page
    const formData = await req.formData().catch(() => null);
    if (formData && formData.get('redirect') === '1') {
      const baseUrl = req.nextUrl.origin || process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
      return NextResponse.redirect(`${baseUrl}/dashboard/clients/${client.id}`);
    }

    return NextResponse.json({
      success: true,
      clientId: client.id,
    });
  } catch (error: any) {
    console.error('Error converting lead to client:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to convert lead to client' },
      { status: 500 }
    );
  }
}
