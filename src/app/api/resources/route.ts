import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
 

function normalizeUrl(u: string): string {
  const trimmed = u.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return trimmed;
  if (/^(https?:|mailto:|tel:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only owners or admins may add resources' }, { status: 403 });
    }

    const body = (await request.json()) as {
      title?: string;
      url?: string;
      description?: string | null;
      visibleToPositions?: string[]; // empty array means visible to all positions
      requiresAcknowledgment?: boolean;
    };

    const title = (body.title || '').trim();
    const rawUrl = (body.url || '').trim();
    if (!title || !rawUrl) {
      return NextResponse.json({ error: 'Title and URL are required' }, { status: 400 });
    }

    const url = normalizeUrl(rawUrl);
    if (!url) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
    }

    const visibleToPositions = Array.isArray(body.visibleToPositions)
      ? body.visibleToPositions.filter((p) => typeof p === 'string' && p.trim())
      : [];

    const resource = await (prisma as any).resource.create({
      data: {
        company: { connect: { id: user.companyId } },
        title,
        url,
        description: body.description?.trim() || null,
        visibleToPositions,
        requiresAcknowledgment: Boolean(body.requiresAcknowledgment),
      },
    });

    return NextResponse.json({ resource });
  } catch (error) {
    console.error('Resource create failed', error);
    return NextResponse.json({ error: 'Unable to create resource' }, { status: 500 });
  }
}
