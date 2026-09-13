const CACHE = 'alpha11-v8';
const SHELL = [
  '/',
  '/lab/',
  '/jump/',
  '/shift/',
  '/rush/',
  '/sniper/',
  '/kick/',
  '/partners/',
  '/vintage/stack/',
  '/vintage/sudoku/',
  '/vintage/space/',
  '/vintage/fight/',
  '/vintage/credits/',
  '/arcade/',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) {
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match('/'));
    }),
  );
});
