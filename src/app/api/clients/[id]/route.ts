// src/app/api/clients/[id]/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const client = await prisma.client.findFirst({ where: { id, userId: user.id } });
  if (!client) {
    return NextResponse.json({ error: 'Client not found' }, { status: 404 });
  }
  return NextResponse.json(client);
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const body = await request.json();

    const client = await prisma.client.findFirst({ where: { id, userId: user.id } });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    const updated = await prisma.client.update({
      where: { id },
      data: {
        companyName: body.companyName,
        contactName: body.contactName ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        addressLine1: body.addressLine1 ?? null,
        addressLine2: body.addressLine2 ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        postalCode: body.postalCode ?? null,
        country: body.country ?? null,
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('Update client failed:', error);
    return NextResponse.json(
      { error: 'Failed to update client', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;
    const client = await prisma.client.findFirst({ where: { id, userId: user.id } });
    if (!client) return NextResponse.json({ error: 'Client not found' }, { status: 404 });

    await prisma.client.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Delete client failed:', error);
    return NextResponse.json(
      { error: 'Failed to delete client', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
