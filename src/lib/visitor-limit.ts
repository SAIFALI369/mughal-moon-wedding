export const VISITOR_MESSAGE_LIMIT = 5;
const KEY = "simran-visitor-count";
const WINDOW_KEY = "simran-visitor-window";
const WINDOW_MS = 24 * 60 * 60 * 1000; // 24h

export function getVisitorCount(): number {
  if (typeof window === "undefined") return 0;
  const resetAt = Number(localStorage.getItem(WINDOW_KEY) || 0);
  if (resetAt && Date.now() > resetAt) {
    localStorage.removeItem(KEY);
    localStorage.removeItem(WINDOW_KEY);
    return 0;
  }
  return Number(localStorage.getItem(KEY) || 0);
}

export function incrementVisitorCount(): number {
  if (typeof window === "undefined") return 0;
  const count = getVisitorCount() + 1;
  localStorage.setItem(KEY, String(count));
  if (!localStorage.getItem(WINDOW_KEY)) {
    localStorage.setItem(WINDOW_KEY, String(Date.now() + WINDOW_MS));
  }
  return count;
}

export function canSendMessage(): boolean {
  return getVisitorCount() < VISITOR_MESSAGE_LIMIT;
}

export function remainingMessages(): number {
  return Math.max(0, VISITOR_MESSAGE_LIMIT - getVisitorCount());
}

export function resetIfExpired() {
  getVisitorCount(); // triggers reset check
}
