"use client";

import Link from "next/link";

export default function ClientWaveSupportPage() {
  return (
    <div className="mx-auto max-w-lg p-8">
      <h1 className="text-3xl font-bold mb-6">ClientWave Support</h1>
      <p className="mb-6 text-base text-zinc-700">
        Thanks for reaching out to ClientWave Support. This page is intentionally simplified while the whitelabeled workflow continues to use the standard contact form.
      </p>
      <div className="space-y-4">
        <p className="text-sm text-zinc-600">
          For now, you can <Link href="/contact" className="text-brand-primary-700 font-semibold">visit the contact form</Link> to submit your request.
        </p>
        <p className="text-sm text-zinc-600">
          Need immediate help? Email <a href="mailto:support@clientwave.app" className="text-brand-primary-700 font-semibold">support@clientwave.app</a>.
        </p>
        <p className="text-sm text-zinc-600">
          We'll reach back within one business day.
        </p>
      </div>
    </div>
  );
}
