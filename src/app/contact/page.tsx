"use client";

import Link from "next/link";

export default function ContactRedirectPage() {
  return (
    <div className="mx-auto max-w-3xl p-8 pt-[100px] space-y-4">
      <h1 className="text-3xl font-bold">Contact Support</h1>
      <p className="text-base text-zinc-700">
        The contact form has moved to our new support hub. Please visit{" "}
        <Link className="text-brand-primary-700 font-semibold underline" href="/support">
          /support
        </Link>{" "}
        to submit a message, or email us directly at{" "}
        <a className="text-brand-primary-700 font-semibold" href="mailto:support@clientwave.app">
          support@clientwave.app
        </a>
        .
      </p>
    </div>
  );
}
