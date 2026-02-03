// src/app/api/trackdrive-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendTrackDriveNotification } from '@/lib/email';

type TrackDrivePayload = {
  caller_id: string;
  email?: string;
  agent_email?: string;
  name?: string;
  duration?: number;
  source?: string;
  user_id?: string;
  lead_token?: string;
  data?: Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const payload: TrackDrivePayload = await req.json();

  let userId = payload.user_id || req.headers.get('x-trackdrive-user-id') || undefined;
  let userRecord:
    | (Pick<
        import('@prisma/client').User,
        'id' | 'email' | 'trackdriveLeadToken' | 'companyId'
      >)
    | null = null;

  if (userId) {
    userRecord = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, trackdriveLeadToken: true, companyId: true },
    });
  }

  const agentEmail = payload.agent_email || undefined;
  if (!userRecord && agentEmail) {
    userRecord = await prisma.user.findUnique({
      where: { email: agentEmail },
      select: { id: true, email: true, trackdriveLeadToken: true, companyId: true },
    });
    userId = userRecord?.id ?? userId;
  }

  if (!userRecord && payload.email) {
    userRecord = await prisma.user.findUnique({
      where: { email: payload.email },
      select: { id: true, email: true, trackdriveLeadToken: true, companyId: true },
    });
    userId = userRecord?.id ?? userId;
  }

  if (!userRecord) {
    await sendTrackDriveNotification('petere2103@gmail.com', {
      ...payload,
      status: 'error',
      error: 'Missing user_id or unknown email',
    });
    return NextResponse.json({ error: 'Missing user_id or unknown email' }, { status: 400 });
  }

  const expectedToken = userRecord.trackdriveLeadToken ?? process.env.TRACKDRIVE_LEAD_TOKEN;
  if (expectedToken && payload.lead_token !== expectedToken) {
    await sendTrackDriveNotification('petere2103@gmail.com', {
      ...payload,
      status: 'error',
      error: 'Unauthorized token',
      userEmail: userRecord.email ?? undefined,
    });
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const resolvedUserEmail = userRecord.email ?? undefined;
  const companyId = userRecord.companyId;
  if (!companyId) {
    await sendTrackDriveNotification('petere2103@gmail.com', {
      ...payload,
      status: 'error',
      error: 'User missing company association',
      userEmail: resolvedUserEmail,
    });
    return NextResponse.json({ error: 'User missing company association' }, { status: 400 });
  }

  const companyField = payload.data?.company;
  const companyName = typeof companyField === 'string' ? companyField : 'TrackDrive call lead';
  const contactName = payload.name || payload.caller_id || 'TrackDrive lead';
  const phone = payload.caller_id;

  const notes = [
    payload.duration ? `Duration: ${payload.duration}s` : null,
    payload.source ? `Source: ${payload.source}` : null,
    payload.data ? `Data: ${JSON.stringify(payload.data)}` : null,
  ]
    .filter(Boolean)
    .join(' | ');

  const newClient = await prisma.client.create({
    data: {
      companyId,
      assignedToId: userRecord.id,
      companyName,
      contactName,
      email: payload.email,
      phone,
      notes: notes || 'Created from TrackDrive webhook',
    },
  });

  await sendTrackDriveNotification('petere2103@gmail.com', {
    caller_id: payload.caller_id,
    email: payload.email,
    name: payload.name,
    source: payload.source,
    duration: payload.duration,
    data: payload.data,
    clientId: newClient.id,
    userEmail: resolvedUserEmail,
  });

  return NextResponse.json({ success: true, clientId: newClient.id });
}
