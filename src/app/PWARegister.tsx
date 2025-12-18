'use client';

import { useEffect } from 'react';

export function PWARegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    const detectInstalled = () => {
      const anyStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: minimal-ui)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches ||
        (window.navigator as any)?.standalone === true;
      let flag = false;
      try {
        flag = localStorage.getItem('cw_pwa_installed') === 'true';
      } catch {
        // ignore
      }
      return anyStandalone || flag;
    };

    const promptAndReload = (waiting: ServiceWorker | null, installed: boolean) => {
      if (!waiting) return;
      if (installed) {
        const accepted = window.confirm('A new version is available. Reload to update?');
        if (accepted) {
          waiting.postMessage({ type: 'SKIP_WAITING' });
        }
      } else {
        // For non-installed (browser) sessions, just activate silently without prompting
        waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    };

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js');
        const installed = detectInstalled();

        if (reg.waiting) {
          promptAndReload(reg.waiting, installed);
        }

        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing;
          if (!newSW) return;
          newSW.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              promptAndReload(reg.waiting || newSW, installed);
            }
          });
        });
      } catch (err) {
        console.error('Service worker registration failed', err);
      }
    };
    register();
  }, []);

  return null;
}
