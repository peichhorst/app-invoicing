// src/app/api/clients/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';
import { describePlan } from '@/lib/plan';
import { clientVisibilityWhere } from '@/lib/client-scope';

type ClientPayload = {
  companyName: string;
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
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClientPayload;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = user.companyId ?? user.company?.id ?? null;
    if (!companyId) {
      return NextResponse.json({ error: 'User is not linked to a company.' }, { status: 400 });
    }

    const plan = describePlan(user);
    const isPro = plan.effectiveTier === 'PRO';
    const count = await prisma.client.count({ where: { ...clientVisibilityWhere(user), archived: false } });
    if (!isPro && count >= 3) {
      return NextResponse.json(
        { error: 'Free plan allows up to 3 clients. Upgrade to add more.' },
        { status: 402 }
      );
    }

    let assignedToId: string | null = user.id;
    if (user.role === 'OWNER' || user.role === 'ADMIN') {
      if (Object.prototype.hasOwnProperty.call(body, 'assignedToId')) {
        const requested = body.assignedToId as string | null | undefined;
        if (!requested) {
          assignedToId = null;
        } else {
          const target = await prisma.user.findFirst({
            where: { id: requested, companyId },
            select: { id: true },
          });
          if (target) {
            assignedToId = target.id;
          }
        }
      }
    }

    const client = await prisma.client.create({
      data: {
        companyId,
        assignedToId,
        companyName: body.companyName,
        contactName: body.contactName ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        addressLine1: body.addressLine1 ?? null,
        addressLine2: body.addressLine2 ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        postalCode: body.postalCode ?? null,
        country: body.country ?? 'USA',
        notes: body.notes ?? null,
      },
    });

    try {
      await prisma.clientPortalUser.create({
        data: {
          clientId: client.id,
          email: client.email,
          portalToken: crypto.randomBytes(24).toString('hex'),
        },
      });
    } catch (err) {
      console.error('Failed to create client portal user', err);
    }

    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    console.error('Client creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create client', details: error.message },
      { status: 500 }
    );
  }
}
