const VERSION = "t8-rc-2026-05-04-01";
const STATIC_CACHE = `trinittty-static-${VERSION}`;
const RUNTIME_CACHE = `trinittty-runtime-${VERSION}`;
const APP_SHELL = ["/", "/index.html", "/manifest.webmanifest", "/icon.svg", "/icon-192.png", "/icon-512.png"];

async function cacheShellAndBuildAssets() {
  const cache = await caches.open(STATIC_CACHE);
  await Promise.allSettled(APP_SHELL.map((url) => cache.add(url)));

  try {
    const response = await fetch("/index.html", { cache: "reload" });
    if (!response.ok) return;

    await cache.put("/index.html", response.clone());
    await cache.put("/", response.clone());

    const html = await response.text();
    const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
      .map((match) => new URL(match[1], self.location.origin))
      .filter((url) => url.origin === self.location.origin && url.pathname.startsWith("/assets/"))
      .map((url) => url.pathname);

    await Promise.allSettled([...new Set(assets)].map((url) => cache.add(url)));
  } catch {
    // The existing cache still keeps the installed app usable offline.
  }
}

async function deleteOldCaches() {
  const keep = new Set([STATIC_CACHE, RUNTIME_CACHE]);
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key.startsWith("trinittty-") && !keep.has(key)).map((key) => caches.delete(key)));
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch {
    return (await caches.match(request)) || (await caches.match("/index.html"));
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await caches.match(request);
  const fetched = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);

  return cached || fetched || caches.match("/index.html");
}

self.addEventListener("install", (event) => {
  event.waitUntil(cacheShellAndBuildAssets());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(deleteOldCaches().then(() => self.clients.claim()));
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (url.pathname.startsWith("/assets/") || APP_SHELL.includes(url.pathname)) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(staleWhileRevalidate(event.request));
});
