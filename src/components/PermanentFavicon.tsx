'use client';

import { useEffect } from 'react';

const candidatePaths = [
  '/apple-touch-icon.png',
  '/apple-touch-icon-180x180.png',
  '/apple-touch-icon-152x152.png',
  '/apple-touch-icon-precomposed.png',
];

const normalizeOrigin = (value: string) => {
  try {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const url = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
    return new URL(url).origin;
  } catch {
    return null;
  }
};

const setFavicon = (href: string) => {
  let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = href;
};

export function PermanentFavicon({
  savedLogoUrl,
  website,
}: {
  savedLogoUrl: string | null;
  website: string | null;
}) {
  useEffect(() => {
    if (savedLogoUrl) {
      setFavicon(savedLogoUrl);
      return;
    }
    if (!website?.trim()) {
      return;
    }
    const origin = normalizeOrigin(website);
    if (!origin) return;
    let cancelled = false;
    (async () => {
      for (const path of candidatePaths) {
        if (cancelled) return;
        try {
          const res = await fetch(origin + path, { cache: 'no-store' });
          if (!res.ok) continue;
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          await new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.src = url;
            img.onload = () => {
              URL.revokeObjectURL(url);
              if (img.naturalWidth >= 100 && img.naturalHeight >= 100) {
                setFavicon(res.url ?? origin + path);
                resolve();
              } else {
                resolve();
              }
            };
            img.onerror = () => {
              URL.revokeObjectURL(url);
              reject(new Error('img load failed'));
            };
          });
          return;
        } catch {
          continue;
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [savedLogoUrl, website]);

  return null;
}
