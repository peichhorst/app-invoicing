'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ConfirmInvite() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) return;

    const confirm = async () => {
      const res = await fetch('/api/invite/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const confirmedUser = data?.user as { name?: string | null; email?: string | null } | undefined;
        try {
          const channel = new BroadcastChannel('clientwave-events');
          channel.postMessage({
            type: 'invite-confirmed',
            user: { name: confirmedUser?.name ?? null, email: confirmedUser?.email ?? null },
          });
          channel.close();
        } catch {
          // ignore broadcast errors
        }
        router.refresh();
        setTimeout(() => {
          router.replace('/dashboard/onboarding?mode=invite');
        }, 150);
      } else {
        alert('Invalid or expired link');
      }
    };

    confirm();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="flex flex-col items-center gap-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
        <p className="text-sm font-semibold tracking-[0.3em] text-white/90 uppercase">
          Confirming invite
        </p>
      </div>
    </div>
  );
}
