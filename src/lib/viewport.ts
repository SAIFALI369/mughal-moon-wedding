/**
 * True on a phone-sized viewport (and any browser narrow enough to be laid out
 * like one). Used to send card creation to its own page instead of a dialog —
 * a dialog mounted over a scrolling studio page is exactly what used to run off
 * the edge of a phone screen.
 */
export function isPhoneViewport(maxWidth = 767): boolean {
  if (typeof window === "undefined") return false;
  const measured =
    typeof window.innerWidth === "number" && window.innerWidth > 0
      ? window.innerWidth <= maxWidth
      : false;
  const queried =
    typeof window.matchMedia === "function" &&
    window.matchMedia(`(max-width: ${maxWidth}px)`).matches;
  return measured || queried;
}

/** Reads a query parameter from the current URL (safe during SSR). */
export function searchParam(name: string): string {
  if (typeof window === "undefined") return "";
  try {
    return new URLSearchParams(window.location.search).get(name)?.trim() ?? "";
  } catch {
    return "";
  }
}
