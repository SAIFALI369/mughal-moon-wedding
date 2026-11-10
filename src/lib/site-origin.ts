import { createIsomorphicFn } from "@tanstack/react-start";

const DEFAULT_SITE_URL = "https://invitingyou.vercel.app";

export function normalizeOrigin(raw?: string | null): string {
  const value = (raw ?? "").trim().replace(/\/+$/, "");
  if (!value) return DEFAULT_SITE_URL;
  try {
    const url = new URL(value);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.origin;
    }
  } catch {
    // Fall back below when the value is not a valid URL.
  }
  return DEFAULT_SITE_URL;
}

export function envSiteOrigin(): string {
  const fromVite =
    typeof import.meta !== "undefined" && import.meta.env
      ? (import.meta.env["VITE_SITE_URL"] as string | undefined)
      : undefined;
  const fromNode = typeof process !== "undefined" ? process.env["VITE_SITE_URL"] : undefined;
  return normalizeOrigin(fromNode || fromVite);
}

export function isLovableHost(origin: string): boolean {
  try {
    const { hostname } = new URL(origin);
    return (
      hostname.endsWith(".lovable.app") ||
      hostname.endsWith(".lovableproject.com") ||
      hostname.endsWith(".lovable.dev")
    );
  } catch {
    return false;
  }
}

/**
 * Resolves the public origin for the current request so Open Graph URLs and
 * entrance-door preview images match whichever host the link was shared from
 * (e.g. Lovable preview/production or Vercel), always returning an absolute URL.
 */
export const getSiteOrigin = createIsomorphicFn()
  .server(async (): Promise<string> => {
    try {
      const { getRequest } = await import("@tanstack/react-start/server");
      const req = getRequest();
      if (req) {
        const reqUrl = new URL(req.url);
        const proto =
          req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() ||
          reqUrl.protocol.replace(/:$/, "") ||
          "https";
        const host =
          req.headers.get("x-forwarded-host")?.split(",")[0]?.trim() ||
          req.headers.get("host")?.trim() ||
          reqUrl.host;
        if (host) {
          return normalizeOrigin(`${proto}://${host}`);
        }
      }
    } catch {
      // No active request context (e.g. unit test environment).
    }
    return envSiteOrigin();
  })
  .client((): string => {
    if (typeof window !== "undefined" && window.location?.origin) {
      return normalizeOrigin(window.location.origin);
    }
    return envSiteOrigin();
  });
