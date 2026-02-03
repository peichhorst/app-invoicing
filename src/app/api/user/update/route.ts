import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const logoDataUrl = typeof body.logoDataUrl === 'string' ? body.logoDataUrl.trim() : '';
  if (!logoDataUrl) {
    return NextResponse.json({ error: 'No logo provided' }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { logoDataUrl: logoDataUrl.startsWith('data:image') ? logoDataUrl : null },
  });

  return NextResponse.json({ success: true });
}
