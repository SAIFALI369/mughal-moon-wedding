import { buildConciergeInstruction } from "../../../supabase/functions/_shared/concierge-personality";
import {
  buildCardAssistantInstruction,
  cardAssistantFacts,
} from "../../../supabase/functions/_shared/card-assistant";
import { createServerFn } from "@tanstack/react-start";
import { loadPublishedInvitationBySlug } from "./invitation-cards.functions";

type ChatMessage = { role: "user" | "assistant"; content: string };
type ConciergeRequest = { language?: string; messages?: ChatMessage[]; memory?: string };
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

export const askSimranServer = createServerFn({ method: "POST" })
  .inputValidator((input: ConciergeRequest) => input)
  .handler(async ({ data }): Promise<{ reply: string }> => {
    // Token-saving + 5-message limit (server fallback)
    // Simple in-memory per-IP visitor limit (mirrors edge)
    const getReq = () => {
      try {
        // @ts-ignore
        const { getRequest } = require("@tanstack/react-start/server");
        return getRequest();
      } catch { return null; }
    };
    const req: any = getReq();
    const ip = req?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || req?.headers?.get?.("cf-connecting-ip") || "unknown-server";
    const g = globalThis as any;
    if (!g.__simranVisitor) g.__simranVisitor = new Map();
    const map: Map<string, { c: number; reset: number }> = g.__simranVisitor;
    const now = Date.now();
    const VISITOR_LIMIT = 5;
    const VISITOR_WINDOW = 86400000;
    const v = map.get(ip);
    if (!v || now > v.reset) map.set(ip, { c: 1, reset: now + VISITOR_WINDOW });
    else {
      if (v.c >= VISITOR_LIMIT) throw new Error(`You have used all ${VISITOR_LIMIT} messages for today. Please come back tomorrow.`);
      v.c += 1;
    }
    for (const [k, b] of map) { if (now > b.reset) map.delete(k); }
    if (map.size > 2000) { for (const [kk, bb] of map) { if (now > bb.reset) map.delete(kk); } }

    const { AI_NAME, GEMINI_API_KEY, GEMINI_MODEL } =
      await import("../../../supabase/functions/wedding-concierge/gemini-key");

    let envFileKey = "";
    let envFileModel = "";
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const supabaseEnv = await fs.readFile(path.resolve(process.cwd(), "supabase/.env"), "utf-8");
      envFileKey = parseDotEnvValue(supabaseEnv, "GEMINI_API_KEY");
      envFileModel = parseDotEnvValue(supabaseEnv, "GEMINI_MODEL");
    } catch {
      // Optional local supabase/.env file
    }

    const apiKey = (process.env["GEMINI_API_KEY"] || envFileKey || GEMINI_API_KEY || "").trim();
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const language =
      typeof data.language === "string" && ["English", "हिन्दी", "اردو"].includes(data.language)
        ? data.language
        : "English";

    const incoming = Array.isArray(data.messages) ? data.messages.slice(-5) : [];
    const messages = incoming
      .filter(
        (m): m is ChatMessage =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0,
      )
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 400) }));

    if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
      throw new Error("Please send a question");
    }

    const configuredModel = (
      process.env["GEMINI_MODEL"] ||
      envFileModel ||
      GEMINI_MODEL ||
      "gemini-2.5-flash"
    ).trim();
    const model = /^[a-zA-Z0-9._-]{1,80}$/.test(configuredModel)
      ? configuredModel
      : "gemini-2.5-flash";

    const memory = typeof (data as any).memory === "string" ? ((data as any).memory as string).slice(0, 1000) : "";
    const systemInstruction = buildConciergeInstruction(AI_NAME, language, memory);

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
            maxOutputTokens: 250, // trimmed
            ...(model.startsWith("gemini-2.5-flash")
              ? { thinkingConfig: { thinkingBudget: 0 } }
              : {}),
          },
        }),
      },
    );

    if (!upstream.ok) {
      console.error("Gemini request failed with status", upstream.status);
      throw new Error("The AI service could not answer right now");
    }

    const result = (await upstream.json()) as GeminiResponse;
    const reply = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim();

    if (!reply) {
      throw new Error("No answer was returned");
    }

    return { reply };
  });

