/*
 * InvitingYou Offline Studio — service worker.
 *
 * The one rule: a guest with no internet must never get a white screen.
 *
 * 1. Install precaches every shell page AND the JavaScript/CSS/fonts/images
 *    those pages reference. A page is useless offline if its bundle is missing,
 *    and on a first visit the bundle is fetched *before* the worker exists, so
 *    it can never be cached "by accident" — discovery at install is what makes
 *    a first visit followed by a flight mode reload actually work.
 * 2. Navigation is network-first (a deploy is picked up immediately), and on
 *    failure falls back: the requested page → /offline-studio → / → the real
 *    /offline.html page → a self-contained page built here. Never nothing.
 * 3. Assets are cache-first (they are content-hashed), so the app boots from
 *    the cache with no round trips.
 * 4. Theme films are never cached (9.5 MB); a missing film simply leaves the
 *    theme's still on screen.
 */
const APP_VERSION = "3.0";
const CACHE_NAME = "invitingyou-offline-v6";
const OFFLINE_PAGE = "/offline.html";
const NETWORK_TIMEOUT_MS = 6000;
const NAV_TIMEOUT_MS = 4000;

const SHELL_PATHS = [
  "/",
  "/offline-studio",
  "/download",
  "/dashboard",
  "/create",
  "/preview-frame",
  "/sign-in",
  "/demo",
  "/storybook?theme=royal-rajmahal",
  "/themes",
  OFFLINE_PAGE,
  "/manifest.webmanifest",
  "/favicon.ico",
  "/icon-192.png",
  "/icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(precacheShell().then(() => self.skipWaiting()));
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
  if (!data || typeof data.type !== "string") return;

  if (data.type === "SKIP_WAITING") {
    void self.skipWaiting();
    return;
  }

  if (data.type === "GET_CACHE_STATUS") {
    event.waitUntil(reportCacheStatus(event.source));
    return;
  }

  if (
    (data.type === "PRECACHE_STUDIO" || data.type === "FORCE_UPDATE_CACHE") &&
    Array.isArray(data.urls)
  ) {
    const forceReload = data.type === "FORCE_UPDATE_CACHE";
    event.waitUntil(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        await cacheUrls(cache, [...SHELL_PATHS, ...data.urls], forceReload);
        await reportCacheStatus(event.source, forceReload ? "updated" : "ready");
      })(),
    );
  }
});

/* ────────────────────────────── precaching ────────────────────────────── */

async function precacheShell() {
  const cache = await caches.open(CACHE_NAME);
  await cacheUrls(cache, SHELL_PATHS, true);
}

/**
 * Cache a list of URLs, and for every HTML page also the assets it loads.
 * Resolves even when individual URLs fail: a partial cache still beats none.
 */
async function cacheUrls(cache, urls, forceReload) {
  const queue = Array.from(new Set(urls.filter((u) => typeof u === "string" && u.length > 0)));
  const seen = new Set();
  let cursor = 0;

  async function worker() {
    while (cursor < queue.length) {
      const url = queue[cursor++];
      if (seen.has(url)) continue;
      seen.add(url);
      try {
        await cacheUrl(cache, url, forceReload);
      } catch {
        // One bad URL must not abort the rest of the precache.
      }
    }
  }

  await Promise.all([worker(), worker(), worker()]);

  async function cacheUrl(cache, url, forceReload) {
    if (!(await isCacheable(url))) return;
    const cached = forceReload ? null : await cache.match(url);
    const request = new Request(url, {
      credentials: "same-origin",
      cache: forceReload ? "reload" : "default",
    });
    const response = await fetchWithTimeout(request, NETWORK_TIMEOUT_MS);
    if (!response || !response.ok || response.redirected) {
      // Keep whatever we already have; a network hiccup is not a lost cache.
      void cached;
      return;
    }
    await cache.put(url, response.clone());
    const type = response.headers.get("content-type") || "";
    if (!type.includes("text/html")) return;
    let html = "";
    try {
      html = await response.clone().text();
    } catch {
      return;
    }
    for (const asset of discoverAssets(html, url)) {
      if (seen.has(asset)) continue;
      seen.add(asset);
      try {
        await cacheUrl(cache, asset, forceReload);
      } catch {
        // An asset that will not load now can still load next time.
      }
    }
  }
}

