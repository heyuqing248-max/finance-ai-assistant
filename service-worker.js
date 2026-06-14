const CACHE_NAME = "finance-ai-assistant-v112";
const RUNTIME_CACHE_NAME = "finance-ai-assistant-runtime-v1";
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.json",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg",
];
const NAVIGATION_FALLBACK_URL = "./index.html";
const APP_SHELL_ASSET_PATTERN = /\/(?:app\.js|styles\.css|manifest\.json)$/i;
const STATIC_ASSET_PATTERN = /\.(?:css|js|json|svg|png|jpg|jpeg|webp|woff2?)$/i;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![CACHE_NAME, RUNTIME_CACHE_NAME].includes(key))
            .map((key) => caches.delete(key)),
        ),
      ),
  );
  event.waitUntil(self.clients.claim());
});

function isApiRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith("/api/") || url.pathname === "/health";
}

async function networkFirstNavigation(request) {
  try {
    const response = await fetch(request);
    return response;
  } catch {
    const cachedFallback = await caches.match(NAVIGATION_FALLBACK_URL);
    return cachedFallback || caches.match("./");
  }
}

async function networkFirstAsset(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const responseToCache = response.clone();
      const runtimeCache = await caches.open(RUNTIME_CACHE_NAME);
      await runtimeCache.put(request, responseToCache);
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || caches.match(NAVIGATION_FALLBACK_URL);
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);
  const networkResponsePromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        const responseToCache = response.clone();
        caches.open(RUNTIME_CACHE_NAME).then((cache) => cache.put(request, responseToCache));
      }
      return response;
    })
    .catch(() => null);

  return cached || networkResponsePromise || caches.match(NAVIGATION_FALLBACK_URL);
}

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  if (isApiRequest(request)) {
    event.respondWith(fetch(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  const url = new URL(request.url);
  if (APP_SHELL_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(networkFirstAsset(request));
    return;
  }

  if (STATIC_ASSET_PATTERN.test(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request)),
  );
});
