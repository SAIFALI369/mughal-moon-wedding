import { getRequest } from "@tanstack/react-start/server";
import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
} from "../../../supabase/functions/wedding-concierge/gemini-key";

export type GeminiChatMessage = { role: "user" | "assistant"; content: string };
type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

function parseDotEnvValue(raw: string, key: string): string {
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = new RegExp(`^${key}\\s*=\\s*(.*)$`).exec(trimmed);
    if (match?.[1] !== undefined) {
      return match[1].trim().replace(/^["']|["']$/g, "");
    }
  }
  return "";
}

async function readLocalSupabaseEnv(): Promise<{ key: string; model: string }> {
  try {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const raw = await fs.readFile(path.resolve(process.cwd(), "supabase/.env"), "utf-8");
    return {
      key: parseDotEnvValue(raw, "GEMINI_API_KEY"),
      model: parseDotEnvValue(raw, "GEMINI_MODEL"),
    };
  } catch {
    return { key: "", model: "" };
  }
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
 */
export async function reserveAiQuota(
  scope: string,
  limit: number,
  visitorId?: string,
): Promise<{ quota: AiQuota; hash: string }> {
  const rawKey = visitorKey(visitorId ?? "");
  const hash = await hashKey(rawKey);
  try {
    const result = await quotaRpc<Partial<AiQuota>>("consume_ai_message", {
      p_scope: scope,
      p_visitor: hash,
      p_limit: limit,
      p_window_hours: QUOTA_WINDOW_HOURS,
    });
    if (!result) return { quota: { allowed: true, remaining: limit, limit, resetsAt: null }, hash };
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

/** True when a Gemini key is available to this server (env or local supabase/.env). */
export async function hasGeminiConfig(): Promise<boolean> {
  try {
    await resolveGeminiConfig();
    return true;
  } catch {
    return false;
  }
}

async function resolveGeminiConfig() {
  const local = await readLocalSupabaseEnv();
  const apiKey = (process.env["GEMINI_API_KEY"] || local.key || GEMINI_API_KEY || "").trim();
  if (!apiKey || apiKey === "REPLACE_WITH_YOUR_GEMINI_API_KEY") {
    throw new Error("The AI assistant is not configured yet.");
  }
  const configuredModel = (
    process.env["GEMINI_MODEL"] ||
    local.model ||
    GEMINI_MODEL ||
    "gemini-2.5-flash"
  ).trim();
  return {
    apiKey,
    model: /^[a-zA-Z0-9._-]{1,80}$/.test(configuredModel) ? configuredModel : "gemini-2.5-flash",
  };
}

/** Shared Gemini call for both the homepage concierge and each host's card assistant. */
export async function generateGeminiReply({
  systemInstruction,
  messages,
  maxOutputTokens = 250,
}: {
  systemInstruction: string;
  messages: GeminiChatMessage[];
  maxOutputTokens?: number;
}): Promise<string> {
  const { apiKey, model } = await resolveGeminiConfig();
  const upstream = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(15_000),
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemInstruction }] },
        contents: messages.map(({ role, content }) => ({
          role: role === "assistant" ? "model" : "user",
          parts: [{ text: content }],
        })),
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens,
          ...(model.startsWith("gemini-2.5-flash")
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
        },
      }),
    },
  );

  if (!upstream.ok) {
    console.error("Gemini request failed with status", upstream.status);
    throw new Error("The AI assistant could not answer right now.");
  }

  const result = (await upstream.json()) as GeminiResponse;
  const reply = result.candidates?.[0]?.content?.parts
    ?.map((part) => part.text ?? "")
    .join("\n")
    .trim();
  if (!reply) throw new Error("No answer was returned.");
  return reply;
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
