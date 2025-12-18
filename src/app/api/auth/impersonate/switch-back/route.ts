import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sessionCookieOptions } from '@/lib/auth';

const SESSION_COOKIE = 'session_token';
const BACKUP_COOKIE = 'session_token_backup';

export async function POST() {
  const cookieStore = await cookies();
  const backup = cookieStore.get(BACKUP_COOKIE)?.value;
  if (!backup) {
    return NextResponse.json({ error: 'No backup session found' }, { status: 400 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE, backup, sessionCookieOptions());
  // Next.js 16 cookies.delete only accepts the name or an options object separately.
  // The BACKUP_COOKIE was set with path '/', so deleting by name is sufficient.
  res.cookies.delete(BACKUP_COOKIE);
  return res;
}
