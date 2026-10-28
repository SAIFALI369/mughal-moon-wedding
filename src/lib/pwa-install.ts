import { useCallback, useEffect, useState } from "react";
import { invitationArt } from "@/components/wedding/invitation-art";
import { suggestedInvitationSongs } from "@/components/wedding/invitation-music";
import { invitationThemeIds } from "@/components/wedding/invitation-options";
import {
  OFFLINE_APP_CACHE_NAME,
  OFFLINE_APP_RELEASED_ON,
  OFFLINE_APP_VERSION,
} from "@/config/app-release";

export { OFFLINE_APP_VERSION };

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export type OfflineCacheStatus = {
  /** Files the service worker holds for offline use. */
  count: number;
  /** `ready` after a normal precache, `updated` after a forced refresh. */
  state: "idle" | "ready" | "updated";
  /** Version the service worker itself reports, so an old cache is visible. */
  workerVersion: string;
  /** False when the worker is stale — the device is running an older app. */
  upToDate: boolean;
};

let deferredPromptEvent: BeforeInstallPromptEvent | null = null;
let swRegistered = false;
let cacheReadyGlobal = false;
let cacheStatusGlobal: OfflineCacheStatus = {
  count: 0,
  state: "idle",
  workerVersion: "",
  upToDate: true,
};
/** The worker that is waiting to take over: a new version is installed. */
let waitingWorker: ServiceWorker | null = null;
const promptSubscribers = new Set<() => void>();

function notifyPromptSubscribers() {
  for (const fn of promptSubscribers) fn();
}

function isTestDom(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return true;
  return /jsdom|happy-dom/i.test(navigator.userAgent);
}

export function isStandaloneApp(): boolean {
  if (typeof window === "undefined") return false;
  const standaloneMedia = window.matchMedia?.("(display-mode: standalone)")?.matches ?? false;
  const iosStandalone = Boolean((navigator as { standalone?: boolean }).standalone);
  return standaloneMedia || iosStandalone;
}

function collectStudioAssetUrls(): string[] {
  const urls = new Set<string>([
    "/",
    "/offline-studio",
    "/download",
    "/dashboard",
    "/create",
    "/themes",
    "/preview-frame",
    "/offline.html",
    "/sign-in",
    "/demo",
    "/storybook?theme=royal-rajmahal",
    "/manifest.webmanifest",
    "/icon-192.png",
    "/icon-512.png",
    "/apple-touch-icon.png",
    // The studio's theme picker draws these small posters; the invitation
    // preview behind it needs the full artwork. Songs are optional offline.
    ...invitationThemeIds.map((theme) => `/demo/poster/${theme}.webp`),
    ...Object.values(invitationArt),
    ...suggestedInvitationSongs.map((s) => s.url),
  ]);

  if (typeof document !== "undefined") {
    document.querySelectorAll<HTMLScriptElement>("script[src]").forEach((el) => {
      if (el.src && el.src.startsWith(window.location.origin)) urls.add(el.src);
    });
    document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"][href]').forEach((el) => {
      if (el.href && el.href.startsWith(window.location.origin)) urls.add(el.href);
    });
    document
      .querySelectorAll<HTMLLinkElement>(
        'link[rel="modulepreload"][href], link[rel="preload"][href]',
      )
      .forEach((el) => {
        if (el.href && el.href.startsWith(window.location.origin)) urls.add(el.href);
      });
  }

  return Array.from(urls);
}

