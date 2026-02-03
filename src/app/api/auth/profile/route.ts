// src/app/api/auth/profile/route.ts
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword } from '@/lib/auth';
import { normalizeStateValue } from '@/lib/states';
import { DEFAULT_BUSINESS_TIME_ZONE } from '@/lib/timezone';

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
    signatureDataUrl?: string | null;
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
    reportsToId?: string | null;
    positionId?: string | null;
    positionName?: string | null;
    password?: string | null;
    setAsAdministrator?: string | null;
    timezone?: string | null;
    enableVideo?: string | null;
    videoLink?: string | null;
    enablePhone?: string | null;
    phoneNumber?: string | null;
    enableInPerson?: string | null;
    location?: string | null;
  };

  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = (await request.json()) as ProfilePayload;

    const normalizedState = normalizeStateValue(body.state ?? user.company?.state ?? undefined);
    const data: Parameters<typeof prisma.user.update>[0]['data'] = {
      name: body.name || user.name,
      companyName: body.companyName ?? null,
      logoDataUrl: sanitizeLogoUrl(body.logoDataUrl),
      signatureDataUrl: sanitizeLogoUrl(body.signatureDataUrl),
      phone: body.phone ?? null,
      stripeAccountId: body.stripeAccountId?.trim() || null,
      stripePublishableKey: body.stripePublishableKey?.trim() || null,
      venmoHandle: body.venmoHandle?.trim() || null,
      zelleHandle: body.zelleHandle?.trim() || null,
      mailToAddressEnabled: body.mailToAddressEnabled === 'true',
      mailToAddressTo: body.mailToAddressTo?.trim() || null,
      enableVideo: body.enableVideo === 'true',
      videoLink: body.videoLink?.trim() || null,
      enablePhone: body.enablePhone === 'true',
      phoneNumber: body.phoneNumber?.trim() || null,
      enableInPerson: body.enableInPerson === 'true',
      location: body.location?.trim() || null,
      trackdriveLeadToken: body.trackdriveLeadToken?.trim() || null,
      trackdriveLeadEnabled: body.trackdriveLeadEnabled === 'true',
      timezone: body.timezone?.trim() || DEFAULT_BUSINESS_TIME_ZONE,
    };

    if (body.password) {
      data.password = await hashPassword(body.password);
    }

    const setAsAdministrator = body.setAsAdministrator === 'true';
    if (setAsAdministrator) {
      if (user.role !== 'OWNER' && user.role !== 'SUPERADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }
      data.role = 'ADMIN';
    }

    const companyId = user.companyId ?? user.company?.id ?? null;
    const canManageReports = user.role === 'OWNER' || user.role === 'ADMIN';
    if (canManageReports) {
      const targetIdRaw = body.reportsToId ?? undefined;
      const targetId = typeof targetIdRaw === 'string' ? targetIdRaw.trim() : null;
      if (companyId && targetId) {
        const target = await prisma.user.findFirst({
          where: { id: targetId, companyId },
          select: { id: true },
        });
        data.reportsToId = target && target.id !== user.id ? target.id : null;
      } else {
        data.reportsToId = null;
      }
    }

    if (companyId && user.role === 'OWNER') {
      const positionNameTrimmed =
        typeof body.positionName === 'string' ? body.positionName.trim() : '';
      if (positionNameTrimmed) {
        const existingPosition = await prisma.position.findFirst({
          where: { companyId, name: positionNameTrimmed },
          select: { id: true },
        });
        if (existingPosition) {
          data.positionId = existingPosition.id;
          data.position = null;
        } else {
          const lastPosition = await prisma.position.findFirst({
            where: { companyId },
            orderBy: { order: 'desc' },
          });
          const newOrder = (lastPosition?.order ?? 0) + 1;
          const created = await prisma.position.create({
            data: {
              companyId,
              name: positionNameTrimmed,
              order: newOrder,
              isCustom: true,
            },
          });
          data.positionId = created.id;
          data.position = null;
        }
      } else if (body.positionId !== undefined) {
        const positionIdRaw = typeof body.positionId === 'string' ? body.positionId.trim() : '';
        if (!positionIdRaw) {
          data.positionId = null;
          data.position = null;
        } else {
          const position = await prisma.position.findFirst({
            where: { id: positionIdRaw, companyId },
            select: { id: true },
          });
          if (!position) {
            return NextResponse.json({ error: 'Position not found for this company' }, { status: 400 });
          }
          data.positionId = position.id;
          data.position = null;
        }
      }
    }

    const companyUpdate: Parameters<typeof prisma.company.update>[0]['data'] = {};
    const appendTrimmed = (value?: string | null) => (value ? value.trim() : '');
    if (body.addressLine1 !== undefined) {
      companyUpdate.addressLine1 = appendTrimmed(body.addressLine1) || null;
    }
    if (body.addressLine2 !== undefined) {
      companyUpdate.addressLine2 = appendTrimmed(body.addressLine2) || null;
    }
    if (body.city !== undefined) {
      companyUpdate.city = appendTrimmed(body.city) || null;
    }
    if (body.state !== undefined) {
      companyUpdate.state = normalizedState ?? null;
    }
    if (body.postalCode !== undefined) {
      companyUpdate.postalCode = appendTrimmed(body.postalCode) || null;
    }
    if (body.country !== undefined) {
      const trimmedCountry = appendTrimmed(body.country);
      companyUpdate.country = trimmedCountry ? trimmedCountry : 'USA';
    }

    await prisma.$transaction(async (tx) => {
      if (user.companyId && Object.keys(companyUpdate).length > 0) {
        await tx.company.update({
          where: { id: user.companyId },
          data: companyUpdate,
        });
      }

      await tx.user.update({
        where: { id: user.id },
        data,
      });
    });

    const refreshed = await prisma.user.findUnique({
      where: { id: user.id },
      include: { company: true },
    });

    return NextResponse.json({ user: refreshed ?? user });
  } catch (error: unknown) {
    console.error('Profile update failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update profile', details: message },
      { status: 500 }
    );
  }
}
