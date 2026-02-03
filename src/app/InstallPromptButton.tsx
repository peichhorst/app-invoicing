'use client';

import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

type Props = {
  className?: string;
  style?: CSSProperties;
};

export function InstallPromptButton({ className = '', style }: Props) {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [isRelatedInstalled, setIsRelatedInstalled] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const token = window ? setTimeout(() => setHydrated(true), 0) : null;
    const detectStandalone = () => {
      if (typeof window === 'undefined') return false;
      const anyStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches;
      const iosStandalone = (window.navigator as any)?.standalone === true;
      return anyStandalone || iosStandalone;
    };
    const isInstalled = detectStandalone();
    setInstalled(isInstalled);
    setIsStandalone(isInstalled);
    if (isInstalled) {
      setPromptEvent(null);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setIsStandalone(true);
      setPromptEvent(null);
    };

    // If already running in standalone, hide the button
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (event: MediaQueryListEvent) => {
      setInstalled(event.matches);
      setIsStandalone(event.matches);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    displayModeQuery.addEventListener('change', handleDisplayModeChange);
    const onlineHandler = () => setIsOnline(true);
    const offlineHandler = () => setIsOnline(false);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    const checkRelated = async () => {
      try {
        if ('getInstalledRelatedApps' in navigator) {
          // @ts-expect-error experimental
          const related = await navigator.getInstalledRelatedApps();
          if (Array.isArray(related) && related.length > 0) {
            setIsRelatedInstalled(true);
            setInstalled(true);
          } else {
            setIsRelatedInstalled(false);
          }
        }
      } catch {
        // ignore
      }
    };
    void checkRelated();

    try {
      if (localStorage.getItem('cw_post_install_toast') === '1') {
        setShowToast(true);
        localStorage.removeItem('cw_post_install_toast');
      }
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      displayModeQuery.removeEventListener('change', handleDisplayModeChange);
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      if (token) clearTimeout(token);
    };
  }, []);

  if (!hydrated) return null;

  const hasPrompt = Boolean(promptEvent) && !installed && !isRelatedInstalled && isOnline;
  const canInstall = hasPrompt;
  if (isStandalone) return null;

  const handleInstall = async () => {
    if (!promptEvent) {
      handleOpenOffline();
      return;
    }
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      setPromptEvent(null);
      setInstalled(true);
    }
  };

  const handleOpenOffline = () => {
    window.location.href = '/';
  };

  const baseClasses =
    'h-12 rounded-full border shadow-xl shadow-brand-primary-200/60 transition flex items-center justify-center gap-2 px-4';
  const installClasses = 'border-brand-primary-200 bg-white text-brand-primary-700 hover:bg-brand-primary-50 cursor-pointer';
  const offlineClasses = 'border-white/60 bg-white/90 text-brand-primary-700 hover:bg-white cursor-pointer';

  return (
    <>
      <button
        type="button"
        aria-label={canInstall ? 'Install app' : 'Open offline'}
        onClick={canInstall ? handleInstall : handleOpenOffline}
        className={`${baseClasses} ${canInstall ? installClasses : offlineClasses} ${className}`}
        style={style}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {canInstall ? (
            <>
              <path d="M12 3v12" />
              <path d="m8 11 4 4 4-4" />
              <path d="M5 19h14" />
            </>
          ) : (
            <>
              <path d="M4 17v2a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2" />
              <polyline points="7 9 12 14 17 9" />
            </>
          )}
        </svg>
        <span className="hidden font-semibold uppercase tracking-wider text-[10px] sm:inline">Download App</span>
      </button>
      {showToast && (
        <div className="fixed left-1/2 bottom-20 z-50 -translate-x-1/2 max-w-sm rounded-xl border border-brand-primary-100 bg-white shadow-lg shadow-brand-primary-100/60">
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-primary-50 text-brand-primary-700">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4" />
                <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" />
              </svg>
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-semibold text-zinc-900">Installed</p>
              <p className="text-xs text-zinc-600">Open from your home screen, or launch offline now.</p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleOpenOffline}
                  className="rounded-full bg-brand-primary-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-brand-primary-700"
                >
                  Open offline
                </button>
                <button
                  type="button"
                  onClick={() => setShowToast(false)}
                  className="rounded-full border border-zinc-200 px-3 py-1 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
