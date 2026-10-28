// @vitest-environment node
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

/**
 * The service worker, run for real.
 *
 * "I turn the internet off and get a white screen" is not a thing you can unit
 * test inside jsdom — so this harness runs `public/sw.js` in a small fake
 * ServiceWorkerGlobalScope with a fake Cache Storage and a fake network that can
 * be switched off. Then it asks the worker the only question that matters:
 * with the network gone and only a first visit to its name, does it still serve
 * a page with content in it?
 */

const ORIGIN = "https://invitingyou.test";

type FakeResponse = {
  body: string;
  status: number;
  ok: boolean;
  redirected: boolean;
  headers: { get(name: string): string | null };
  clone(): FakeResponse;
  text(): Promise<string>;
};

function response(body: string, type = "text/html; charset=utf-8", status = 200): FakeResponse {
  const headers = new Headers({ "content-type": type });
  const make = (): FakeResponse => ({
    body,
    status,
    ok: status >= 200 && status < 300,
    redirected: false,
    headers: { get: (name: string) => headers.get(name) },
    clone: () => make(),
    text: async () => body,
  });
  return make();
}

type Worker = {
  listeners: Record<string, Array<(event: FakeEvent) => void>>;
  state: () => { cacheEntries: string[]; skippedWaiting: boolean; claimed: boolean };
};

type FakeEvent = {
  request?: FakeRequest;
  waitUntil: (promise: Promise<unknown>) => void;
  respondWith: (value: Promise<FakeResponse> | FakeResponse) => void;
  data?: unknown;
  source?: { postMessage: (message: unknown) => void };
  pending: Promise<unknown>[];
  response?: Promise<FakeResponse> | FakeResponse;
};

type FakeRequest = {
  url: string;
  method: string;
  mode: string;
  headers: { get(name: string): string | null };
};

function fakeRequest(path: string, options: { navigate?: boolean; accept?: string } = {}) {
  return {
    url: `${ORIGIN}${path}`,
    method: "GET",
    mode: options.navigate ? "navigate" : "no-cors",
    headers: {
      get: (name: string) =>
        name.toLowerCase() === "accept"
          ? (options.accept ?? (options.navigate ? "text/html" : "*/*"))
          : null,
    },
  } as unknown as FakeRequest;
}

/** A network that serves a tiny但有 full app shell, or nothing at all. */
function siteNetwork(options: { assets?: Record<string, string> } = {}) {
  const html = `<!doctype html><html><head><title>InvitingYou</title>
<link rel="stylesheet" href="/assets/app-abc123.css">
<script type="module" src="/assets/entry-abc123.js"></script>
<link rel="modulepreload" href="/assets/route-offline-studio-abc123.js">
<img src="/demo/poster/eid.webp"><img src="/demo/poster/kashi-ghat.webp">
</head><body><div id="root"><main>InvitingYou Offline Studio</main></div></body></html>`;
  const files: Record<string, string> = {
    "/": html,
    "/offline-studio": html,
    "/download": html,
    "/dashboard": html,
    "/create": html,
    "/preview-frame": html,
    "/sign-in": html,
    "/demo": html,
    "/themes": html,
    "/offline.html":
      "<!doctype html><html><body><main><h1>You are offline</h1>" +
      '<a id="retry" href="/offline-studio">Open Offline Studio</a></main></body></html>',
    "/storybook?theme=royal-rajmahal": html,
    "/manifest.webmanifest": "{}",
    "/favicon.ico": "ico",
    "/icon-192.png": "png",
    "/icon-512.png": "png",
    "/apple-touch-icon.png": "png",
    "/assets/app-abc123.css": "body{color:#000}",
    "/assets/entry-abc123.js": "console.log('app')",
    "/assets/route-offline-studio-abc123.js": "export default 1",
    "/demo/poster/eid.webp": "webp",
    "/demo/poster/kashi-ghat.webp": "webp",
    "/film/eid.mp4": "mp4",
    ...options.assets,
  };
  return {
    online: true,
    files,
    fetch(request: FakeRequest) {
      if (!this.online) throw new Error("Failed to fetch");
      const url = new URL(request.url);
      const key = url.pathname + url.search;
      const body = this.files[key] ?? this.files[url.pathname];
      if (body === undefined) return Promise.resolve(response("not found", "text/plain", 404));
      const type = key.endsWith(".js")
        ? "text/javascript"
        : key.endsWith(".css")
          ? "text/css"
          : key.endsWith(".webp")
            ? "image/webp"
            : key.endsWith(".mp4")
              ? "video/mp4"
              : key.endsWith(".html") || key === "/" || !key.includes(".")
                ? "text/html; charset=utf-8"
                : "application/octet-stream";
      return Promise.resolve(response(body, type));
    },
  };
}

