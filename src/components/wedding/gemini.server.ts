import { getRequest } from "@tanstack/react-start/server";
import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
} from "../../../supabase/functions/wedding-concierge/gemini-key";

export type GeminiChatMessage = { role: "user" | "assistant"; content: string };
type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

const VISITOR_WINDOW_MS = 24 * 60 * 60 * 1000;

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

/**
 * Small in-memory guard so each guest gets a bounded number of AI answers per day.
 * It is intentionally per-scope: the homepage concierge and a host's card assistant
 * cannot drain each other's allowance.
 */
export function enforceVisitorLimit(scope: string, limit: number) {
  const globalStore = globalThis as unknown as {
    __weddingVisitorLimits?: Map<string, { count: number; resetsAt: number }>;
  };
  if (!globalStore.__weddingVisitorLimits) globalStore.__weddingVisitorLimits = new Map();
  const store = globalStore.__weddingVisitorLimits;
  const key = `${scope}:${getRequestIp()}`;
  const now = Date.now();
  const current = store.get(key);

  if (!current || now > current.resetsAt) {
    store.set(key, { count: 1, resetsAt: now + VISITOR_WINDOW_MS });
  } else {
    if (current.count >= limit) {
      throw new Error(`You have used all ${limit} messages for today. Please come back tomorrow.`);
    }
    current.count += 1;
  }

  for (const [storedKey, bucket] of store) {
    if (now > bucket.resetsAt) store.delete(storedKey);
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
