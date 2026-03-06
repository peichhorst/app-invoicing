"use client";

import { useCallback, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GoogleIcon } from "@/components/GoogleIcon";
import DevDbHealthBanner from "@/components/DevDbHealthBanner";

type Mode = "login" | "register";
type AuthContext = "login" | "register" | "google";

async function readUserFacingAuthError(response: Response, context: AuthContext): Promise<string> {
  let message = "";
  try {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as { error?: string; message?: string };
      message = (payload?.error || payload?.message || "").trim();
    } else {
      message = (await response.text()).trim();
    }
  } catch {
    message = "";
  }

  if (context === "google") {
    if (/verified email/i.test(message)) {
      return "Please use a Google account with a verified email.";
    }
    return "Google sign-in failed. Please try again.";
  }

  if (/invalid credentials/i.test(message)) {
    return "Incorrect email or password. Please try again.";
  }
  if (/email and password are required/i.test(message)) {
    return "Please enter both email and password.";
  }
  if (/email already registered/i.test(message)) {
    return "That email is already in use. Try logging in instead.";
  }
  if (/database unavailable/i.test(message)) {
    return "Service is temporarily unavailable. Please try again.";
  }

  return context === "register"
    ? "Registration failed. Please try again."
    : "Login failed. Please try again.";
}

const heroWrapper = (content: ReactNode) => (
  <div className="flex min-h-[calc(100vh-85px)] w-full -mt-px items-start justify-center bg-[#d8e6f2] px-4 py-12 pt-16">
    <div className="relative w-full max-w-2xl space-y-6 rounded-3xl bg-white/90 p-8 shadow-xl">
      {content}
    </div>
  </div>
);

export default function AuthPageClient() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("register");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [googleReady, setGoogleReady] = useState(false);
  const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleGoogleCredential = useCallback(
    (credential: string) => {
      setMessage(null);
      if (!credential) return;
      startTransition(async () => {
        try {
          const res = await fetch("/api/auth/google", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idToken: credential }),
          });
          if (!res.ok) {
            setMessage(await readUserFacingAuthError(res, "google"));
            return;
          }
          const data = await res.json();
          const destination = data.registered ? "/dashboard/onboarding" : "/dashboard";
          router.push(destination);
          router.refresh();
        } catch {
          setMessage("Google sign-in failed. Please try again.");
        }
      });
    },
    [router, startTransition]
  );

  const handleSubmit = (form: FormData) => {
    setMessage(null);
    startTransition(async () => {
      const payload = Object.fromEntries(form.entries());
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";

      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const destination = mode === "register" ? "/dashboard/onboarding" : "/dashboard";
        router.push(destination);
        router.refresh();
      } else {
        setMessage(await readUserFacingAuthError(res, mode));
      }
    });
  };

  return (
    <>
      {heroWrapper(
        <>
          <div className="space-y-1 text-center">
            <h1 className="text-3xl font-bold text-brand-primary-700">Login / Register</h1>
            <p className="text-sm text-zinc-600">Access Your ClientWave Workspace.</p>
            <p className="mx-auto max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800">
              ClientWave is in early access. Core billing and client management are stable, but new features will continue to roll out.
            </p>
          </div>
          <DevDbHealthBanner />

          <form
            className="space-y-5 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-900 sm:p-5"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit(new FormData(e.currentTarget));
            }}
          >
            <div className="space-y-2 rounded-2xl border border-brand-primary-100 bg-white px-4 py-4 text-center text-brand-primary-700 shadow-sm">
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
                    } else if (!document.getElementById("google-gsi-script")) {
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
                  }}
                  className="btn-ui btn-ui-primary mt-2 flex w-full items-center justify-center gap-2 text-sm shadow-sm"
                >
                  <GoogleIcon className="mr-1 h-4 w-5" />
                  Login / Register with Google
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Or</p>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            <div className="flex gap-2 text-sm font-semibold uppercase tracking-[0.3em] text-zinc-700">
              <button
                type="button"
                onClick={() => setMode("register")}
                className={`flex-1 transition ${mode === "register" ? "btn-ui btn-ui-primary" : "btn-ui btn-ui-secondary"}`}
              >
                Register
              </button>
              <button
                type="button"
                onClick={() => setMode("login")}
                className={`flex-1 transition ${mode === "login" ? "btn-ui btn-ui-primary" : "btn-ui btn-ui-secondary"}`}
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
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-500/20"
              />
            </div>

            <div className="space-y-1 text-sm">
              <label>Password</label>
              <input
                name="password"
                type="password"
                required
                className="w-full rounded-2xl border border-zinc-300 bg-white px-4 py-2 text-sm text-zinc-900 placeholder-zinc-400 shadow-sm focus:border-brand-primary-500 focus:outline-none focus:ring-2 focus:ring-brand-primary-500/20"
              />
            </div>

            <p className="text-right text-xs">
              <Link href="/reset-password" className="text-zinc-600 underline-offset-2 hover:underline">
                Forgot your password?
              </Link>
            </p>

            {message && <p className="text-xs text-rose-600">{message}</p>}

            <button
              type="submit"
              disabled={isPending}
              className="btn-ui btn-ui-primary w-full cursor-pointer text-sm shadow-sm disabled:opacity-60"
            >
              {isPending ? "Working..." : mode === "login" ? "Login" : "Create Account"}
            </button>
          </form>

          <div className="pt-3 text-center">
            <Link href="/privacy-policy" className="text-sm text-zinc-600 underline underline-offset-4 hover:underline">
              View Privacy Policy
            </Link>
            <span className="mx-2 text-zinc-400">|</span>
            <Link href="/terms-of-service" className="text-sm text-zinc-600 underline underline-offset-4 hover:underline">
              Terms of Service
            </Link>
            <span className="mx-2 text-zinc-400">|</span>
            <Link href="/end-user-license-agreement" className="text-sm text-zinc-600 underline underline-offset-4 hover:underline">
              End-User License Agreement
            </Link>
            <span className="mx-2 text-zinc-400">|</span>
            <Link href="/contact" className="text-sm text-zinc-600 underline underline-offset-4 hover:underline">
              Contact Support
            </Link>
          </div>
        </>
      )}
    </>
  );
}
