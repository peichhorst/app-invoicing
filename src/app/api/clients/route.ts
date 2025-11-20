// src/app/api/clients/route.ts
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // For now, attach clients to a demo user. In a real app this would come from the session.
    let user = await prisma.user.findFirst();
    if (!user) {
      const hashedPassword = await bcrypt.hash('password123', 10);
      user = await prisma.user.create({
        data: {
          name: 'Demo User',
          email: 'demo@example.com',
          password: hashedPassword,
        },
      });
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
