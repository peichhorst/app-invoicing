import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { hashPassword, getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendInviteEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'ADMIN' && user.role !== 'OWNER' && user.role !== 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const email = (body.email ?? '').trim().toLowerCase();
    const name = (body.name ?? '').trim();
    const positionIdRaw = typeof body.positionId === 'string' ? body.positionId.trim() : '';
    const positionId = positionIdRaw || null;
    const setAsAdministrator = Boolean(body.setAsAdministrator);
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (await prisma.user.findUnique({ where: { email } })) {
      return NextResponse.json({ error: 'Email already taken' }, { status: 409 });
    }

    let companyId = user.companyId ?? null;
    let ownerCompanyName: string | undefined;
    let ownerCompany: { id: string; name?: string | null; primaryColor?: string | null } | null = null;
    if (user.role === 'OWNER') {
      const ownerCompanyRecord = await prisma.company.findFirst({
        where: { ownerId: user.id },
        select: { id: true, name: true, primaryColor: true },
      });
      if (ownerCompanyRecord) {
        companyId = ownerCompanyRecord.id;
        ownerCompanyName = ownerCompanyRecord.name ?? undefined;
        ownerCompany = ownerCompanyRecord;
      }
    }
    if (!companyId && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Owner account must belong to a company' }, { status: 400 });
    }

    // Validate provided position against the inviter's company positions
    if (positionId) {
      if (!companyId) {
        return NextResponse.json({ error: 'Positions can only be assigned within a company' }, { status: 400 });
      }

      const matchingPosition = await prisma.position.findFirst({
        where: { id: positionId, companyId },
        select: { id: true },
      });

      if (!matchingPosition) {
        return NextResponse.json({ error: 'Invalid position for this company' }, { status: 400 });
      }
    }

    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hashed = await hashPassword(tempPassword);

    const token = crypto.randomUUID();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    if (setAsAdministrator && !(user.role === 'OWNER' || user.role === 'SUPERADMIN')) {
      return NextResponse.json({ error: 'Only owners or superadmins can assign administrator roles' }, { status: 403 });
    }

    const created = await prisma.user.create({
      data: {
        name: name || undefined,
        email,
        password: hashed,
        companyId: companyId ?? undefined,
        role: setAsAdministrator ? 'ADMIN' : 'USER',
        planTier: 'FREE',
        isConfirmed: false,
        inviteToken: token,
        inviteTokenExpires: expires,
        positionId: positionId ?? undefined,
      },
    });

    const inviterName = user.name ?? user.email;
    const companyName = ownerCompanyName ?? user.companyName ?? undefined;
    const appBase = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const confirmUrl = new URL('/confirm-invite', appBase);
    confirmUrl.searchParams.set('token', token);
    try {
      await sendInviteEmail({
        email,
        temporaryPassword: tempPassword,
        inviterName,
        companyName,
        confirmLink: confirmUrl.toString(),
        companyPrimaryColor: ownerCompany?.primaryColor ?? user.company?.primaryColor ?? null,
      });
    } catch (emailError) {
      console.error('Failed to send invite email', emailError);
    }

    return NextResponse.json({
      user: { id: created.id, name: created.name, email: created.email },
      temporaryPassword: tempPassword,
    });
  } catch (error) {
    console.error('[Invite User]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unable to invite user' },
      { status: 500 },
    );
  }
}
