import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';

type SubscriptionKeys = {
  p256dh?: string;
  auth?: string;
};

type PushSubscriptionPayload = {
  endpoint?: string;
  expirationTime?: number | null;
  keys?: SubscriptionKeys;
};

const ensurePushTable = async () => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PushSubscription" (
        "endpoint" TEXT PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "companyId" TEXT,
        "p256dh" TEXT,
        "auth" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "PushSubscription_userId_idx" ON "PushSubscription"("userId");
    `);
  } catch (err) {
    console.error('Push subscription table ensure failed', err);
  }
};

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as PushSubscriptionPayload;
  const endpoint = typeof body.endpoint === 'string' ? body.endpoint.trim() : '';
  const p256dh = typeof body.keys?.p256dh === 'string' ? body.keys.p256dh : null;
  const auth = typeof body.keys?.auth === 'string' ? body.keys.auth : null;

  if (!endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: 'Invalid subscription payload' }, { status: 400 });
  }

  await ensurePushTable();

  try {
    await prisma.$executeRaw`
      INSERT INTO "PushSubscription" ("endpoint", "userId", "companyId", "p256dh", "auth")
      VALUES (${endpoint}, ${user.id}, ${user.companyId ?? null}, ${p256dh}, ${auth})
      ON CONFLICT ("endpoint") DO UPDATE
        SET "userId" = EXCLUDED."userId",
            "companyId" = EXCLUDED."companyId",
            "p256dh" = EXCLUDED."p256dh",
            "auth" = EXCLUDED."auth";
    `;
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to save push subscription', error);
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
