import { buildConciergeInstruction } from "../../../supabase/functions/_shared/concierge-personality";
import { AI_NAME } from "../../../supabase/functions/wedding-concierge/gemini-key";
import { createServerFn } from "@tanstack/react-start";

type ChatMessage = { role: "user" | "assistant"; content: string };
type ConciergeRequest = { language?: string; messages?: ChatMessage[]; memory?: string };

export const askSimranServer = createServerFn({ method: "POST" })
  .inputValidator((input: ConciergeRequest) => input)
  .handler(async ({ data }): Promise<{ reply: string }> => {
    const { enforceVisitorLimit, generateGeminiReply, normalizeChatMessages } =
      await import("./gemini.server");

    // Five answers per guest per day keep token use bounded on both backends.
    enforceVisitorLimit("homepage-concierge", 5);

    const language =
      typeof data.language === "string" && ["English", "हिन्दी", "اردو"].includes(data.language)
        ? data.language
        : "English";

    const messages = normalizeChatMessages(data.messages);
    const memory = typeof data.memory === "string" ? data.memory.slice(0, 1000) : "";
    const systemInstruction = buildConciergeInstruction(AI_NAME, language, memory);
    const reply = await generateGeminiReply({ systemInstruction, messages });
    return { reply };
  });
