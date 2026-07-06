/* Eduhistory production service worker. Keep this file dependency-free. */
const CACHE_VERSION = "eduhistory-pwa-v1";
const STATIC_CACHE = `${CACHE_VERSION}:static`;
const RUNTIME_CACHE = `${CACHE_VERSION}:runtime`;
const IMAGE_CACHE = `${CACHE_VERSION}:images`;

const PRECACHE_URLS = [
  "/",
  "/kurslar",
  "/offline",
  "/manifest.webmanifest",
  "/eduhistory-logo.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-192.png",
  "/icons/maskable-512.png",
];

const isSameOrigin = (url) => url.origin === self.location.origin;

const shouldBypass = (request, url) => {
  if (request.method !== "GET") return true;
  if (!isSameOrigin(url)) return true;
  if (url.pathname.startsWith("/api/auth")) return true;
  if (url.pathname.startsWith("/api/quiz/submit")) return true;
  if (url.pathname.startsWith("/api/upload")) return true;
  if (url.pathname.startsWith("/_next/webpack-hmr")) return true;
  return false;
};

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)));
}

async function networkFirst(request, fallbackUrl = "/offline") {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone()).catch(() => undefined);
      trimCache(RUNTIME_CACHE, 80).catch(() => undefined);
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    return cached ?? caches.match(fallbackUrl);
  }
}

async function staleWhileRevalidate(request, cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone()).catch(() => undefined);
        trimCache(cacheName, maxEntries).catch(() => undefined);
      }
      return response;
    })
    .catch(() => cached);
  return cached ?? networkPromise;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (shouldBypass(request, url)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname === "/manifest.webmanifest") {
    event.respondWith(staleWhileRevalidate(request, STATIC_CACHE, 120));
    return;
  }

  if (
    request.destination === "image" ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/uploads/")
  ) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, 120));
  }
});
