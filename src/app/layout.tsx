import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { User } from "lucide-react";
import { PWARegister } from "./PWARegister";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SuperInvoicing",
  description: "SuperInvoicing",
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
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <PWARegister />
        <header className="border-b border-zinc-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <Link href="/" className="text-xl font-semibold tracking-tight text-zinc-900 flex items-center gap-2">
              <span className="rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-bold uppercase text-white">
                Super
              </span>
              <span className="text-2xl font-bold">Invoicing</span>
            </Link>
            {user ? (
              <form action="/api/auth/logout" method="post" className="flex items-center gap-3">
                <div className="flex items-center gap-2">
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
                  <Link href="/dashboard/profile" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                    Edit Profile
                  </Link>
                </div>
                <button
                  type="submit"
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 cursor-pointer"
                >
                  Logout
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-3 text-sm" />
            )}
          </div>
        </header>
        <main className="mx-auto max-w-6xl">{children}</main>
      </body>
    </html>
  );
}