export async function precacheOfflineStudio(forceUpdate = false): Promise<boolean> {
  if (isTestDom() || !("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.ready;
    if (forceUpdate) {
      await registration.update().catch(() => {});
    }
    const worker = registration.active || registration.waiting || registration.installing;
    worker?.postMessage({
      type: forceUpdate ? "FORCE_UPDATE_CACHE" : "PRECACHE_STUDIO",
      urls: collectStudioAssetUrls(),
    });
    return true;
  } catch {
    return false;
  }
}

export function registerOfflineServiceWorker(): void {
  if (swRegistered || isTestDom()) return;
  swRegistered = true;

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPromptEvent = event as BeforeInstallPromptEvent;
    notifyPromptSubscribers();
  });

  window.addEventListener("appinstalled", () => {
    deferredPromptEvent = null;
    notifyPromptSubscribers();
  });

  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("message", (event) => {
    const data = event.data as
      | {
          type?: string;
          count?: number;
          state?: "ready" | "updated";
          version?: string;
        }
      | undefined;
    if (data?.type === "OFFLINE_CACHE_READY") {
      cacheReadyGlobal = true;
      notifyPromptSubscribers();
      return;
    }
    if (data?.type === "OFFLINE_CACHE_STATUS") {
      cacheReadyGlobal = (data.count ?? 0) > 0 || cacheReadyGlobal;
      cacheStatusGlobal = {
        count: data.count ?? 0,
        state: data.state ?? "ready",
        workerVersion: data.version ?? "",
        upToDate: !data.version || data.version === OFFLINE_APP_VERSION,
      };
      notifyPromptSubscribers();
    }
  });

  const doRegister = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .then((registration) => {
        void registration.update().catch(() => {});
        registration.waiting?.postMessage({ type: "SKIP_WAITING" });
        registration.addEventListener("updatefound", () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;
          installingWorker.addEventListener("statechange", () => {
            if (installingWorker.state === "installed") {
              installingWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });
        // Ask the active worker what it is actually holding, so the UI can say
        // "22 themes cached" only when that is true.
        registration.active?.postMessage({ type: "GET_CACHE_STATUS" });
        void precacheOfflineStudio();
      })
      .catch(() => {
        // Ignore service worker registration restrictions in sandboxed contexts
      });
  };

  window.addEventListener("online", () => {
    void precacheOfflineStudio(true);
  });

  // A worker that is waiting means a newer app is already downloaded: remember
  // it so the UI can offer "Reload to update" instead of silently running old JS.
  void navigator.serviceWorker.ready
    .then((registration) => {
      waitingWorker = registration.waiting;
      registration.addEventListener("updatefound", () => {
        waitingWorker = registration.installing;
      });
      notifyPromptSubscribers();
    })
    .catch(() => {});

  if (document.readyState === "complete") {
    doRegister();
  } else {
    window.addEventListener("load", doRegister, { once: true });
  }
}

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState<boolean>(() =>
    typeof navigator === "undefined" ? true : navigator.onLine !== false,
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  return online;
}

/** Swap a downloaded-but-waiting worker in and reload once it controls the page. */
export async function applyOfflineUpdate(): Promise<boolean> {
  if (isTestDom() || !("serviceWorker" in navigator)) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const worker = registration?.waiting ?? waitingWorker;
    if (!worker) return false;
    worker.postMessage({ type: "SKIP_WAITING" });
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 1500);
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") {
          clearTimeout(timer);
          resolve();
        }
      });
    });
    window.location.reload();
    return true;
  } catch {
    return false;
  }
}

/** Ask the worker for a fresh count of what it holds for offline use. */
export function refreshOfflineStatus(): void {
  if (isTestDom() || !("serviceWorker" in navigator)) return;
  void navigator.serviceWorker.ready
    .then((registration) => registration.active?.postMessage({ type: "GET_CACHE_STATUS" }))
    .catch(() => {});
}

