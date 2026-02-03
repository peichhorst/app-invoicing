const CACHE_NAME = 'clientwave-shell-v2';
const ASSETS = ['/', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png', '/payment-chime.mp3'];

// Precache a small shell for offline fallback
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GETs and skip API or other dynamic data to avoid stale caches
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  // Never cache Next.js runtime/build assets; always go to network so updates apply immediately
  if (
    url.pathname.startsWith('/_next') ||
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/_next/data')
  ) {
    return; // let network handle it
  }

  // Cache-first for build assets and static files
  const isStaticAsset =
    url.pathname.startsWith('/_next/image') ||
    (url.origin === self.location.origin &&
      /\.(?:png|svg|ico|jpg|jpeg|gif|webp|avif|woff2?|ttf)$/i.test(url.pathname));
  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
            return response;
          })
          .catch(() => cached);
      }),
    );
    return;
  }

  // Network-first for navigation requests, cache-first for static assets
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('/') || caches.match('/offline'))
    );
    return;
  }

  if (ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        });
      })
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json?.() ?? {};
  } catch {
    try {
      data = JSON.parse(event.data?.text?.() ?? '{}');
    } catch {
      data = {};
    }
  }

  const options = {
    body: data.body || 'You have a new update in ClientWave.',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    sound: '/payment-chime.mp3',
    data: {
      url: data.url || '/dashboard',
    },
  };

  event.waitUntil(self.registration.showNotification(data.title || 'ClientWave', options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/dashboard';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
