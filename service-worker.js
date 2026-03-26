// ── PPL Split Service Worker ──────────────────────────────────────────────────
// Cache strategy:
//   • App shell (HTML, manifest, icons) → Cache-First (instant offline load)
//   • Google Fonts                      → Network-First, then cache fallback
//
// To push an update to users: bump CACHE_NAME to 'ppl-split-v2', etc.
// The activate handler will automatically purge the old cache.
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = 'ppl-split-v22';

const PRECACHE_URLS = [
  './ppl_training_split.html',
  './manifest.json',
  './icons/icon-120.png',
  './icons/icon-152.png',
  './icons/icon-167.png',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// ── Install: pre-cache everything immediately ─────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())   // activate right away, don't wait for old tabs to close
  );
});

// ── Activate: delete stale caches from old versions ──────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())  // take control of all open tabs immediately
  );
});

// ── Fetch: route requests to the right strategy ───────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Google Fonts: Network-First so fonts stay fresh, cache as fallback for offline
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Everything else: Cache-First (app shell, icons, manifest)
  event.respondWith(
    caches.match(event.request)
      .then(cached => {
        if (cached) return cached;

        // Not in cache yet — fetch, store, and return
        return fetch(event.request).then(response => {
          if (
            !response ||
            response.status !== 200 ||
            response.type === 'opaque'   // cross-origin response — don't cache
          ) {
            return response;
          }
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        });
      })
  );
});
