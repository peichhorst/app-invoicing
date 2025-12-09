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
  const sanitizeLogoUrl = (value: unknown) => {
    if (!value || typeof value !== 'string') return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.toLowerCase().startsWith('data:image')) return null;
    return trimmed;
  };

  type ProfilePayload = {
    name?: string | null;
    companyName?: string | null;
    logoDataUrl?: string | null;
    phone?: string | null;
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
    stripeAccountId?: string | null;
    stripePublishableKey?: string | null;
    venmoHandle?: string | null;
    zelleHandle?: string | null;
    mailToAddressEnabled?: string | null;
    mailToAddressTo?: string | null;
    trackdriveLeadToken?: string | null;
    trackdriveLeadEnabled?: string | null;
    password?: string | null;
  };

  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as ProfilePayload;

    const data: Parameters<typeof prisma.user.update>[0]['data'] = {
      name: body.name || user.name,
      companyName: body.companyName ?? null,
      logoDataUrl: sanitizeLogoUrl(body.logoDataUrl),
      phone: body.phone ?? null,
      addressLine1: body.addressLine1 ?? null,
      addressLine2: body.addressLine2 ?? null,
      city: body.city ?? null,
      state: body.state ?? null,
      postalCode: body.postalCode ?? null,
      country: body.country ?? 'USA',
      stripeAccountId: body.stripeAccountId?.trim() || null,
      stripePublishableKey: body.stripePublishableKey?.trim() || null,
      venmoHandle: body.venmoHandle?.trim() || null,
      zelleHandle: body.zelleHandle?.trim() || null,
      mailToAddressEnabled: body.mailToAddressEnabled === 'true',
      mailToAddressTo: body.mailToAddressTo?.trim() || null,
      trackdriveLeadToken: body.trackdriveLeadToken?.trim() || null,
      trackdriveLeadEnabled: body.trackdriveLeadEnabled === 'true',
    };

    if (body.password) {
      data.password = await hashPassword(body.password);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data,
    });

    return NextResponse.json({ user: updated });
  } catch (error: unknown) {
    console.error('Profile update failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update profile', details: message },
      { status: 500 }
    );
  }
}
