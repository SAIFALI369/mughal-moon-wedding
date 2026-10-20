import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Simran, the partner-only form reader.
 *
 * A print shop pastes the notes it was given — often unstructured, often in a
 * hurry — and Simran returns a *reading* the partner can review field by field
 * before applying it. The server verifies the caller's partner allowance, so
 * the tool is never reachable from a guest's card or a signed-out tab.
 */
const readRequest = z.object({
  text: z.string().trim().min(12, "Paste at least a line or two to read.").max(4_000),
  /** The caller's Supabase access token; verified before any AI call. */
  accessToken: z.string().trim().max(4_000),
  /** Per-browser id, so one partner cannot burn another's daily allowance. */
  visitor: z
    .string()
    .regex(/^[a-zA-Z0-9-]{8,128}$/)
    .optional(),
});

export const readInvitationNotes = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => readRequest.parse(input))
  .handler(async ({ data }) => {
    const { readNotesWithSimran } = await import("./form-assistant.server");
    return readNotesWithSimran({
      text: data.text,
      accessToken: data.accessToken,
      visitor: data.visitor,
    });
  });
