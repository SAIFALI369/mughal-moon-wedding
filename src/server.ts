import "./lib/error-capture";

import noorCover from "./assets/noor-arch-cover.jpg.asset.json";
import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

const DEFAULT_LOVABLE_ASSET_ORIGIN = "https://mughal-moon-wedding.lovable.app";

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

function lovableAssetOrigin(requestUrl: URL): string {
  const configured = (process.env["LOVABLE_ASSET_ORIGIN"] || "").trim().replace(/\/+$/, "");
  if (configured) return configured;
  if (
    requestUrl.hostname.endsWith(".lovable.app") ||
    requestUrl.hostname.endsWith(".lovableproject.com")
  ) {
    return requestUrl.origin;
  }
  return DEFAULT_LOVABLE_ASSET_ORIGIN;
}

async function fetchUpstreamAsset(request: Request, pathname: string): Promise<Response | null> {
  const reqUrl = new URL(request.url);
  const upstreamOrigin = lovableAssetOrigin(reqUrl);
  // Prevent self-loop if upstream resolves back to the exact same origin+path.
  if (upstreamOrigin === reqUrl.origin && reqUrl.pathname === pathname) return null;

  const headers = new Headers();
  const range = request.headers.get("range");
  if (range) headers.set("range", range);

  try {
    const upstream = await fetch(`${upstreamOrigin}${pathname}`, {
      method: request.method === "HEAD" ? "HEAD" : "GET",
      headers,
      signal: AbortSignal.timeout(4_500),
    });
    if (!upstream.ok && upstream.status !== 206) return null;
    const contentType = upstream.headers.get("content-type") || "";
    if (!contentType.startsWith("image/") && !contentType.startsWith("video/")) return null;

    const outHeaders = new Headers();
    for (const key of [
      "content-type",
      "content-length",
      "content-range",
      "accept-ranges",
      "etag",
      "last-modified",
    ]) {
      const value = upstream.headers.get(key);
      if (value) outHeaders.set(key, value);
    }
    outHeaders.set("cache-control", "public, max-age=86400");
    return new Response(request.method === "HEAD" ? null : upstream.body, {
      status: upstream.status,
      headers: outHeaders,
    });
  } catch {
    return null;
  }
}

async function serveLocalPublicFile(
  relPath: string,
  contentType: string,
): Promise<Response | null> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    for (const base of [
      path.resolve(process.cwd(), "public"),
      path.resolve(process.cwd(), "dist/client"),
      path.resolve(process.cwd(), ".output/public"),
    ]) {
      try {
        const file = await fs.readFile(path.join(base, relPath));
        return new Response(new Uint8Array(file), {
          status: 200,
          headers: {
            "content-type": contentType,
            "cache-control": "public, max-age=86400",
          },
        });
      } catch {
        // Try next candidate output directory.
      }
    }
  } catch {
    // Non-node runtime fallback handled by caller.
  }
  return null;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

const HOSTED_FALLBACK_THEMES = [
  "sacred-mandap",
  "aladin",
  "haldi-baag",
  "royal-rajmahal",
  "lotus-goddess",
  "calligraphy",
  "bihari-vibe",
  "mecca_madinah",
  "luxury",
  "futuristic",
  "fairytale",
  "ballroom",
  "diya-utsav",
  "riad-noor",
  "kashi-ghat",
  "mehndi-night",
  "jharokha-dawn",
  "vows-in-ink",
  "chand-bagh",
  "mela-maidan",
  "mughal-moon-film",
  "eid",
] as const;

export function resolveAssetFallbackTheme(pathname: string): string {
  const lower = pathname.toLowerCase();
  for (const theme of HOSTED_FALLBACK_THEMES) {
    if (lower.includes(theme)) return theme;
  }
  return "eid";
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);

      // Serve the Eid entrance door JPEG for non-Lovable hosts with instant local fallback.
      if (
        (request.method === "GET" || request.method === "HEAD") &&
        url.pathname === "/og/eid-door.jpg"
      ) {
        const proxied = await fetchUpstreamAsset(request, noorCover.url);
        if (proxied) return proxied;
        const local = await serveLocalPublicFile("og/themes/eid.jpg", "image/jpeg");
        if (local) return local;
        return Response.redirect(new URL("/og/themes/eid.jpg", url.origin), 302);
      }

      // Proxy Lovable-hosted video/stills when running outside Lovable hosting (e.g. Vercel).
      if (
        (request.method === "GET" || request.method === "HEAD") &&
        url.pathname.startsWith("/__l5e/assets-v1/")
      ) {
        const proxied = await fetchUpstreamAsset(request, url.pathname);
        if (proxied) return proxied;
        const fallbackTheme = resolveAssetFallbackTheme(url.pathname);
        if (url.pathname.endsWith(".mp4")) {
          const localMp4 = await serveLocalPublicFile(`film/${fallbackTheme}.mp4`, "video/mp4");
          if (localMp4) return localMp4;
        }
        if (url.pathname.endsWith(".jpg") || url.pathname.endsWith(".jpeg")) {
          const localJpg = await serveLocalPublicFile(
            `og/themes/${fallbackTheme}.jpg`,
            "image/jpeg",
          );
          if (localJpg) return localJpg;
        }
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
