import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { clientVisibilityWhere } from '@/lib/client-scope';

type ClientPayload = {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  notes?: string;
  assignedToId?: string | null;
  isLead?: boolean;
};

const notFound = () => NextResponse.json({ error: 'Client not found' }, { status: 404 });
const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const includeFields = {
  include: {
    assignedTo: { select: { id: true, name: true, email: true } },
    company: { select: { name: true } },
  },
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await params;
  const client = await prisma.client.findFirst({
    where: { ...clientVisibilityWhere(user), id },
    ...includeFields,
  });
  if (!client) return notFound();

  return NextResponse.json(client);
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const client = await prisma.client.findFirst({
      where: { ...clientVisibilityWhere(user), id },
    });
    if (!client) return notFound();

    const body = (await request.json()) as ClientPayload;

    const contactName = body.contactName?.trim() ?? '';
    const email = body.email?.trim() ?? '';
    if (!contactName) {
      return NextResponse.json({ error: 'Contact name is required.' }, { status: 400 });
    }
    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const data: Record<string, any> = {
      companyName: body.companyName?.trim() || null,
      contactName,
      email,
      phone: body.phone ?? null,
      addressLine1: body.addressLine1 ?? null,
      addressLine2: body.addressLine2 ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      postalCode: body.postalCode ?? null,
      country: body.country ?? client.country ?? 'USA',
      notes: body.notes ?? null,
      isLead: typeof body.isLead === 'boolean' ? body.isLead : client.isLead,
    };

    if (body.assignedToId) {
      const companyId = user.companyId ?? user.company?.id ?? null;
      const target = await prisma.user.findFirst({
        where: { id: body.assignedToId, companyId },
        select: { id: true },
      });
      if (target) {
        data.assignedToId = target.id;
      }
    }

    const updated = await prisma.client.update({
      where: { id: client.id },
      data,
      ...includeFields,
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Client update error:', error);
    return NextResponse.json(
      { error: 'Failed to update client', details: error?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { id } = await params;
    const client = await prisma.client.findFirst({
      where: { ...clientVisibilityWhere(user), id },
      select: { id: true },
    });
    if (!client) return notFound();

    const invoiceCount = await prisma.invoice.count({ where: { clientId: client.id } });
    if (invoiceCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete client with invoices.' },
        { status: 400 },
      );
    }

    await prisma.client.delete({ where: { id: client.id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Client delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete client', details: error?.message },
      { status: 500 }
    );
  }
}
