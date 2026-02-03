"use client";

import { useCallback, useEffect, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/components/Logo";
import AppHeader from "@/components/AppHeader";
import { GoogleIcon } from "@/components/GoogleIcon";
import { InstallPromptButton } from "@/app/InstallPromptButton";
import { ThemeToggle } from "@/components/ThemeToggle";

type Mode = "login" | "register";

const heroWrapper = (content: ReactNode) => (
  <div
    className="relative flex min-h-screen items-start justify-center overflow-hidden bg-gray-50 dark:bg-zinc-950 px-4 py-4 sm:px-6 lg:px-8"
  >
    <div className="relative w-full max-w-4xl space-y-6 rounded-3xl border border-white/10 dark:border-zinc-800 bg-brand-primary-700 dark:bg-zinc-900 p-6 shadow-2xl backdrop-blur mt-2">
      {content}
    </div>
  </div>
);

const heroCopy = (
  <div className="grid gap-8 md:grid-cols-2">
    <div className="space-y-3">
      <h1 className="text-3xl font-bold text-white">ClientWave</h1>
      <p className="text-xl text-white font-semibold text-brand-primary-100 leading-tight">The all-in-one business app for freelancers and agencies.</p>
      <p className="text-md text-white/90 leading-relaxed">ClientWave is the modern, installable app that lets you run your entire business from one place — invoicing, payments, client management, team collaboration, and more — with a beautiful, fast interface that feels like native software on your phone or desktop.</p>
      <div className="space-y-3 rounded-2xl border border-white/10 bg-white p-4 text-brand-primary-700 shadow-inner shadow-black/20">
        <ul className="space-y-1 text-lg font-semibold text-brand-primary-700">
          <li>• 30 Day Pro Trial</li>
          <li>
            • $9.99 / Month After Trial
            <span className="ml-4 block text-[0.7em] text-brand-primary-400">* Introductory Price</span>
          </li>
        </ul>
      </div>
    </div>
    <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-white shadow-inner shadow-black/20">
      <p className="text-xs uppercase tracking-[0.3em] text-brand-primary-100">KEY FEATURES</p>
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
        <li>• Activity tracking for compliance</li>
        <li>• White-label ready</li>
      </ul>
    </div>
  </div>
);

export default function AuthPageClient() {
  // Only declare router and hooks once, and before any function that uses them
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("register");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [googleReady, setGoogleReady] = useState(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  // Define handleGoogleCredential using the single router instance
  const handleGoogleCredential = useCallback(
    (credential: string) => {
      setMessage(null);
      if (!credential) return;
      startTransition(async () => {
        try {
          const res = await fetch("/api/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: credential }),
          });
          if (!res.ok) {
            const text = await res.text();
            setMessage(text || "Google sign-in failed. Please try again.");
            return;
          }
          const data = await res.json();
          const destination = data.registered ? "/dashboard/onboarding" : "/dashboard";
          router.push(destination);
          router.refresh();
        } catch (error) {
          setMessage("Google sign-in failed. Please try again.");
        }
      });
    },
    [router, startTransition]
  );

  // Define handleSubmit using the single router instance
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
        const destination = mode === "register" ? "/dashboard/onboarding" : "/dashboard";
        router.push(destination);
        router.refresh();
      } else {
        const txt = await res.text();
        setMessage(txt || "Something went wrong. Please try again.");
      }
    });
  };

  // ...existing code...

  // All logic and hooks remain unchanged

  return (
    <>
      <AppHeader user={null} />
      <ThemeToggle />
      {heroWrapper(
        <>
          {heroCopy}

          <form
            className="space-y-4 text-white"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(new FormData(e.currentTarget));
            }}
          >
            <div className="space-y-2 pt-0 hover:bg-brand-primary-50  rounded-2xl border border-white/10 bg-white px-4 py-4 text-center text-brand-primary-700 shadow-lg">
              {googleClientId ? (
                <div id="google-signin-button" className="w-full" />
              ) : (
                <p className="text-xs text-zinc-500">
                  Google sign-in is disabled until `NEXT_PUBLIC_GOOGLE_CLIENT_ID` is configured.
                </p>
              )}
              {googleClientId && !googleReady && (
                <button
                  type="button"
                  onClick={async () => {
                    if (window.google?.accounts?.id?.prompt) {
                      window.google.accounts.id.prompt();
                    } else {
                      if (!document.getElementById("google-gsi-script")) {
                        const script = document.createElement("script");
                        script.id = "google-gsi-script";
                        script.src = "https://accounts.google.com/gsi/client";
                        script.async = true;
                        script.defer = true;
                        script.onload = () => {
                          setTimeout(() => {
                            window.google?.accounts?.id?.initialize?.({
                              client_id: googleClientId,
                              callback: (response) => handleGoogleCredential(response.credential),
                              ux_mode: "popup",
                            });
                            window.google?.accounts?.id?.prompt?.();
                          }, 100);
                        };
                        document.head.appendChild(script);
                      }
                    }
                  }}
                  className="mt-2 w-full flex items-center justify-center gap-2 rounded-2xl border border-white/30 bg-white px-3 pt-2 pb-0 text-xs font-semibold text-brand-primary-700 transition"
                >
                  <GoogleIcon className="h-4 w-5 mr-1" />
                  Login / Register with Google
                </button>
              )}
            </div>
            <p className="text-lg text-white text-center">OR:</p>
            <div className="flex gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-white">
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`flex-1 rounded-full px-3 py-2 transition ${
                  mode === "register"
                    ? "bg-white text-brand-primary-900 shadow"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 rounded-full px-3 py-2 transition ${
                  mode === "login"
                    ? "bg-white text-brand-primary-900 shadow"
                    : "bg-white/10 hover:bg-white/20"
                }`}
              >
                Login
              </button>
            </div>
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
              className="w-full rounded-2xl bg-white text-brand-primary-700 px-4 py-3 text-sm font-semibold shadow-lg transition cursor-pointer hover:opacity-90 disabled:opacity-60"
            >
              {isPending ? "Working..." : mode === "login" ? "Login" : "Create Account"}
            </button>
          </form>

          <div className="pt-3 text-center">
            <Link href="/privacy-policy" className="text-sm text-white/70 underline-offset-4 underline hover:underline">
              View Privacy Policy
            </Link>
            <span className="mx-2 text-white/40">|</span>
            <Link href="/end-user-license-agreement" className="text-sm text-white/70 underline-offset-4 underline hover:underline">
              End-User License Agreement
            </Link>
            <span className="mx-2 text-white/40">|</span>
            <Link href="/contact" className="text-sm text-white/70 underline-offset-4 underline hover:underline">
              Contact Support
            </Link>
          </div>
          <div className="pt-4 pb-2 flex justify-center">
            <InstallPromptButton />
          </div>
        </>
      )}
    </>
  );
}
