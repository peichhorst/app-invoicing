"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

type Mode = "login" | "register";

const heroWrapper = (content: React.ReactNode) => (
  <div className="relative flex min-h-screen items-start justify-center overflow-hidden bg-gradient-to-br from-purple-700 via-indigo-700 to-blue-700 px-4 py-8 sm:px-6 lg:px-8">
    <div className="absolute inset-0 opacity-40">
      <div className="grid-overlay" />
    </div>
    <div className="relative w-full max-w-4xl space-y-6 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur mt-16">
      {content}
    </div>
  </div>
);

const heroCopy = (
  <div className="grid gap-8 md:grid-cols-2">
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="rounded-fulls borders ">
          <Image src="/favicon.svg" alt="ClientWave Icon" width={48} height={48} className="border-white h-12 w-12 rounded-full" />
        </div>
        <h1 className="text-3xl font-bold text-white">ClientWave</h1>
      </div>
      <p className="text-xl font-semibold text-purple-100 leading-tight">The all-in-one business app for freelancers and agencies.</p>
      <p className="text-md text-white/90 leading-relaxed">ClientWave is the modern, installable app that lets you run your entire business from one place — invoicing, payments, client management, team collaboration, and more — with a beautiful, fast interface that feels like native software on your phone or desktop.</p>
      <ul className="space-y-1 text-lg font-semibold text-purple-100">
        <li>• 30 Day Pro Trial</li>
        <li>• $19 / Month After Trial</li>
        <li>• Free for 3 clients forever</li>
      </ul>
    </div>
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-inner shadow-black/20">
      <p className="text-xs uppercase tracking-[0.3em] text-purple-100">KEY FEATURES</p>
      <ul className="space-y-2 text-sm font-semibold">
        <li>• Professional invoicing with your branding</li>
        <li>• Seamless credit card & alternative payment methods</li>
        <li>• Client portal for payments & documents</li>
        <li>• Proposals & contracts with e-signature</li>
        <li>• Recurring billing & auto-charge</li>
        <li>• Team management with roles & hierarchy</li>
        <li>• Resources library for training & compliance</li>
        <li>• Real-time notifications with chime</li>
        <li>• Revenue & performance reporting</li>
        <li>• Installable PWA (works like native app)</li>
        <li>• White-label ready</li>
        <li>• Activity tracking for compliance</li>
      </ul>
    </div>
  </div>
);

export default function AuthPageClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("register");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (form: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const payload = Object.fromEntries(form.entries());
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        const txt = await res.text();
        setMessage(txt || "Something went wrong. Please try again.");
      }
    });
  };

  return heroWrapper(
    <>
      {heroCopy}
      <div className="flex gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-white">
        <button
          onClick={() => setMode("register")}
          className={`flex-1 rounded-full px-3 py-2 transition ${mode === "register" ? "bg-white text-purple-900 shadow" : "bg-white/10 hover:bg-white/20"}`}
        >
          Register
        </button>
        <button
          onClick={() => setMode("login")}
          className={`flex-1 rounded-full px-3 py-2 transition ${mode === "login" ? "bg-white text-purple-900 shadow" : "bg-white/10 hover:bg-white/20"}`}
        >
          Login
        </button>
      </div>

      <form
        className="space-y-4 text-white"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit(new FormData(e.currentTarget));
        }}
      >
        <div className="space-y-1 text-sm">
          <label>Email</label>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
          />
        </div>

        <div className="space-y-1 text-sm">
          <label>Password</label>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm text-white placeholder-white/70 shadow-sm focus:border-white focus:outline-none focus:ring-2 focus:ring-white/40"
          />
        </div>

        <p className="text-xs text-right">
          <Link href="/reset-password" className="text-white/70 underline-offset-2 hover:underline">
            Forgot your password?
          </Link>
        </p>

        {message && <p className="text-xs text-rose-300">{message}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="w-full rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-purple-900 shadow-lg transition cursor-pointer hover:opacity-90 disabled:opacity-60"
        >
          {isPending ? "Working..." : mode === "login" ? "Login" : "Create account"}
        </button>
      </form>

    </>,
  );
}
