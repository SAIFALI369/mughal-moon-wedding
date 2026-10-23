/**
 * Shared AI quota for the Supabase Edge Functions.
 *
 * The ledger lives in Postgres (public.consume_ai_message) so the Edge Function
 * and the app server charge the same allowance. Counters live per scope — the
 * homepage, or `card:<slug>` — so one guest cannot drain another surface.
 *
 * Nothing here stores a raw IP: the visitor key is a salted SHA-256 digest.
 */

export type AiQuota = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: string | null;
};

export type AiUsageBackend = {
  url: string;
  serviceKey: string;
  scope: string;
  visitor: string;
};

export const DEFAULT_WINDOW_HOURS = 24;

function backendConfigured(backend: AiUsageBackend | null): backend is AiUsageBackend {
  return !!backend?.url && !!backend?.serviceKey && !!backend?.scope && !!backend?.visitor;
}

export async function hashVisitor(ip: string, salt = "wedding-invitation-ai"): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${ip || "unknown"}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function rpc(
  backend: AiUsageBackend,
  name: string,
  body: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(`${backend.url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: backend.serviceKey,
      Authorization: `Bearer ${backend.serviceKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw new Error(`AI quota unavailable (${response.status})`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

/** Falls back to "allowed" when the ledger is unreachable, so chat never hard-fails. */
export async function consumeAiMessage(
  backend: AiUsageBackend | null,
  limit: number,
  windowHours = DEFAULT_WINDOW_HOURS,
): Promise<AiQuota> {
  // `0` is an explicit "no cap" switch for deployments with a large free pool.
  if (limit <= 0) {
    return { allowed: true, remaining: 0, limit: 0, resetsAt: null };
  }
  if (!backendConfigured(backend)) {
    return { allowed: true, remaining: limit, limit, resetsAt: null };
  }
  try {
    const result = (await rpc(backend, "consume_ai_message", {
      p_scope: backend.scope,
      p_visitor: backend.visitor,
      p_limit: limit,
      p_window_hours: windowHours,
    })) as Partial<AiQuota> | null;
    return {
      allowed: result?.allowed !== false,
      remaining: typeof result?.remaining === "number" ? result.remaining : limit,
      limit: typeof result?.limit === "number" ? result.limit : limit,
      resetsAt: typeof result?.resetsAt === "string" ? result.resetsAt : null,
    };
  } catch (error) {
    console.error("AI quota lookup failed", error instanceof Error ? error.message : error);
    return { allowed: true, remaining: limit, limit, resetsAt: null };
  }
}

/** Undo a reservation when the model failed; a failed answer must cost nothing. */
export async function refundAiMessage(backend: AiUsageBackend | null): Promise<void> {
  if (!backendConfigured(backend)) return;
  try {
    await rpc(backend, "refund_ai_message", {
      p_scope: backend.scope,
      p_visitor: backend.visitor,
    });
  } catch (error) {
    console.error("AI quota refund failed", error instanceof Error ? error.message : error);
  }
}
