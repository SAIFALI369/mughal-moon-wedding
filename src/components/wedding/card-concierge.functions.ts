import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { dailyLimit } from "@/lib/ai-limits";
import {
  buildCardConciergeInstruction,
  type CardConciergeFacts,
} from "../../../supabase/functions/_shared/concierge-personality";

const cardConciergeInput = z.object({
  slug: z
    .string()
    .min(8)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  language: z.enum(["English", "हिन्दी", "اردو"]).default("English"),
  /** Per-browser id so the daily allowance is not shared between guests on one IP. */
  visitor: z
    .string()
    .regex(/^[a-zA-Z0-9-]{8,128}$/)
    .optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(400),
      }),
    )
    .min(1)
    .max(5),
});

export type CardConciergeReply = {
  reply: string;
  assistantName: string;
  remaining: number;
  limit: number;
  resetsAt: string | null;
};

/** Per-guest daily answers for one card's assistant; `0` removes the cap. */
const CARD_DAILY_LIMIT = dailyLimit("AI_DAILY_LIMIT_CARD");

type EdgeReply = {
  reply?: unknown;
  assistantName?: unknown;
  remaining?: unknown;
  limit?: unknown;
  resetsAt?: unknown;
  error?: unknown;
};

/**
 * When this deployment has no Gemini key of its own, ask the already-configured
 * Supabase Edge Function. It holds the key, loads the same published card and
 * charges the same daily allowance, so card chat works out of the box.
 */
async function askEdgeCardConcierge(data: {
  slug: string;
  language: string;
  visitor?: string;
  messages: { role: "user" | "assistant"; content: string }[];
}): Promise<CardConciergeReply> {
  const url = process.env["SUPABASE_URL"]?.replace(/\/$/, "");
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("The AI assistant is not configured yet.");

  const response = await fetch(`${url}/functions/v1/wedding-concierge`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      mode: "card",
      slug: data.slug,
      language: data.language,
      ...(data.visitor ? { visitor: data.visitor } : {}),
      messages: data.messages,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const payload = (await response.json().catch(() => ({}))) as EdgeReply;
  if (!response.ok) {
    const message =
      typeof payload.error === "string"
        ? payload.error
        : "The AI assistant could not answer right now.";
    throw new Error(message);
  }
  if (typeof payload.reply !== "string" || !payload.reply.trim()) {
    throw new Error("No answer was returned.");
  }
  return {
    reply: payload.reply.trim(),
    assistantName: typeof payload.assistantName === "string" ? payload.assistantName : "",
    remaining: typeof payload.remaining === "number" ? payload.remaining : CARD_DAILY_LIMIT,
    limit: typeof payload.limit === "number" ? payload.limit : CARD_DAILY_LIMIT,
    resetsAt: typeof payload.resetsAt === "string" ? payload.resetsAt : null,
  };
}

/**
 * The assistant that belongs to one host's card. Facts are loaded from the published
 * card on the server, so a guest cannot make the model answer with invented details.
 */
export const askCardConcierge = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => cardConciergeInput.parse(input))
  .handler(async ({ data }): Promise<CardConciergeReply> => {
    const [
      {
        generateAiReply,
        getRequestIp,
        hasGeminiConfig,
        normalizeChatMessages,
        reserveAiQuota,
        refundAiQuota,
      },
      { fetchPublishedCardForGuests },
      { getInvitationDetails, getInvitationAssistantName },
    ] = await Promise.all([
      import("./gemini.server"),
      import("./invitation-card-public.server"),
      import("./invitation-details"),
    ]);

    const messages = normalizeChatMessages(data.messages);
    // Storage-blocked browsers send no id; give them their own key instead of the
    // shared "unknown" bucket. The Edge token pattern allows letters, digits and dashes.
    const visitor =
      data.visitor ?? `ip-${getRequestIp().replace(/[^a-zA-Z0-9]+/g, "-")}`.slice(0, 128);

    // No key on this deployment? The Edge Function already holds one and charges
    // the same daily allowance, so it is the single enforcement point.
    if (!(await hasGeminiConfig())) {
      return askEdgeCardConcierge({
        slug: data.slug,
        language: data.language,
        visitor,
        messages,
      });
    }

    const scope = `card:${data.slug}`;
    const { quota, hash } = await reserveAiQuota(scope, CARD_DAILY_LIMIT, visitor);
    if (!quota.allowed) {
      throw new Error(
        `You have used all ${quota.limit} messages for today. Please come back tomorrow.`,
      );
    }

    try {
      const card = await fetchPublishedCardForGuests(data.slug);
      if (!card) throw new Error("This invitation is no longer available.");

      const details = getInvitationDetails(card.content);
      const assistantName = getInvitationAssistantName(details);
      const facts: CardConciergeFacts = {
        assistantName,
        hostName: details.hostName || assistantName,
        hostLine: details.hosts,
        couple: `${details.groomName} & ${details.brideName}`,
        eventType: details.eventType,
        date: details.date,
        time: details.time,
        venue: details.venue,
        address: details.address,
        message: details.message,
        story: details.story,
        dressCode: details.dressCode,
        contactName: details.contactName,
        contactPhone: details.contactPhone,
        arrivalNotes: details.arrivalNotes,
        rsvpDeadline: details.rsvpDeadline,
        endTime: details.endTime,
        hashtag: details.hashtag,
        giftsNote: details.giftsNote,
        livestreamUrl: details.livestreamUrl,
        extraEvents: details.additionalEvents,
        songs: details.songs.map((song) => ({ title: song.title })),
      };

      const systemInstruction = buildCardConciergeInstruction(facts, data.language);
      const reply = await generateAiReply({ systemInstruction, messages });
      return {
        reply,
        assistantName,
        remaining: quota.remaining,
        limit: quota.limit,
        resetsAt: quota.resetsAt,
      };
    } catch (error) {
      // A failed answer must not use up one of the guest's messages.
      await refundAiQuota(scope, hash);
      throw error;
    }
  });
