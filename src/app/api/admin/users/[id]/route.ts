import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

const CAN_MANAGE_USERS = new Set(['ADMIN', 'OWNER', 'SUPERADMIN']);

export async function PATCH(request: Request) {
  const user = await getCurrentUser();

  if (!user || !CAN_MANAGE_USERS.has(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();

  if (!id) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, companyId: true },
  });

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Only OWNER can edit non-owners from their company
  if (user.role === 'OWNER' && target.role !== 'OWNER' && target.companyId !== user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Only ADMIN/SUPERADMIN can edit an OWNER
  if (target.role === 'OWNER' && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Only admins can edit owners' }, { status: 403 });
  }

  const body = await request.json();
  const { name, positionId, email, phone, logoDataUrl, reportsToId, role } = body;

  const updateData: any = {};
  if (name !== undefined) updateData.name = name;
  if (positionId !== undefined) updateData.positionId = positionId || null;
  if (email !== undefined) updateData.email = email;
  if (phone !== undefined) updateData.phone = phone;
  if (logoDataUrl !== undefined) updateData.logoDataUrl = logoDataUrl;
  if (reportsToId !== undefined) updateData.reportsToId = reportsToId || null;
  if (role !== undefined) updateData.role = role;

  await prisma.user.update({
    where: { id: target.id },
    data: updateData,
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = await getCurrentUser();

  if (!user || !CAN_MANAGE_USERS.has(user.role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.pathname.split('/').pop();

  if (!id) {
    return NextResponse.json({ error: 'Missing user id' }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, companyId: true },
  });

  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Only OWNER can delete non-owners from their company
  if (user.role === 'OWNER' && target.role !== 'OWNER' && target.companyId !== user.companyId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Only ADMIN/SUPERADMIN can delete an OWNER (and should cascade their entire company)
  if (target.role === 'OWNER' && user.role !== 'ADMIN' && user.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Only admins can delete owners' }, { status: 403 });
  }

  if (target.role === 'OWNER' && target.companyId) {
    // Delete the entire company; users are set with onDelete: Cascade for companyId
    await prisma.company.delete({ where: { id: target.companyId } });
    return NextResponse.json({ success: true, message: 'Owner and associated company users deleted.' });
  }

  // Non-owner delete
  await prisma.user.delete({ where: { id: target.id } });
  return NextResponse.json({ success: true });
}
