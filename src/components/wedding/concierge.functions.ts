import { buildConciergeInstruction } from "../../../supabase/functions/_shared/concierge-personality";
import { AI_NAME } from "../../../supabase/functions/wedding-concierge/gemini-key";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const conciergeRequest = z.object({
  language: z.string().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(400),
      }),
    )
    .optional(),
  memory: z.string().max(2_000).optional(),
  /** Per-browser id so the daily allowance follows the guest, not a shared IP. */
  visitor: z
    .string()
    .regex(/^[a-zA-Z0-9-]{8,128}$/)
    .optional(),
});

const HOMEPAGE_DAILY_LIMIT = 5;

export const askSimranServer = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => conciergeRequest.parse(input))
  .handler(async ({ data }): Promise<{ reply: string; remaining: number; limit: number }> => {
    const { generateGeminiReply, normalizeChatMessages, refundAiQuota, reserveAiQuota } =
      await import("./gemini.server");

    const language =
      typeof data.language === "string" && ["English", "हिन्दी", "اردو"].includes(data.language)
        ? data.language
        : "English";
    const messages = normalizeChatMessages(data.messages);
    const memory = typeof data.memory === "string" ? data.memory.slice(0, 1000) : "";

    // Five answers per guest per day keep token use bounded on both backends.
    const { quota, hash } = await reserveAiQuota("homepage", HOMEPAGE_DAILY_LIMIT, data.visitor);
    if (!quota.allowed) {
      throw new Error(
        `You have used all ${quota.limit} messages for today. Please come back tomorrow.`,
      );
    }

    try {
      const systemInstruction = buildConciergeInstruction(AI_NAME, language, memory);
      const reply = await generateGeminiReply({ systemInstruction, messages });
      return { reply, remaining: quota.remaining, limit: quota.limit };
    } catch (error) {
      // A failed answer must not use up one of the guest's messages.
      await refundAiQuota("homepage", hash);
      throw error;
    }
  });
