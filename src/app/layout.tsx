import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { User } from "lucide-react";
import { PWARegister } from "./PWARegister";
import { InstallPromptButton } from "./InstallPromptButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ClientWave - Client & Invoicing Management Made Simple",
  description: "ClientWave - Client & Invoicing Management Made Simple",
  manifest: "/manifest.webmanifest",
};

export const viewport = {
  themeColor: "#4f46e5",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();
  const hasLogo =
    user?.logoDataUrl &&
    (() => {
      try {
        new URL(user.logoDataUrl);
        return true;
      } catch {
        return false;
      }
    })();

  return (
    <html lang="en">
      <head>
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1144687877247453"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        <PWARegister />
        <header className="border-b border-zinc-200 bg-white relative overflow-hidden w-full">
          <div className="grid-overlay absolute inset-0 opacity-25" />
          <div className="mx-auto flex max-w-6xl items-center justify-between px-0 sm:px-8 lg:px-10 py-3">
            <Link href="/" className="group flex items-center gap-4">
              <span className="rounded-full bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 px-5 py-3 text-md font-bold tracking-[0.3em] text-white flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center">
                  <svg viewBox="0 0 24 16" className="h-full w-full stroke-white" fill="none">
                    <path
                      d="M1 12C5 3 9 13 13 4s7 14 11 6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <path
                      d="M1 14C5 7 9 15 13 7s7 12 11 8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      opacity="0.6"
                    />
                  </svg>
                </span>
                ClientWave
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <InstallPromptButton />
              {user ? (
                <form action="/api/auth/logout" method="post" className="flex items-center gap-3">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-2"
                  >
                    {hasLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.logoDataUrl as string}
                        alt="Logo"
                        className="h-10 w-10 rounded-full object-cover border border-zinc-200"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500">
                        <User size={20} />
                      </div>
                    )}
                  </Link>
                  <button
                    type="submit"
                    className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 cursor-pointer"
                  >
                    Logout
                  </button>
                </form>
              ) : null}
            </div>
          </div>
        </header>
        <main className="min-h-screen w-full bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 px-0 sm:px-0 py-0">
          <div className="mx-auto w-full max-w-6xl px-0 sm:px-8 lg:px-10">{children}</div>
        </main>
      </body>
    </html>
  );
}
