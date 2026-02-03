"use client";

import { ContactForm } from "@/components/ContactForm";

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-xl p-8 pt-[100px]">
      <h1 className="text-3xl font-bold mb-4 text-brand-primary-700">ClientWave Support</h1>
      <p className="mb-6 text-zinc-700">
        Use the form below to reach out to the ClientWave team. We’ll reply as soon as possible.
      </p>
      <ContactForm />
    </div>
  );
}
