// ============================================================
//  Service Worker — eBay Listing Manager PWA
//  Caches the app shell for offline use.
//  API calls (Google Apps Script) are always fetched live.
// ============================================================

const CACHE_NAME = "ebay-listing-mgr-v1";

// Files to cache on install (app shell)
const STATIC_ASSETS = [
  "./index.html",
  "./manifest.json"
];

// ── Install ──────────────────────────────────────────────────
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log("[SW] Caching app shell");
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately without waiting for old SW to unload
  self.skipWaiting();
});

// ── Activate ─────────────────────────────────────────────────
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          })
      )
    )
  );
  self.clients.claim();
});

// ── Fetch ────────────────────────────────────────────────────
self.addEventListener("fetch", event => {
  const url = event.request.url;

  // Always fetch Google Apps Script calls from the network
  if (url.includes("script.google.com")) {
    event.respondWith(fetch(event.request));
    return;
  }

  // For everything else: cache-first strategy
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;

      // Not in cache — fetch from network and store a copy
      return fetch(event.request).then(response => {
        // Only cache valid responses
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }
        const cloned = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        return response;
      });
    })
  );
});
