import { buildConciergeInstruction } from "../_shared/concierge-personality.ts";
import {
  buildCardAssistantInstruction,
  cardAssistantFacts,
} from "../_shared/card-assistant.ts";
import { AI_NAME, GEMINI_API_KEY, GEMINI_MODEL } from "./gemini-key.ts";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

type ChatMessage = { role: "user" | "assistant"; content: string };
type RateBucket = { count: number; resetsAt: number };
type GeminiResponse = {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
};

const RATE_LIMIT = 5; // per-minute burst to minimize tokens
const RATE_WINDOW_MS = 60_000;
const VISITOR_LIMIT = 5; // total messages per visitor (to save tokens)
const VISITOR_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_BODY_BYTES = 4_000; // trimmed from 12k to save tokens
const rateBuckets = new Map<string, RateBucket>();
const visitorBuckets = new Map<string, RateBucket>();

function corsHeaders(request: Request) {
  const configuredOrigin = Deno.env.get("ALLOWED_ORIGIN")?.replace(/\/$/, "");
  const requestOrigin = request.headers.get("origin")?.replace(/\/$/, "");
  const allowedOrigin =
    configuredOrigin && requestOrigin === configuredOrigin
      ? requestOrigin
      : configuredOrigin || "*";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

function json(
  request: Request,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      ...extraHeaders,
    },
  });
}

function requestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("cf-connecting-ip") ||
    "unknown"
  );
}

