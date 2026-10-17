/* Service worker: makes the tuner work offline once it has been opened.
 *
 * Strategy "stale while revalidate": a cached file is served immediately and refreshed in
 * the background, so an update of the site shows up on the following visit.
 * Bump the date or the counter in CACHE_NAME when the list of files below changes:
 * the old cache is then deleted. */

const CACHE_NAME = 'guitoune-2026-10-17-5';

const SHELL = [
  './',
  'index.html',
  'pitch.js',
  'guitoune_howto.svg',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/favicon-32.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-192.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  // Only the site's own GET requests are handled; everything else goes straight to the network
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(request, {ignoreSearch: true}).then(cached => {
        const refreshed = fetch(request).then(response => {
          if (response.ok) cache.put(request, response.clone());
          return response;
        }).catch(() => cached);   // offline: fall back to the cached copy (or fail if none)
        return cached || refreshed;
      })
    )
  );
});
