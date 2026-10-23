import { getRequest } from "@tanstack/react-start/server";
import {
  AiPoolExhaustedError,
  chat,
  hasAiConfig,
} from "../../../supabase/functions/_shared/free-router";

export type GeminiChatMessage = { role: "user" | "assistant"; content: string };

/**
 * Every AI surface on the site now goes through the free-tier provider pool in
 * `supabase/functions/_shared/free-router`. A single `GEMINI_API_KEY` still
 * works — it is simply the first route in the pool — but any number of extra
 * free keys can be added beside it, and three keyless providers answer when no
 * key is configured at all.
 */

/** Parse a dot-env file into a lookup used as a low-priority env layer. */
function parseDotEnv(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(trimmed);
    if (!match?.[1]) continue;
    out[match[1]] = match[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

let localEnvCache: Record<string, string> | null = null;

/**
 * Local development reads the git-ignored `supabase/.env`. Deployed hosts get
 * the same names from their own secret store, which always takes precedence.
 */
async function localEnv(): Promise<Record<string, string>> {
  if (localEnvCache) return localEnvCache;
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const raw = await fs.readFile(path.resolve(process.cwd(), "supabase/.env"), "utf-8");
    localEnvCache = parseDotEnv(raw);
  } catch {
    localEnvCache = {};
  }
  return localEnvCache;
}

export function getRequestIp(): string {
  try {
    const request = getRequest();
    return (
      request?.headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request?.headers?.get("cf-connecting-ip") ||
      "unknown-server"
    );
  } catch {
    return "unknown-server";
  }
}

const QUOTA_WINDOW_HOURS = 24;

export type AiQuota = {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetsAt: string | null;
};

/** A stable per-browser id, so the daily allowance follows the guest, not a shared IP. */
function visitorKey(visitorId: string): string {
  return /^[a-zA-Z0-9-]{8,128}$/.test(visitorId) ? `browser:${visitorId}` : `ip:${getRequestIp()}`;
}

async function hashKey(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(`wedding-invitation-ai:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function quotaRpc<T>(name: string, body: Record<string, unknown>): Promise<T | null> {
  const url = process.env["SUPABASE_URL"];
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !serviceKey) return null;
  const response = await fetch(`${url.replace(/\/$/, "")}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw new Error(`AI quota unavailable (${response.status})`);
  const text = await response.text();
  return text ? (JSON.parse(text) as T) : null;
}

/**
 * Charge one daily AI answer to this visitor. The ledger lives in Postgres so every
 * surface shares it, and only a successful answer is kept (see refundAiQuota).
 *
 * A limit of 0 means "no cap": the row is still written for telemetry, but the
 * guest is never blocked.
 */
export async function reserveAiQuota(
  scope: string,
  limit: number,
  visitorId?: string,
): Promise<{ quota: AiQuota; hash: string }> {
  const rawKey = visitorKey(visitorId ?? "");
  const hash = await hashKey(rawKey);
  // A limit of 0 means the deployment removed the cap: report 0/0 so the client
  // hides its counter, and skip the ledger entirely.
  if (limit <= 0) {
    return { quota: { allowed: true, remaining: 0, limit: 0, resetsAt: null }, hash };
  }
  try {
    const result = await quotaRpc<Partial<AiQuota>>("consume_ai_message", {
      p_scope: scope,
      p_visitor: hash,
      p_limit: limit,
      p_window_hours: QUOTA_WINDOW_HOURS,
    });
    if (!result) {
      return { quota: { allowed: true, remaining: limit, limit, resetsAt: null }, hash };
    }
    return {
      quota: {
        allowed: result.allowed !== false,
        remaining: typeof result.remaining === "number" ? result.remaining : limit,
        limit: typeof result.limit === "number" ? result.limit : limit,
        resetsAt: typeof result.resetsAt === "string" ? result.resetsAt : null,
      },
      hash,
    };
  } catch (error) {
    // Never block a guest because the ledger is unreachable; fall back to allowing.
    console.error("AI quota lookup failed", error instanceof Error ? error.message : error);
    return { quota: { allowed: true, remaining: limit, limit, resetsAt: null }, hash };
  }
}

/** A failed answer must not cost the guest a message. */
export async function refundAiQuota(scope: string, hash: string): Promise<void> {
  try {
    await quotaRpc("refund_ai_message", { p_scope: scope, p_visitor: hash });
  } catch (error) {
    console.error("AI quota refund failed", error instanceof Error ? error.message : error);
  }
}

/** True when the free provider pool has at least one usable route. */
export async function hasGeminiConfig(): Promise<boolean> {
  return hasAiConfig(await localEnv());
}

export type AiReplyOptions = {
  systemInstruction: string;
  messages: GeminiChatMessage[];
  maxOutputTokens?: number;
  temperature?: number;
  /** Ask the model for strict JSON, used by the partner form reader. */
  responseMimeType?: string;
};

/**
 * Ask the pooled free providers for one answer. Routes are tried in rotation, so
 * a rate-limited key or an offline provider is invisible to the guest.
 */
export async function generateAiReply({
  systemInstruction,
  messages,
  maxOutputTokens = 250,
  temperature = 0.5,
  responseMimeType,
}: AiReplyOptions): Promise<string> {
  const env = await localEnv();
  try {
    const result = await chat({
      systemInstruction,
      messages,
      maxOutputTokens,
      temperature,
      jsonMode: responseMimeType === "application/json",
      env,
    });
    return result.reply;
  } catch (error) {
    if (error instanceof AiPoolExhaustedError) {
      throw new Error("The AI assistant could not answer right now.");
    }
    throw error;
  }
}

/**
 * Backwards-compatible name for the concierge, card chat and form reader.
 * Everything routes through the free provider pool now.
 */
export async function generateGeminiReply(options: AiReplyOptions): Promise<string> {
  return generateAiReply(options);
}

/** Normalize a request's chat history: last five turns, 400 characters each. */
export function normalizeChatMessages(input: unknown): GeminiChatMessage[] {
  const messages = (Array.isArray(input) ? input : [])
    .slice(-5)
    .filter(
      (message): message is GeminiChatMessage =>
        !!message &&
        typeof message === "object" &&
        ((message as GeminiChatMessage).role === "user" ||
          (message as GeminiChatMessage).role === "assistant") &&
        typeof (message as GeminiChatMessage).content === "string" &&
        (message as GeminiChatMessage).content.trim().length > 0,
    )
    .map((message) => ({ role: message.role, content: message.content.trim().slice(0, 400) }));
  if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
    throw new Error("Please send a question.");
  }
  return messages;
}
