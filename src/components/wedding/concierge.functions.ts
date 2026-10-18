import { buildConciergeInstruction } from "../../../supabase/functions/_shared/concierge-personality";
import { createServerFn } from "@tanstack/react-start";

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

    const incoming = Array.isArray(data.messages) ? data.messages.slice(-10) : [];
    const messages = incoming
      .filter(
        (m): m is ChatMessage =>
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0,
      )
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 800) }));

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

    const memory = typeof (data as any).memory === "string" ? ((data as any).memory as string).slice(0, 4000) : "";
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
            temperature: 0.6,
            maxOutputTokens: 600,
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
