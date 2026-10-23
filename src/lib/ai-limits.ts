/**
 * Daily AI allowance per guest, per surface.
 *
 * The original caps (5 on the homepage, 6 on a card) existed to keep one small
 * Gemini quota alive. Now that answers come from a pooled free tier (see
 * `supabase/functions/_shared/free-router.ts`), the site can afford a far larger
 * allowance, so every surface reads its cap from the environment:
 *
 *   AI_DAILY_LIMIT_HOMEPAGE   default 100   (`/ai-concierge` + homepage chat)
 *   AI_DAILY_LIMIT_CARD       default 100   (each host's card assistant)
 *   AI_DAILY_LIMIT_FORM       default 40    (partner form reader, per partner)
 *
 * Set a value to `0` to remove the cap for that surface. Invalid values fall
 * back to the default rather than accidentally disabling the limit.
 */

const DEFAULTS = {
  AI_DAILY_LIMIT_HOMEPAGE: 100,
  AI_DAILY_LIMIT_CARD: 100,
  AI_DAILY_LIMIT_FORM: 40,
} as const;

export type AiLimitEnv = keyof typeof DEFAULTS;

/**
 * `0` means "no cap": the usage row is still written for telemetry but the
 * guest is never blocked.
 */
export function dailyLimit(name: AiLimitEnv, env?: Record<string, string | undefined>): number {
  // `process` does not exist in the browser. Server functions are stripped from
  // the client bundle, but the guard keeps this safe if that ever changes.
  const source = env ?? (typeof process === "undefined" ? {} : process.env);
  const raw = source[name];
  if (raw === undefined || raw === null || raw === "") return DEFAULTS[name];
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULTS[name];
  return Math.floor(parsed);
}

export const DEFAULT_AI_LIMITS = DEFAULTS;
