import type { Metadata } from "next";
import type React from "react";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { PWARegister } from "./PWARegister";
import AppHeader from "@/components/AppHeader";
import { MobileSidebarProvider } from "@/components/MobileSidebarContext";
import { DevHrefEmptyDebugger } from "@/components/DevHrefEmptyDebugger";
import { HrefEmptyOverlay } from "@/components/HrefEmptyOverlay";
import { GlobalSounds } from "@/components/GlobalSounds";
import { InviteConfirmListener } from "@/components/InviteConfirmListener";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ThemeProvider } from "@/components/ThemeProvider";
import FloatingChatButton from "@/components/FloatingChatButton";

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

  // Set all accent and primary color CSS variables to primaryColor if provided, else use defaults
  const primaryColorRaw = user?.company?.primaryColor;
  const primaryColorMap: Record<string, string> = {
    purple: '#a855f7',
    blue: '#1d4ed8',
    green: '#22c55e',
    red: '#ef4444',
    // Add more as needed
  };
  const primaryColor = primaryColorRaw ? (primaryColorMap[primaryColorRaw] || primaryColorRaw) : null;
  const colorVars = [50,100,200,300,400,500,600,700,800,900,950] as const;
  const defaultColors: Record<typeof colorVars[number], string> = {
    50: '#eff6ff',
    100: 'transparent',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#1d4ed8',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
    950: '#172554',
  };

  const computeContrast = (hex?: string | null) => {
    if (!hex) return '#0f172a';
    const cleaned = hex.replace('#', '');
    if (cleaned.length !== 6) return '#0f172a';
    const r = parseInt(cleaned.slice(0, 2), 16) / 255;
    const g = parseInt(cleaned.slice(2, 4), 16) / 255;
    const b = parseInt(cleaned.slice(4, 6), 16) / 255;
    const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    const [R, G, B] = [r, g, b].map(toLinear);
    const luminance = 0.2126 * R + 0.7152 * G + 0.0722 * B;
    return luminance > 0.5 ? '#0f172a' : '#ffffff';
  };

  const contrastColor = computeContrast(primaryColor || defaultColors[500]);
  const isOnboarding = user?.company && user.company.isOnboarded === false;
  // During onboarding/login screens keep logo text in brand color (avoid white-on-light); otherwise use contrast
  const logoTextColor = isOnboarding ? (primaryColor || defaultColors[700]) : contrastColor;
  const htmlStyle = colorVars.reduce((acc, shade) => {
    const key = shade;
    const base = defaultColors[key];
    const shouldOverride = primaryColor && (key === 500 || key === 600 || key === 700);
    const color = shouldOverride ? primaryColor : base;
    acc[`--color-brand-accent-${key}`] = color;
    acc[`--color-brand-primary-${key}`] = color;
    return acc;
  }, {} as Record<string, string>);
  const sidebarTextColor =
    logoTextColor === '#ffffff' ? 'var(--color-brand-primary-500)' : logoTextColor;
  htmlStyle['--color-brand-contrast'] = contrastColor;
  htmlStyle['--color-brand-logo-text'] = logoTextColor;
  htmlStyle['--color-brand-sidebar-text'] = sidebarTextColor;

  return (
    <html lang="en" suppressHydrationWarning style={htmlStyle as React.CSSProperties}>
      <head>
        <link rel="icon" href="/icon-192.png" type="image/png" />
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
        <ThemeProvider>
          <DevHrefEmptyDebugger />
          <HrefEmptyOverlay />
          <PWARegister />
          <GlobalSounds />
          <InviteConfirmListener userId={user?.id} />
          <ScrollToTop />
            <MobileSidebarProvider>
            {user && (
            <AppHeader
              key={`${user.name}-${user.company?.isOnboarded}`}
              user={{
                name: user.name,
                email: user.email,
                role: user.role,
                companyName: user.companyName,
                logoDataUrl: hasLogo ? (user.logoDataUrl as string) : undefined,
                companyLogoUrl: user.company?.logoUrl ?? undefined,
                companyPrimaryColor: user.company?.primaryColor ?? null,
                companyId: user.company?.id ?? null,
                useHeaderLogo: user.company?.useHeaderLogo ?? false,
              }}
              isOnboarding={user.company ? !user.company.isOnboarded : false}
            />
            )}
            <main className="min-h-screen w-full bg-white dark:bg-zinc-900 bg-gradient-to-r- from-brand-primary-700 via-brand-secondary-700 to-brand-accent-700 px-0 sm:px-0 py-0 pt-[85px]">
              <div className="mx-auto w-full max-w-none px-0 sm:px-0 lg:px-0">{children}</div>
            </main>
            <FloatingChatButton />
          </MobileSidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
