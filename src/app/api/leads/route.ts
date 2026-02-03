import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const {
      companyName,
      contactName,
      email,
      phone,
      website,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      notes,
      assignedToId,
      source,
      status,
    } = body;

    const leadData = {
      data: {
        companyId: user.companyId,
        assignedToId: assignedToId || user.id,
        companyName,
        name: contactName,
        email,
        website,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        notes,
        source,
        status: status || 'new',
      },
    };

    let lead = null;
    if (email) {
      const existing = await prisma.lead.findFirst({
        where: {
          companyId: user.companyId,
          email,
          archived: false,
        },
      });

      if (existing) {
        lead = await prisma.lead.update({
          where: { id: existing.id },
          data: leadData.data,
        });
      }
    }

    if (!lead) {
      lead = await prisma.lead.create(leadData);
    }

    return NextResponse.json(lead);
  } catch (error: any) {
    console.error('Error creating lead:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create lead' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Normal leads query (filtered by companyId)
    const leads = await prisma.lead.findMany({
      where: {
        companyId: user.companyId,
        archived: false,
      },
      include: {
        client: true,
        assignedTo: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Debug: show all non-archived leads regardless of companyId if ?debug=1 is set
    const { searchParams } = new URL(req.url);
    if (searchParams.get('debug') === '1') {
      const allLeads = await prisma.lead.findMany({
        where: { archived: false },
        include: { client: true, assignedTo: true },
        orderBy: { createdAt: 'desc' },
      });
      return NextResponse.json(allLeads);
    }

    return NextResponse.json(leads);
  } catch (error: any) {
    console.error('Error fetching leads:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}
