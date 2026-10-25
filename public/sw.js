const CACHE_NAME = "invitingyou-offline-v1";

const SHELL_PATHS = [
  "/",
  "/offline-studio",
  "/download",
  "/dashboard",
  "/preview-frame",
  "/sign-in",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          SHELL_PATHS.map((path) =>
            fetch(path, { credentials: "same-origin" }).then((response) => {
              if (response.ok) return cache.put(path, response);
            }),
          ),
        ),
      )
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("invitingyou-offline-") && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data || data.type !== "PRECACHE_STUDIO" || !Array.isArray(data.urls)) return;

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      const uniqueUrls = Array.from(new Set([...SHELL_PATHS, ...data.urls])).filter(
        (u) => typeof u === "string" && u.length > 0,
      );
      let cachedCount = 0;
      await Promise.allSettled(
        uniqueUrls.map(async (rawUrl) => {
          const existing = await cache.match(rawUrl);
          if (existing) {
            cachedCount += 1;
            return;
          }
          const response = await fetch(rawUrl, { credentials: "same-origin" });
          if (response.ok) {
            await cache.put(rawUrl, response);
            cachedCount += 1;
          }
        }),
      );
      const clients = await self.clients.matchAll({ type: "window" });
      for (const client of clients) {
        client.postMessage({ type: "OFFLINE_CACHE_READY", count: cachedCount });
      }
    }),
  );
});

function shouldBypassCache(url) {
  if (url.protocol !== "http:" && url.protocol !== "https:") return true;
  if (url.hostname.endsWith(".supabase.co") || url.hostname.includes("supabase")) return true;
  if (url.pathname.startsWith("/_serverFn") || url.pathname.startsWith("/api/")) return true;
  if (url.pathname.startsWith("/@vite") || url.pathname.startsWith("/@fs")) return true;
  return false;
}

async function fetchWithTimeout(request, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(request, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (shouldBypassCache(url)) return;

  const isNavigation =
    request.mode === "navigate" || (request.headers.get("accept") || "").includes("text/html");

  if (isNavigation && url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const networkResponse = await fetchWithTimeout(request, 3500);
          if (networkResponse.ok) {
            void cache.put(url.pathname, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          return (
            (await cache.match(url.pathname)) ||
            (await cache.match(request)) ||
            (await cache.match("/offline-studio")) ||
            (await cache.match("/")) ||
            new Response("Offline — open InvitingYou Offline Studio once online to finish setup.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
    return;
  }

  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/assets/") ||
      url.pathname.startsWith("/audio/") ||
      url.pathname.startsWith("/photos/") ||
      /\.(?:png|jpg|jpeg|webp|svg|ico|woff2?|ttf|webmanifest)$/i.test(url.pathname));

  const isFontCdn = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";

  if (isStaticAsset || isFontCdn) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) {
          void cache.put(request, response.clone());
        }
        return response;
      }),
    );
    return;
  }

  // Dev & dynamic same-origin scripts/styles: network-first with offline cache fallback
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        try {
          const response = await fetch(request);
          if (response.ok) {
            void cache.put(request, response.clone());
          }
          return response;
        } catch {
          const cached = await cache.match(request);
          if (cached) return cached;
          throw new Error("Offline asset unavailable");
        }
      }),
    );
  }
});
