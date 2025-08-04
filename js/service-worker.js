const CACHE_NAME = "poke-guide-cache-v1";
const PRECACHE_URLS = [
  "/",
  "/index.html",
  "/style.css",
  "/js/app.js",
  // Legg til flere filer du vil pre-cache her, f.eks. manifest, bilder osv.
];

// Install event - ingen automatisk caching, bare aktiver service worker umiddelbart
self.addEventListener("install", event => {
  self.skipWaiting();
});

// Activate event - fjern gamle cacher
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch event - bruk cache først, fallback til nettverk
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request);
    })
  );
});

// Lytt på melding fra klient for å pre-cache alle filer
self.addEventListener("message", event => {
  if (event.data && event.data.type === "PRECACHE_ALL") {
    event.waitUntil(
      caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
    );
  }
});
