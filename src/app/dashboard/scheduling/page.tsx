'use server';

import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { SchedulingForm } from './SchedulingForm';
import { buildBookingLink, normalizeSlug } from './helpers';
import { getAvailabilityForUser } from './actions';

export default async function SchedulingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/dashboard');
  }

  const availabilities = await getAvailabilityForUser(user.id);
  const slug = normalizeSlug(user.name || user.companyName || user.email);
  const bookingLink = slug ? buildBookingLink(slug) : null;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <SchedulingForm availability={availabilities} bookingLink={bookingLink} heading="Scheduling" />
      </div>
    </div>
  );
}
