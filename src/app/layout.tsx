import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { PWARegister } from "./PWARegister";
import AppHeader from "@/components/AppHeader";
import { MobileSidebarProvider } from "@/components/MobileSidebarContext";
import { HrefEmptyDebugger } from "@/components/HrefEmptyDebugger";
import { HrefEmptyOverlay } from "@/components/HrefEmptyOverlay";
import { GlobalSounds } from "@/components/GlobalSounds";
import { InviteConfirmListener } from "@/components/InviteConfirmListener";

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
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1144687877247453"
          crossOrigin="anonymous"
        ></script>
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
      >
        {process.env.NODE_ENV === "development" ? <HrefEmptyDebugger /> : null}
        <HrefEmptyOverlay />
        <PWARegister />
        <GlobalSounds />
        <InviteConfirmListener userId={user?.id} />
        <MobileSidebarProvider>
          {user && (
            <AppHeader
              user={{
                name: user.name,
                email: user.email,
                role: user.role,
                companyName: user.companyName,
                logoDataUrl: hasLogo ? (user.logoDataUrl as string) : undefined,
              }}
              isOnboarding={user.company ? !user.company.isOnboarded : false}
            />
          )}
          <main className="min-h-screen w-full bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 px-0 sm:px-0 py-0">
            <div className="mx-auto w-full max-w-6xl px-0 sm:px-8 lg:px-10">{children}</div>
          </main>
        </MobileSidebarProvider>
      </body>
    </html>
  );
}
