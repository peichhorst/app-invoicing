import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim();
  const base = request.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL('/settings/email?error=invalid', base));
  }

  return NextResponse.redirect(
    new URL(`/settings/email/verify/${encodeURIComponent(token)}`, base)
  );
}
