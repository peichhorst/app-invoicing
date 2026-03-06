import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AuthPageClient from '@/app/AuthPageClient';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }

  return <AuthPageClient />;
}
