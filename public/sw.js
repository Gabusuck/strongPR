const CACHE_NAME = 'strongpr-cache-v74';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/exercises.json',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png'
];

let restTimerTimeoutId = null;

// Install Event - Skip waiting immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
});

// Activate Event - Claim clients and purge old cache versions
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Network First for all requests so deploys on mobile update immediately
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseToCache));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') return caches.match('/index.html');
          return null;
        });
      })
  );
});

// Background Timer Messages from App
self.addEventListener('message', (event) => {
  if (!event.data) return;

  if (event.data.type === 'SCHEDULE_REST_TIMER') {
    if (restTimerTimeoutId) {
      clearTimeout(restTimerTimeoutId);
      restTimerTimeoutId = null;
    }

    const targetEndTime = event.data.endTime;
    const delay = Math.max(0, targetEndTime - Date.now());

    restTimerTimeoutId = setTimeout(() => {
      self.registration.showNotification(event.data.title || 'Tempo de Descanso Concluído! ⏱️', {
        body: event.data.body || 'Está na hora de começares a próxima série!',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'strongpr-rest-timer',
        renotify: true,
        vibrate: [250, 100, 250, 100, 250],
        data: { url: '/' }
      });
      restTimerTimeoutId = null;
    }, delay);
  } else if (event.data.type === 'CANCEL_REST_TIMER') {
    if (restTimerTimeoutId) {
      clearTimeout(restTimerTimeoutId);
      restTimerTimeoutId = null;
    }
  }
});

// Notification Click Handler - brings PWA to foreground
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});
