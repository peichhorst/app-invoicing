// src/app/api/clients/route.ts
import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import crypto from 'crypto';
import { describePlan } from '@/lib/plan';

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
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClientPayload;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const plan = describePlan(user);
    const isPro = plan.effectiveTier === 'PRO';
    const count = await prisma.client.count({ where: { userId: user.id, archived: false } });
    if (!isPro && count >= 3) {
      return NextResponse.json(
        { error: 'Free plan allows up to 3 clients. Upgrade to add more.' },
        { status: 402 }
      );
    }

    const client = await prisma.client.create({
      data: {
        userId: user.id,
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
