'use server';

import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

const candidatePaths = [
  '/apple-touch-icon.png',
  '/apple-touch-icon-180x180.png',
  '/apple-touch-icon-152x152.png',
  '/apple-touch-icon-precomposed.png',
];

const normalizeOrigin = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`).origin;
  } catch {
    return null;
  }
};

const getImageSize = (buffer: Buffer): { width: number; height: number } | null => {
  if (buffer.length < 8) return null;
  // PNG
  if (buffer.readUInt32BE(0) === 0x89504e47) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }
  // JPEG
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xc3) {
        const height = buffer.readUInt16BE(offset + 5);
        const width = buffer.readUInt16BE(offset + 7);
        return { width, height };
      }
      offset += 2 + length;
    }
  }
  return null;
};

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { website } = await request.json();
  const origin = normalizeOrigin(website);
  if (!origin) {
    return NextResponse.json({ error: 'Invalid website' }, { status: 400 });
  }

  let logoDataUrl: string | null = null;
  for (const path of candidatePaths) {
    try {
      const res = await fetch(origin + path, { cache: 'no-store' });
      if (!res.ok) continue;
      const buffer = Buffer.from(await res.arrayBuffer());
      const size = getImageSize(buffer);
      if (!size || size.width < 100 || size.height < 100) continue;
      const mime = res.headers.get('content-type') || 'image/png';
      logoDataUrl = `data:${mime};base64,${buffer.toString('base64')}`;
      break;
    } catch {
      continue;
    }
  }

  if (!logoDataUrl) {
    return NextResponse.json({ success: false, reason: 'No high-res logo found' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { logoDataUrl },
  });

  return NextResponse.json({ success: true, logoDataUrl });
}