/** Every same-origin asset an HTML document needs to boot. */
function discoverAssets(html, baseUrl) {
  const found = new Set();
  const add = (value) => {
    if (!value) return;
    const raw = String(value).trim();
    if (!raw || raw.startsWith("data:") || raw.startsWith("blob:") || raw.startsWith("#")) return;
    let url;
    try {
      url = new URL(raw, new URL(baseUrl, self.location.origin).href);
    } catch {
      return;
    }
    if (url.origin !== self.location.origin) return;
    if (url.pathname.startsWith("/_serverFn") || url.pathname.startsWith("/api/")) return;
    if (url.pathname.startsWith("/@vite") || url.pathname.startsWith("/@fs")) return;
    if (url.pathname.startsWith("/film/")) return; // films are 100–600 KB each, never precached
    found.add(url.pathname + url.search);
  };

  const scriptPattern = /<script\b[^>]*\bsrc=["']([^"']+)["']/gi;
  const linkPattern = /<link\b[^>]*>/gi;
  const imgPattern = /<img\b[^>]*\bsrc=["']([^"']+)["']/gi;
  let match;
  while ((match = scriptPattern.exec(html))) add(match[1]);
  while ((match = imgPattern.exec(html))) add(match[1]);
  while ((match = linkPattern.exec(html))) {
    const tag = match[0];
    const rel = (/\brel=["']([^"']+)["']/i.exec(tag) || [])[1] || "";
    if (!/stylesheet|modulepreload|preload|icon|manifest|apple-touch-icon/i.test(rel)) continue;
    add((/\bhref=["']([^"']+)["']/i.exec(tag) || [])[1]);
  }
  // Fonts requested by a stylesheet are discovered on demand by the asset route.
  return Array.from(found);
}

async function isCacheable(url) {
  if (typeof url !== "string" || !url.startsWith("/")) return false;
  if (url.startsWith("/_serverFn") || url.startsWith("/api/")) return false;
  if (url.startsWith("/@vite") || url.startsWith("/@fs")) return false;
  if (url.includes("supabase")) return false;
  return true;
}

async function reportCacheStatus(client, state = "ready") {
  let count = 0;
  try {
    const cache = await caches.open(CACHE_NAME);
    count = (await cache.keys()).length;
  } catch {
    count = 0;
  }
  const message = {
    type: "OFFLINE_CACHE_STATUS",
    state,
    version: APP_VERSION,
    cacheName: CACHE_NAME,
    count,
    offlineReady: count > 0,
  };
  if (client && typeof client.postMessage === "function") {
    client.postMessage(message);
    return;
  }
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const target of clients) target.postMessage(message);
}

/* ──────────────────────────────   fetching   ────────────────────────────── */

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
    event.respondWith(handleNavigation(event, url));
    return;
  }

  const isFontCdn = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  const isSameOrigin = url.origin === self.location.origin;
  const isStaticAsset =
    isSameOrigin &&
    (url.pathname.startsWith("/assets/") ||
      url.pathname.startsWith("/demo/") ||
      url.pathname.startsWith("/audio/") ||
      url.pathname.startsWith("/photos/") ||
      url.pathname.startsWith("/film/") ||
      /\.(?:m?js|css|png|jpg|jpeg|webp|svg|ico|woff2?|ttf|webmanifest|mp4)$/i.test(url.pathname));

  if (isStaticAsset || isFontCdn) {
    event.respondWith(handleStatic(event, request, url));
    return;
  }

  if (isSameOrigin) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok) void putInCache(request, response.clone());
          return response;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached =
            (await cache.match(request)) ||
            (await cache.match(request, { ignoreSearch: true })) ||
            (await cache.match(url.pathname));
          if (cached) return cached;
          return new Response("", { status: 504, statusText: "Offline" });
        }
      })(),
    );
  }
});

async function putInCache(request, response) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response);
  } catch {
    // A full quota must never break a request that already succeeded.
  }
}

/**
 * Network-first for pages (so a deploy is picked up at once), then the cache,
 * then the offline page. `/offline-studio` is tried before `/` because the
 * studio is the one page that is fully useful without a connection.
 */
