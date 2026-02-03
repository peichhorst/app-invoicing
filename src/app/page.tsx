// src/app/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import AuthPageClient from './AuthPageClient';

export default async function Page() {
  const user = await getCurrentUser();
  if (user) {
    redirect('/dashboard');
  }
  return <AuthPageClient />;
}
