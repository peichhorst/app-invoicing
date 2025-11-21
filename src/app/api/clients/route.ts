// src/app/api/clients/route.ts
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const client = await prisma.client.create({
      data: {
        userId: user.id,
        companyName: body.companyName,
        contactName: body.contactName ?? null,
        email: body.email ?? null,
        phone: body.phone ?? null,
        addressLine1: body.addressLine1 ?? null,
        city: body.city ?? null,
        state: body.state ?? null,
        postalCode: body.postalCode ?? null,
        country: body.country ?? 'US',
        notes: body.notes ?? null,
      },
    });

    return NextResponse.json(client, { status: 201 });
  } catch (error: any) {
    console.error('Client creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create client', details: error.message },
      { status: 500 }
    );
  }
}
