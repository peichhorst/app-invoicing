import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const title = (body.title ?? 'this document').trim();
    const companyId = body.companyId ?? 'company';

    console.log(`[Compliance Notify] Sending “Please acknowledge ${title}” alert to ${companyId}`);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Compliance notify error', error);
    return NextResponse.json({ error: 'Unable to notify' }, { status: 500 });
  }
}