function loadWorker(network: ReturnType<typeof siteNetwork>) {
  const source = readFileSync("public/sw.js", "utf8");
  const cacheStore = new Map<string, FakeResponse>();
  const notices: unknown[] = [];
  const state = { skippedWaiting: false, claimed: false };

  const cache = {
    put: async (key: string | FakeRequest, value: FakeResponse) => {
      cacheStore.set(typeof key === "string" ? key : new URL(key.url).pathname, value);
    },
    match: async (key: string | FakeRequest) => {
      const raw =
        typeof key === "string" ? key : new URL(key.url).pathname + new URL(key.url).search;
      const path = raw.startsWith("http") ? new URL(raw).pathname : raw;
      return cacheStore.get(raw) ?? cacheStore.get(path) ?? undefined;
    },
    keys: async () => Array.from(cacheStore.keys()).map((key) => ({ url: `${ORIGIN}${key}` })),
  };

  const listeners: Record<string, Array<(event: FakeEvent) => void>> = {};
  class AbortControllerStub {
    signal = {};
    abort() {}
  }

  const sandbox = {
    self: {
      location: { origin: ORIGIN },
      addEventListener: (type: string, handler: (event: FakeEvent) => void) => {
        (listeners[type] ??= []).push(handler);
      },
      skipWaiting: async () => {
        state.skippedWaiting = true;
      },
      clients: {
        claim: async () => {
          state.claimed = true;
        },
        matchAll: async () => [{ postMessage: (message: unknown) => notices.push(message) }],
      },
    },
    caches: {
      open: async () => cache,
      keys: async () => ["invitingyou-offline-v5", "invitingyou-offline-v6"],
      delete: async () => true,
      match: async (key: string) => cacheStore.get(key),
    },
    fetch: (request: FakeRequest) => network.fetch(request),
    Request: class {
      url: string;
      constructor(url: string) {
        this.url = url.startsWith("http") ? url : `${ORIGIN}${url}`;
      }
    },
    Response: class {
      body: string;
      status: number;
      headers: { get(name: string): string | null };
      constructor(body = "", init: { status?: number; headers?: Record<string, string> } = {}) {
        this.body = body;
        this.status = init.status ?? 200;
        const headers = new Headers(init.headers ?? {});
        this.headers = { get: (name: string) => headers.get(name) };
      }
    },
    Headers,
    URL,
    URLSearchParams,
    AbortController: AbortControllerStub,
    setTimeout,
    clearTimeout,
    console,
  };
  runInNewContext(source, sandbox, { filename: "public/sw.js" });

  async function dispatch(type: string, event: Partial<FakeEvent>): Promise<FakeEvent> {
    const pending: Promise<unknown>[] = [];
    const fake = {
      waitUntil: (promise: Promise<unknown>) => pending.push(promise),
      respondWith: (value: Promise<FakeResponse> | FakeResponse) => {
        fake.response = value;
      },
      pending,
      ...event,
    } as FakeEvent;
    for (const handler of listeners[type] ?? []) handler(fake);
    await Promise.allSettled(pending);
    return fake;
  }

  return {
    run: (type: string, event: Partial<FakeEvent>) => dispatch(type, event),
    install: () => dispatch("install", {}),
    async navigate(path: string) {
      const event = await dispatch("fetch", {
        request: fakeRequest(path, { navigate: true }),
      });
      return event.response ? await event.response : undefined;
    },
    async asset(path: string) {
      const event = await dispatch("fetch", { request: fakeRequest(path) });
      return event.response ? await event.response : undefined;
    },
    cacheEntries: () => Array.from(cacheStore.keys()).sort(),
    notices: () => notices,
    state: () => state,
  };
}

