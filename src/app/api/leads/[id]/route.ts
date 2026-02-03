import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        client: true,
        assignedTo: true,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    return NextResponse.json(lead);
  } catch (error: any) {
    console.error('Error fetching lead:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch lead' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: body,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Error updating lead:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update lead' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const lead = await prisma.lead.findUnique({
      where: { id },
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    if (lead.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await prisma.lead.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete lead' },
      { status: 500 }
    );
  }
}
