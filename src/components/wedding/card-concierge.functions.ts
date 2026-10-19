import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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

/**
 * The assistant that belongs to one host's card. Facts are loaded from the published
 * card on the server, so a guest cannot make the model answer with invented details.
 */
export const askCardConcierge = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => cardConciergeInput.parse(input))
  .handler(async ({ data }): Promise<{ reply: string; assistantName: string }> => {
    const [
      { enforceVisitorLimit, generateGeminiReply, normalizeChatMessages },
      { fetchPublishedCardForGuests },
      { getInvitationDetails, getInvitationAssistantName },
    ] = await Promise.all([
      import("./gemini.server"),
      import("./invitation-card-public.server"),
      import("./invitation-details"),
    ]);

    // A host's assistant has its own daily allowance, separate from the homepage concierge.
    enforceVisitorLimit(`card-concierge:${data.slug}`, 6);

    const messages = normalizeChatMessages(data.messages);
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
      extraEvents: details.additionalEvents,
      songs: details.songs.map((song) => ({ title: song.title })),
    };

    const systemInstruction = buildCardConciergeInstruction(facts, data.language);
    const reply = await generateGeminiReply({ systemInstruction, messages });
    return { reply, assistantName };
  });
