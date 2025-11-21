// src/app/dashboard/profile/page.tsx
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ProfileForm } from './ProfileForm';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/');

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Edit Profile</h1>
          <p className="text-sm text-gray-500">Update your account, branding, and contact details.</p>
        </div>
        <ProfileForm
          initial={{
            name: user.name,
            email: user.email,
            companyName: user.companyName,
            logoDataUrl: user.logoDataUrl,
            phone: user.phone,
            addressLine1: user.addressLine1,
            addressLine2: user.addressLine2,
            city: user.city,
            state: user.state,
            postalCode: user.postalCode,
            country: user.country,
          }}
        />
      </div>
    </div>
  );
}