async function handleNavigation(event, url) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetchWithTimeout(event.request, NAV_TIMEOUT_MS);
    if (response && response.ok && !response.redirected) {
      if (await isCacheable(url.pathname)) {
        event.waitUntil(cache.put(url.pathname, response.clone()).catch(() => undefined));
      }
      return response;
    }
  } catch {
    // Offline (or too slow): fall through to the cache below.
  }

  const exact =
    (await cache.match(url.pathname + url.search)) ||
    (await cache.match(url.pathname)) ||
    (await cache.match(event.request, { ignoreSearch: true }));
  if (exact) return exact;

  // A page the workspace may not have visited: the studio is a fine stand-in,
  // because it is the one screen that is fully useful without a connection.
  if (isStudioSurface(url.pathname)) {
    for (const fallback of ["/offline-studio", "/"]) {
      const page = await cache.match(fallback);
      if (page) return page;
    }
  }

  // Anything else (an invitation link, a route that needs the server) gets the
  // honest offline screen, which links straight to the studio.
  const offlinePage = await cache.match(OFFLINE_PAGE);
  if (offlinePage) {
    const html = await offlinePage.clone().text();
    return new Response(html.replace("</main>", retryLink(url.pathname) + "</main>"), {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  }

  return new Response(buildEmergencyPage(url.pathname), {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

/**
 * Cache-first for hashed assets — they can never change under the same URL.
 * A missing image becomes a transparent pixel instead of a broken box; a
 * missing film is left to fail so the theme's still stays visible.
 */
async function handleStatic(event, request, url) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  const isFilm = url.pathname.startsWith("/film/");
  try {
    const response = await fetch(request);
    if (response && response.ok && !isFilm) {
      event.waitUntil(cache.put(request, response.clone()).catch(() => undefined));
    }
    return response;
  } catch {
    if (isFilm) return new Response("", { status: 404, statusText: "Offline" });
    if (/\.(?:png|jpe?g|webp|svg|gif)$/i.test(url.pathname)) {
      return new Response(TRANSPARENT_PIXEL, {
        headers: { "Content-Type": "image/svg+xml", "Cache-Control": "no-store" },
      });
    }
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

/** Screens where opening the studio is a better answer than "you're offline". */
function isStudioSurface(pathname) {
  return (
    pathname === "/" ||
    pathname.startsWith("/offline-studio") ||
    pathname.startsWith("/download") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/create") ||
    pathname.startsWith("/themes")
  );
}

/**
 * The cached offline page has a "reload what I wanted" link; point it at the
 * URL the guest actually asked for instead of the studio.
 */
function retryLink(pathname) {
  const safe = pathname.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  return `<script>
    (function () {
      var link = document.getElementById("retry");
      if (link) { link.setAttribute("href", "${safe}"); link.textContent = "Reload ${safe}"; }
    })();
  </script>`;
}

const TRANSPARENT_PIXEL =
  "<svg xmlns='http://www.w3.org/2000/svg' width='1' height='1'><rect width='1' height='1' fill='transparent'/></svg>";

/** Last resort, built here so it can never be missing: no external anything. */
function buildEmergencyPage(pathname) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>Offline — InvitingYou</title>
<style>
  :root { color-scheme: light; }
  *{box-sizing:border-box}
  body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;
    background:#f5f4ed;color:#253329;
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
  main{max-width:460px;width:100%;background:#fdfcf8;border:1px solid #e4e3d6;border-radius:16px;
    padding:34px 28px;text-align:center;box-shadow:0 24px 60px -34px rgba(0,0,0,.22)}
  .seal{width:56px;height:56px;margin:0 auto 16px;border-radius:50%;background:#260e17;color:#d6ad62;
    display:grid;place-items:center;font-size:24px;border:2px solid #d6ad62}
  h1{font-size:22px;margin:0 0 8px}
  p{font-size:13px;line-height:1.65;color:#646c5f;margin:0 0 16px}
  .row{display:grid;gap:10px;margin-top:6px}
  a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;padding:12px 18px;
    border-radius:9px;text-decoration:none;font-size:13px;font-weight:500}
  a.primary{background:#253329;color:#fff}
  a.ghost{border:1px solid #dcdbc9;color:#3d4438}
  code{font-size:11px;color:#8a8e80}
</style></head>
<body><main>
  <div class="seal" aria-hidden="true">☾</div>
  <h1>You're offline</h1>
  <p>InvitingYou is still installed on this device. Open the Offline Studio to keep working — drafts, photos and previews all save here. Connect only when you want to publish.</p>
  <div class="row">
    <a class="primary" href="/offline-studio">Open Offline Studio</a>
    <a class="ghost" href="/">Try the homepage</a>
    <a class="ghost" href="${pathname.replace(/"/g, "&quot;")}">Reload this page</a>
  </div>
  <p style="margin:16px 0 0"><code>${APP_VERSION} · ${CACHE_NAME}</code></p>
</main></body></html>`;
}