describe("offline service worker", () => {
  it("precaches the pages AND the scripts and styles those pages need", async () => {
    const worker = loadWorker(siteNetwork());
    await worker.install();
    const entries = worker.cacheEntries();
    expect(entries).toContain("/offline-studio");
    expect(entries).toContain("/offline.html");
    // The white-screen bug: a cached page whose bundle was never cached.
    expect(entries).toContain("/assets/entry-abc123.js");
    expect(entries).toContain("/assets/app-abc123.css");
    expect(entries).toContain("/assets/route-offline-studio-abc123.js");
    // Tiles the studio draws offline.
    expect(entries).toContain("/demo/poster/eid.webp");
    // Films are deliberately never precached (9.5 MB).
    expect(entries.some((entry) => entry.startsWith("/film/"))).toBe(false);
  });

  it("holds the whole app in cache after one online visit, then works offline", async () => {
    const network = siteNetwork();
    const worker = loadWorker(network);
    await worker.install();
    await worker.navigate("/offline-studio");

    // Internet off.
    network.online = false;

    const page = await worker.navigate("/offline-studio");
    expect(page?.status).toBe(200);
    expect(page?.body).toContain("InvitingYou Offline Studio");
    // …and its bundle is still there, which is what used to blank the screen.
    expect((await worker.asset("/assets/entry-abc123.js"))?.body).toContain("console.log");
    expect((await worker.asset("/assets/app-abc123.css"))?.body).toContain("color");
  });

  it("serves a real page — never a blank one — for a page it never cached", async () => {
    const network = siteNetwork();
    const worker = loadWorker(network);
    await worker.install();
    network.online = false;

    const page = await worker.navigate("/invite/an-unvisited-wedding");
    expect(page?.status).toBe(200);
    expect((page?.body ?? "").length).toBeGreaterThan(200);
    // The studio is one tap away even for a URL the phone had never seen.
    expect(page?.body).toContain("/offline-studio");
    // …and the page they wanted is remembered, so reconnecting continues there.
    expect(page?.body).toContain("/invite/an-unvisited-wedding");
  });

  it("still answers with the offline page when even the shell was never cached", async () => {
    const network = siteNetwork();
    // A brand-new worker that was installed while the network was already down.
    network.online = false;
    const worker = loadWorker(network);
    await worker.install();
    const page = await worker.navigate("/offline-studio");
    expect(page?.status).toBe(200);
    expect(page?.body.toLowerCase()).toContain("offline");
    expect(page?.body).toContain("/offline-studio");
  });

  it("does not serve a broken image box when a photo is missing offline", async () => {
    const network = siteNetwork();
    const worker = loadWorker(network);
    await worker.install();
    network.online = false;
    const image = await worker.asset("/demo/poster/never-cached.webp");
    expect(image?.status).toBe(200);
    expect(image?.headers.get("content-type")).toContain("image/svg+xml");
  });

  it("lets a missing film fail quietly so the still stays on screen", async () => {
    const network = siteNetwork();
    const worker = loadWorker(network);
    await worker.install();
    network.online = false;
    const film = await worker.asset("/film/eid.mp4");
    expect(film?.status).toBe(404);
  });

  it("reports what it holds, so the site can say 'offline ready' honestly", async () => {
    const worker = loadWorker(siteNetwork());
    await worker.install();
    const notices: unknown[] = [];
    await worker.run("message", {
      data: { type: "GET_CACHE_STATUS" },
      source: { postMessage: (message: unknown) => notices.push(message) },
    });
    await new Promise((resolve) => setTimeout(resolve, 10));
    const status = notices.find(
      (notice) => (notice as { type?: string }).type === "OFFLINE_CACHE_STATUS",
    ) as { count: number; version: string; offlineReady: boolean } | undefined;
    expect(status?.offlineReady).toBe(true);
    expect(status?.count).toBeGreaterThan(10);
    expect(status?.version).toBe("3.0");
  });

  it("takes over immediately and drops the previous version's cache", async () => {
    const worker = loadWorker(siteNetwork());
    await worker.install();
    expect(worker.state().skippedWaiting).toBe(true);
    await worker.run("activate", {});
    expect(worker.state().claimed).toBe(true);
  });
});
