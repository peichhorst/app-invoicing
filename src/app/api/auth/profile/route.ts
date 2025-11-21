// src/app/api/auth/profile/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}

export async function PUT(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    const data: any = {
      name: body.name || user.name,
      email: body.email || user.email,
      companyName: body.companyName ?? null,
      logoDataUrl: body.logoDataUrl ?? null,
      phone: body.phone ?? null,
      addressLine1: body.addressLine1 ?? null,
      addressLine2: body.addressLine2 ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      postalCode: body.postalCode ?? null,
      country: body.country ?? 'USA',
    };

    if (body.password) {
      data.password = await hashPassword(body.password);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    return NextResponse.json({ user: updated });
  } catch (error: any) {
    console.error('Profile update failed:', error);
    return NextResponse.json({ error: 'Failed to update profile', details: error?.message || String(error) }, { status: 500 });
  }
}
