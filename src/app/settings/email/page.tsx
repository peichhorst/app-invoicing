import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { sendEmailChangeVerificationEmail } from '@/lib/email';
import crypto from 'crypto';

type PageProps = {
  searchParams?: Promise<{
    status?: string;
    error?: string;
  }>;
};

export default async function EmailSettingsPage({ searchParams }: PageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login');
  }

  const params = await searchParams;

  const status = params?.status;
  const error = params?.error;

  const getMessage = () => {
    if (error) {
      return error === 'invalid'
        ? 'Please enter a valid email address.'
        : error === 'same'
          ? 'The new email is the same as your current email.'
          : error === 'taken'
            ? 'That email already belongs to another account.'
            : error === 'expired'
              ? 'That link expired. Request a new verification email.'
              : 'Unable to process your request.';
    }
    if (status === 'sent') {
      return 'Check your new inbox for the verification link.';
    }
    if (status === 'changed') {
      return 'Email updated! You are now signed in with your new address.';
    }
    return null;
  };

  const message = getMessage();

  async function changeEmailAction(formData: FormData) {
    'use server';
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      redirect('/login');
    }

    const newEmail = formData.get('email')?.toString().trim().toLowerCase();
    if (!newEmail || !newEmail.includes('@')) {
      redirect('/settings/email?error=invalid');
    }
    if (newEmail === currentUser.email) {
      redirect('/settings/email?error=same');
    }

    const existing = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existing && existing.id !== currentUser.id) {
      redirect('/settings/email?error=taken');
    }

    await prisma.emailChangeToken.deleteMany({ where: { userId: currentUser.id } });
    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    await prisma.emailChangeToken.create({
      data: {
        userId: currentUser.id,
        newEmail,
        token,
        expiresAt,
      },
    });

    await sendEmailChangeVerificationEmail(
      newEmail,
      token,
      currentUser.company?.primaryColor ?? null
    );
    revalidatePath('/settings/email');
    redirect('/settings/email?status=sent');
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-zinc-900">Change Email</h1>
          <p className="text-sm text-zinc-500">Enter a new email and we’ll send a verification link.</p>
          {message && (
            <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              {message}
            </div>
          )}
          <form action={changeEmailAction} className="mt-6 space-y-4">
            <div className="space-y-1">
              <label className="text-sm font-semibold text-zinc-700">Current email</label>
              <input
                type="email"
                value={user?.email ?? ''}
                readOnly
                className="w-full rounded-lg border border-zinc-200 bg-gray-100 px-3 py-2 text-sm text-zinc-500"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-semibold text-zinc-700">New email</label>
              <input
                type="email"
                name="email"
                placeholder="new@email.com"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
                required
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-lg bg-brand-primary-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-primary-700"
            >
              Change email
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
