// src/app/dashboard/profile/page.tsx
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { getCurrentUser } from '@/lib/auth';
import { ProfileForm } from './ProfileForm';
import { describePlan, ensureTrialState } from '@/lib/plan';
import prisma from '@/lib/prisma';
import { EnableNotificationsButton } from '@/components/EnableNotificationsButton';
import { DEFAULT_BUSINESS_TIME_ZONE } from '@/lib/timezone';

export async function generateMetadata(): Promise<Metadata> {
  const user = await getCurrentUser();
  return {
    title: 'Profile',
    icons: {
      icon: user?.logoDataUrl ?? '/favicon.ico',
    },
  };
}

export default async function ProfilePage() {
  redirect('/dashboard/settings?tab=profile');
}
