import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { withAuth, getScopedDb, AuthenticatedUser } from '@/lib/auth-filters';
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
  conversion?: {
    source?: string;
    convertedAt?: string;
    convertedById?: string;
  };
};

const notFound = () => NextResponse.json({ error: 'Client not found' }, { status: 404 });
const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

const includeFields = {
  include: {
    assignedTo: { select: { id: true, name: true, email: true } },
    company: { select: { name: true } },
  },
};

async function getClientHandler(user: AuthenticatedUser, id: string) {
  const scopedDb = getScopedDb(user);
  
  // For regular users, they can only access clients assigned to them
  // For admins and owners, they can access all clients in their company
  let client;
  if (user.role === 'OWNER' || user.role === 'ADMIN') {
    client = await prisma.client.findUnique({
      where: { id, companyId: user.companyId! },
      ...includeFields,
    });
  } else {
    // Regular users can only access clients assigned to them
    client = await prisma.client.findUnique({
      where: { 
        id,
        assignedToId: user.id
      },
      ...includeFields,
    });
  }
  
  if (!client) return notFound();
  return NextResponse.json(client);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await params;
  return getClientHandler(user, id);
}

async function updateClientHandler(
  request: Request,
  user: AuthenticatedUser,
  id: string
) {
  try {
    // First, verify the user can access this client
    let client;
    if (user.role === 'OWNER' || user.role === 'ADMIN') {
      client = await prisma.client.findUnique({
        where: { id, companyId: user.companyId! },
      });
    } else {
      // Regular users can only access clients assigned to them
      client = await prisma.client.findUnique({
        where: { 
          id,
          assignedToId: user.id
        },
      });
    }
    
    if (!client) return notFound();

    const body = (await request.json()) as ClientPayload;

    const data: Record<string, any> = {
      companyName: body.companyName?.trim() ?? client.companyName ?? null,
      contactName: body.contactName?.trim() ?? client.contactName ?? null,
      email: body.email?.trim() ?? client.email ?? null,
      phone: body.phone ?? client.phone ?? null,
      addressLine1: body.addressLine1 ?? client.addressLine1 ?? null,
      addressLine2: body.addressLine2 ?? client.addressLine2 ?? null,
      city: body.city ?? client.city ?? null,
      state: body.state ?? client.state ?? null,
      postalCode: body.postalCode ?? client.postalCode ?? null,
      country: body.country ?? client.country ?? 'USA',
      notes: body.notes ?? client.notes ?? null,
      isLead: typeof body.isLead === 'boolean' ? body.isLead : client.isLead,
      // Don't set source here, handle below
    };
    
    // Support semantic conversion object from frontend
    if (body.conversion && typeof body.conversion === 'object') {
      if (body.conversion.source) {
        data.source = body.conversion.source;
      }
      if (body.conversion.convertedAt) {
        data.convertedAt = body.conversion.convertedAt;
      }
      if (body.conversion.convertedById) {
        data.convertedById = body.conversion.convertedById;
      }
    } else if (client.isLead && body.isLead === false) {
      // Fallback: If converting from lead to client, set source
      data.source = 'CONVERTED_FROM_LEAD';
    }

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await params;
  return updateClientHandler(request, user, id);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  // PATCH handler mirrors PUT logic for partial updates
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const { id } = await params;
  return updateClientHandler(request, user, id);
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getCurrentUser();
    if (!user) return unauthorized();

    const { id } = await params;
    
    // Verify the user can access this client
    let client;
    if (user.role === 'OWNER' || user.role === 'ADMIN') {
      client = await prisma.client.findUnique({
        where: { id, companyId: user.companyId! },
        select: { id: true },
      });
    } else {
      // Regular users can only access clients assigned to them
      client = await prisma.client.findUnique({
        where: { 
          id,
          assignedToId: user.id
        },
        select: { id: true },
      });
    }
    
    if (!client) return notFound();

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