const CARD_SLUG_PATTERN = /^[a-z0-9-]{8,64}$/;

/**
 * Per-card assistant, server fallback. It mirrors the Edge Function's card branch: the card
 * is read from the database by its public slug, and its visitor limit is separate from Simran's.
 */
export const askHostAssistantServer = createServerFn({ method: "POST" })
  .inputValidator((input: { slug?: unknown; messages?: unknown }) => input)
  .handler(async ({ data }): Promise<{ reply: string }> => {
    const slug = typeof data.slug === "string" ? data.slug.trim() : "";
    if (!CARD_SLUG_PATTERN.test(slug)) throw new Error("This invitation is not available.");

    const getReq = () => {
      try {
        // @ts-ignore
        const { getRequest } = require("@tanstack/react-start/server");
        return getRequest();
      } catch {
        return null;
      }
    };
    const req: any = getReq();
    const ip =
      req?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() ||
      req?.headers?.get?.("cf-connecting-ip") ||
      "unknown-server";
    const g = globalThis as any;
    if (!g.__cardAssistantVisitor) g.__cardAssistantVisitor = new Map();
    const map: Map<string, { c: number; reset: number }> = g.__cardAssistantVisitor;
    const now = Date.now();
    const VISITOR_LIMIT = 5;
    const VISITOR_WINDOW = 86400000;
    const key = `${slug}|${ip}`;
    const v = map.get(key);
    if (!v || now > v.reset) map.set(key, { c: 1, reset: now + VISITOR_WINDOW });
    else {
      if (v.c >= VISITOR_LIMIT)
        throw new Error(
          `You have used all ${VISITOR_LIMIT} messages for today with this invitation's assistant. Please come back tomorrow or contact the host directly.`,
        );
      v.c += 1;
    }
    for (const [k, b] of map) {
      if (now > b.reset) map.delete(k);
    }

    const { GEMINI_API_KEY, GEMINI_MODEL } =
      await import("../../../supabase/functions/wedding-concierge/gemini-key");

    let envFileKey = "";
    let envFileModel = "";
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const supabaseEnv = await fs.readFile(path.resolve(process.cwd(), "supabase/.env"), "utf-8");
      envFileKey = parseDotEnvValue(supabaseEnv, "GEMINI_API_KEY");
      envFileModel = parseDotEnvValue(supabaseEnv, "GEMINI_MODEL");
    } catch {
      // Optional local supabase/.env file
    }

    const apiKey = (process.env["GEMINI_API_KEY"] || envFileKey || GEMINI_API_KEY || "").trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");

    const card = await loadPublishedInvitationBySlug(slug);
    const facts = card ? cardAssistantFacts(card.content) : null;
    if (!facts) throw new Error("This invitation is not available.");

    const incoming = Array.isArray(data.messages) ? (data.messages as ChatMessage[]).slice(-5) : [];
    const messages = incoming
      .filter(
        (m): m is ChatMessage =>
          !!m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0,
      )
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 400) }));
    if (messages.length === 0 || messages[messages.length - 1]?.role !== "user") {
      throw new Error("Please send a question");
    }

    const configuredModel = (
      process.env["GEMINI_MODEL"] ||
      envFileModel ||
      GEMINI_MODEL ||
      "gemini-2.5-flash"
    ).trim();
    const model = /^[a-zA-Z0-9._-]{1,80}$/.test(configuredModel)
      ? configuredModel
      : "gemini-2.5-flash";

    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        signal: AbortSignal.timeout(15_000),
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: buildCardAssistantInstruction(facts) }] },
          contents: messages.map(({ role, content }) => ({
            role: role === "assistant" ? "model" : "user",
            parts: [{ text: content }],
          })),
          generationConfig: {
            temperature: 0.5,
            maxOutputTokens: 250,
            ...(model.startsWith("gemini-2.5-flash")
              ? { thinkingConfig: { thinkingBudget: 0 } }
              : {}),
          },
        }),
      },
    );

    if (!upstream.ok) {
      console.error("Gemini request failed with status", upstream.status);
      throw new Error("The AI service could not answer right now");
    }

    const result = (await upstream.json()) as GeminiResponse;
    const reply = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim();
    if (!reply) throw new Error("No answer was returned");
    return { reply };
  });