export function useOfflineAppInstaller() {
  const [, setTick] = useState(0);
  const [installing, setInstalling] = useState(false);
  const [updatingCache, setUpdatingCache] = useState(false);

  useEffect(() => {
    registerOfflineServiceWorker();
    return () => {};
  }, []);

  useEffect(() => {
    const rerender = () => setTick((n) => n + 1);
    promptSubscribers.add(rerender);
    return () => {
      promptSubscribers.delete(rerender);
    };
  }, []);

  const warmOfflineCache = useCallback(() => precacheOfflineStudio(false), []);

  const refreshOfflineCache = useCallback(async () => {
    setUpdatingCache(true);
    try {
      return await precacheOfflineStudio(true);
    } finally {
      setUpdatingCache(false);
    }
  }, []);

  async function installNativeApp(): Promise<"accepted" | "dismissed" | "unavailable"> {
    if (!deferredPromptEvent) return "unavailable";
    setInstalling(true);
    try {
      await deferredPromptEvent.prompt();
      const choice = await deferredPromptEvent.userChoice;
      if (choice.outcome === "accepted") {
        deferredPromptEvent = null;
        notifyPromptSubscribers();
      }
      return choice.outcome;
    } finally {
      setInstalling(false);
    }
  }

  return {
    version: OFFLINE_APP_VERSION,
    releasedOn: OFFLINE_APP_RELEASED_ON,
    cacheName: OFFLINE_APP_CACHE_NAME,
    cacheStatus: cacheStatusGlobal,
    /** A newer app is downloaded and only needs a reload. */
    updateAvailable: Boolean(waitingWorker),
    applyUpdate: applyOfflineUpdate,
    refreshStatus: refreshOfflineStatus,
    canNativeInstall: Boolean(deferredPromptEvent),
    isInstalled: isStandaloneApp(),
    cacheReady: cacheReadyGlobal,
    installing,
    updatingCache,
    installNativeApp,
    warmOfflineCache,
    refreshOfflineCache,
  };
}

/**
 * Generates and downloads a standalone desktop/mobile launcher (`InvitingYou-Offline-Studio.html`)
 * that opens the latest cached Offline Studio directly from the user's Desktop or Downloads folder.
 */
export function buildOfflineLauncherHtml(origin: string): string {
  const safeOrigin = origin.replace(/\/+$/, "");
  const studioUrl = `${safeOrigin}/offline-studio?source=launcher&v=${encodeURIComponent(OFFLINE_APP_VERSION)}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>InvitingYou — Offline Studio v${OFFLINE_APP_VERSION}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      background: #f5f4ed;
      color: #253329;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }
    .card {
      max-width: 440px;
      width: 100%;
      background: #fdfcf8;
      border: 1px solid #e4e3d6;
      border-radius: 14px;
      padding: 32px 28px;
      text-align: center;
      box-shadow: 0 20px 50px -28px rgba(0, 0, 0, 0.14);
    }
    .seal {
      width: 56px;
      height: 56px;
      margin: 0 auto 14px;
      border-radius: 50%;
      background: #260e17;
      color: #d6ad62;
      display: grid;
      place-items: center;
      font-size: 24px;
      border: 2px solid #d6ad62;
    }
    .badge {
      display: inline-block;
      margin-bottom: 10px;
      padding: 3px 9px;
      border-radius: 999px;
      background: #ecebe2;
      color: #4f584b;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }
    h1 { font-size: 22px; font-weight: 600; margin-bottom: 8px; }
    p { font-size: 13px; line-height: 1.6; color: #646c5f; margin-bottom: 22px; }
    a.btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      min-height: 44px;
      padding: 12px 20px;
      border-radius: 8px;
      background: #253329;
      color: #fff;
      text-decoration: none;
      font-size: 13px;
      font-weight: 500;
    }
    .note { margin-top: 14px; font-size: 11px; color: #8a8e80; margin-bottom: 0; }
  </style>
  <script>
    window.addEventListener("DOMContentLoaded", function () {
      setTimeout(function () {
        window.location.replace(${JSON.stringify(studioUrl)});
      }, 300);
    });
  </script>
</head>
<body>
  <main class="card">
    <div class="seal" aria-hidden="true">☾</div>
    <span class="badge">Offline Studio v${OFFLINE_APP_VERSION} · ${OFFLINE_APP_RELEASED_ON}</span>
    <h1>InvitingYou Offline Studio</h1>
    <p>Opening your offline invitation workspace. Create, upload photos, and scroll full phone &amp; desktop previews without internet — connect only when ready to publish.</p>
    <a class="btn" href="${studioUrl}">Launch Offline Studio</a>
    <p class="note">Keep this launcher on your shop Desktop or Phone for instant offline access.</p>
  </main>
</body>
</html>`;
}

export function downloadOfflineStudioLauncher(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  void precacheOfflineStudio(true);
  const html = buildOfflineLauncherHtml(window.location.origin);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "InvitingYou-Offline-Studio.html";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
