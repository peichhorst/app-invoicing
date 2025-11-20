// src/app/api/test-email/route.ts
import { sendTestEmail } from '@/lib/email';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const to = url.searchParams.get('to') || process.env.RESEND_TEST_TO;

    if (!to) {
      return NextResponse.json(
        { error: 'Missing recipient. Provide ?to=address or set RESEND_TEST_TO.' },
        { status: 400 }
      );
    }

    await sendTestEmail(to);
    return NextResponse.json({ success: true, message: `Email sent to ${to}` });
  } catch (error: any) {
    console.error('Test email failed:', error);
    return NextResponse.json(
        { error: 'Failed to send', details: error?.message || String(error) },
        { status: 500 }
      );
  }
}