// `scope` separates counters for each per-card assistant from the main Simran visitor limit,
// so chatting with one host's card does not use up the wedding concierge's messages.
function rateLimit(request: Request, scope = "") {
  const now = Date.now();
  if (rateBuckets.size > 500) {
    for (const [key, bucket] of rateBuckets) if (bucket.resetsAt <= now) rateBuckets.delete(key);
  }
  if (visitorBuckets.size > 2000) {
    for (const [key, bucket] of visitorBuckets) if (bucket.resetsAt <= now) visitorBuckets.delete(key);
  }
  const ip = scope ? `${scope}|${requestIp(request)}` : requestIp(request);
  // visitor total limit (5 per 24h) — saves tokens
  const v = visitorBuckets.get(ip);
  if (!v || v.resetsAt <= now) visitorBuckets.set(ip, { count: 1, resetsAt: now + VISITOR_WINDOW_MS });
  else {
    if (v.count >= VISITOR_LIMIT) return { allowed: false, retryAfter: Math.max(1, Math.ceil((v.resetsAt - now) / 1000)), visitor: true } as any;
    v.count += 1;
  }
  // per-minute burst
  const current = rateBuckets.get(ip);
  if (!current || current.resetsAt <= now) {
    rateBuckets.set(ip, { count: 1, resetsAt: now + RATE_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }
  if (current.count >= RATE_LIMIT) return { allowed: false, retryAfter: Math.max(1, Math.ceil((current.resetsAt - now) / 1000)) };
  current.count += 1;
  return { allowed: true, retryAfter: 0 };
}

const CARD_SLUG_PATTERN = /^[a-z0-9-]{8,64}$/;

/**
 * Loads a card through PostgREST with the public key. Row-level security returns only
 * published cards, so drafts and deleted cards cannot be read here. Expiry is checked again.
 */
async function loadPublishedCard(slug: string): Promise<{ title: string; content: unknown } | null> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  const key = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY") || "";
  if (!supabaseUrl || !key) throw new Error("Invitation service is unavailable");
  const url =
    `${supabaseUrl}/rest/v1/invitation_cards?select=title,content,expires_at` +
    `&slug=eq.${encodeURIComponent(slug)}&status=eq.published&limit=1`;
  const response = await fetch(url, {
    headers: { apikey: key, Accept: "application/json" },
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error("Invitation service is unavailable");
  const rows = (await response.json()) as Array<{ title: string; content: unknown; expires_at: string | null }>;
  const row = rows[0];
  if (!row || (row.expires_at && new Date(row.expires_at).getTime() < Date.now())) return null;
  return { title: row.title, content: row.content };
}

Deno.serve(async (request: Request) => {
  const configuredOrigin = Deno.env.get("ALLOWED_ORIGIN")?.replace(/\/$/, "");
  const requestOrigin = request.headers.get("origin")?.replace(/\/$/, "");
  if (configuredOrigin && requestOrigin && requestOrigin !== configuredOrigin) {
    return json(request, { error: "Origin is not allowed" }, 403);
  }

  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  if (request.method !== "POST") return json(request, { error: "Method not allowed" }, 405);

  const declaredSize = Number(request.headers.get("content-length") || "0");
  if (declaredSize > MAX_BODY_BYTES) return json(request, { error: "Request is too large" }, 413);

  let body: { language?: unknown; messages?: unknown; memory?: unknown; card?: unknown };
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json(request, { error: "Request is too large" }, 413);
    }
    const parsed = JSON.parse(rawBody);
    body = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return json(request, { error: "Invalid request" }, 400);
  }

  // A per-card assistant is identified by its public slug; anything else is the main Simran.
  const cardSlug = typeof body.card === "string" ? body.card.trim() : "";
  if (cardSlug && !CARD_SLUG_PATTERN.test(cardSlug)) {
    return json(request, { error: "Invalid request" }, 400);
  }

  const limit = rateLimit(request, cardSlug ? `card:${cardSlug}` : "") as any;
  if (!limit.allowed) {
    const isVisitor = (limit as any).visitor;
    const visitorMessage = cardSlug
      ? `You have used all ${VISITOR_LIMIT} messages for today with this invitation's assistant. Please come back tomorrow or contact the host directly.`
      : `You have used all ${VISITOR_LIMIT} messages for today. Please come back tomorrow or contact the couple directly.`;
    return json(request, { error: isVisitor ? visitorMessage : "Too many requests. Please wait a moment and try again." }, 429, {
      "Retry-After": String(limit.retryAfter),
    });
  }

  const apiKey = (Deno.env.get("GEMINI_API_KEY") || GEMINI_API_KEY).trim();
  if (!apiKey) return json(request, { error: "AI service is not configured" }, 500);

  try {
    const language =
      typeof body.language === "string" && ["English", "हिन्दी", "اردو"].includes(body.language)
        ? body.language
        : "English";
    const memory = typeof body.memory === "string" ? body.memory.slice(0, 1000) : "";
    const incoming = body.messages;
    if (!Array.isArray(incoming) || incoming.length === 0) {
      return json(request, { error: "A message is required" }, 400);
    }
    if (incoming.length > 5) return json(request, { error: "Conversation is too long — only last 5 messages allowed to save tokens" }, 400);

    const messages: ChatMessage[] = incoming.map((item: unknown) => {
      const value = item as Partial<ChatMessage>;
      if ((value.role !== "user" && value.role !== "assistant") || typeof value.content !== "string") throw new Error("Invalid message");
      const content = value.content.trim();
      if (!content || content.length > 400) throw new Error("Message is too long (max 400 chars to save tokens)");
      return { role: value.role, content };
    });
    if (messages[messages.length - 1]?.role !== "user") {
      return json(request, { error: "Please send a question" }, 400);
    }

    let systemInstruction: string;
    if (cardSlug) {
      let card: Awaited<ReturnType<typeof loadPublishedCard>>;
      try {
        card = await loadPublishedCard(cardSlug);
      } catch {
        return json(request, { error: "Invitation service is unavailable" }, 503);
      }
      const facts = card ? cardAssistantFacts(card.content) : null;
      if (!facts) return json(request, { error: "This invitation is not available." }, 404);
      systemInstruction = buildCardAssistantInstruction(facts);
    } else {
      systemInstruction = buildConciergeInstruction(AI_NAME, language, memory);
    }

    const configuredModel = (
      Deno.env.get("GEMINI_MODEL") ||
      GEMINI_MODEL ||
      "gemini-2.5-flash"
    ).trim();
    const model = /^[a-zA-Z0-9._-]{1,80}$/.test(configuredModel)
      ? configuredModel
      : "gemini-2.5-flash";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    let upstream: Response;
    try {
      upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemInstruction }] },
            contents: messages.map(({ role, content }) => ({
              role: role === "assistant" ? "model" : "user",
              parts: [{ text: content }],
            })),
            generationConfig: {
              temperature: 0.5,
              maxOutputTokens: 250,
              ...(model.startsWith("gemini-2.5-flash") ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
            },
          }),
        },
      );
    } finally {
      clearTimeout(timeout);
    }

    if (!upstream.ok) {
      console.error("Gemini request failed with status", upstream.status);
      return json(request, { error: "The AI service could not answer right now" }, 502);
    }

    const result = (await upstream.json()) as GeminiResponse;
    const reply = result.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? "")
      .join("\n")
      .trim();
    if (!reply) return json(request, { error: "No answer was returned" }, 502);
    return json(request, { reply });
  } catch (error) {
    const aborted = error instanceof Error && error.name === "AbortError";
    console.error(
      "Wedding concierge request failed",
      aborted ? "upstream timeout" : error instanceof Error ? error.message : "unknown error",
    );
    return json(
      request,
      { error: aborted ? "The AI service timed out. Please try again." : "Invalid request" },
      aborted ? 504 : 400,
    );
  }
});
