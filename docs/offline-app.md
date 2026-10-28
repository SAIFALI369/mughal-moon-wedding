# Offline app (v3.0) — the "never a white screen" contract

The offline studio is a **PWA**: the website itself is the downloadable app. A phone or laptop that
has opened it once online must be able to open it again with the network switched off — and get a
working app, never a blank page.

| Thing | Value |
| --- | --- |
| Release | **v3.0**, 28 October 2026 |
| Cache | `invitingyou-offline-v6` |
| Source of truth | [`src/config/app-release.ts`](../src/config/app-release.ts) |
| Worker | [`public/sw.js`](../public/sw.js) |
| Fallback page | [`public/offline.html`](../public/offline.html) |
| Entry points | `/download`, `/offline-studio`, `/offline.html` |

`src/config/app-release.ts` is imported by the UI, the launcher and the tests; `public/sw.js`
mirrors the same constants. [`src/test/offline-app.test.tsx`](../src/test/offline-app.test.tsx)
asserts the two stay in sync, so **bumping a version means editing both files together**.

## Why the old build showed a white screen

The previous worker precached the HTML shell pages only. A page is useless without the JavaScript
bundle it points at, and those bundle URLs (`/assets/index-<hash>.js`) only exist *after* the first
render — the worker is not in control during that first visit, so nothing ever cached them. Open once
online, switch the internet off, reload: HTML from cache, bundle 404 → white screen.

The fix is **precache by discovery**: at install the worker fetches every shell page, parses it, and
enqueues every same-origin URL the page actually references — `<script src>`, stylesheets,
`modulepreload`, the manifest, icons and `<img src>` — then caches those too. One online visit is now
enough to hold the whole app.

## What is precached

- Shell pages: `/`, `/offline-studio`, `/dashboard`, `/create`, `/themes`, `/download`, `/films`,
  `/offline.html` (each HTML page plus its discovered assets).
- Theme posters for all 22 themes (`/demo/poster/<theme>.webp`) — the studio's theme picker works
  with no network.
- Never precached, always bypassed: `/film/*` and `/api/*` (large video, live data), `/_serverFn`,
  `/@vite`, `/@fs`, and anything cross-origin (Supabase).

Missing media offline is handled quietly: an image that is not in the cache answers with a 1×1
transparent SVG (`200`), a film answers `404`. A user never sees a broken-image icon or a stack of
network errors.

## The navigation fallback ladder

Every page navigation goes through this order, and the first hit wins:

1. **Network** with a 4 s timeout (fresh content when the connection is real, fast).
2. **Exact cached page** for that URL.
3. **`/offline-studio`** (or `/`) — only when the requested path is a studio surface, so the guest
   lands in the app they were trying to use.
4. **`/offline.html`** with a `?from=<path>` retry link — for any other URL, preserving the guest's
   intent instead of silently swapping in the studio.
5. **Emergency page built inside the worker** — inline HTML/CSS, used when even `/offline.html` was
   never cached (guaranteed non-blank).

Hashed static assets are cache-first, so repeat loads are instant. `GET_CACHE_STATUS` /
`OFFLINE_CACHE_STATUS` messages let the UI report honestly how many files the device holds, which
version the worker is running, and whether a newer worker is waiting.

## Updating a device

A new deploy changes the cache name → the browser installs the new worker → the old cache is dropped
on activation. The UI surfaces this as **"Update to v3.0"** in the readiness strip
([`src/components/platform/offline-readiness.tsx`](../src/components/platform/offline-readiness.tsx)),
which posts `FORCE_UPDATE_CACHE` (three parallel workers over every shell page, re-fetching rather
than trusting `cache.match`) and then reloads. The same button exists on `/download`, and the
downloaded desktop/mobile launcher re-warms the cache on every launch.

## Verifying it by hand

1. Open the site in a normal window, wait for the readiness strip to say *Offline ready*.
2. Close every tab, switch the device to airplane mode, reopen the app.
3. Expect: the studio opens, themes and posters render, a draft can be created, saved and previewed.
4. Publishing stays blocked with a plain-language message until the connection returns.

`npm test -- offline` runs the worker in `node:vm` against fake `caches`/network doubles: it visits
every shell page online, goes offline, and asserts a real page (never a blank one) for both a
previously seen URL and a URL it never saw.
