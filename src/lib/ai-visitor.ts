/**
 * A stable, anonymous per-browser id for AI chat. The daily message allowance is
 * tracked against this value on the server, so guests behind one shared IP (or a
 * proxy that hides IPs) do not consume each other's messages.
 *
 * It contains no personal data and never leaves the browser except as a request key.
 */
const VISITOR_KEY = "wedding-ai-visitor";
const VISITOR_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;

export function getAiVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing && VISITOR_PATTERN.test(existing)) return existing;
    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    window.localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    // Private browsing can block storage; the server then falls back to the IP.
    return "";
  }
}
