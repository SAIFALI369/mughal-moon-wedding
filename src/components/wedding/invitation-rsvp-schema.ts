import { z } from "zod";

/**
 * A guest's name is the only identity the host sees on an RSVP, so it must be a
 * real, readable name: letters (any script), spaces, and simple punctuation.
 * Numbers, emoji, links, single letters and obvious placeholders are rejected
 * here and again in the database.
 */
const NAME_CHARACTERS = /^[\p{L}\p{M} .'’-]+$/u;
const LETTERS_ONLY = /[^\p{L}\p{M}]/gu;
const PLACEHOLDER_NAMES = new Set([
  "a",
  "a guest",
  "abc",
  "abcd",
  "admin",
  "anon",
  "anonymous",
  "asdf",
  "asdfasdf",
  "guest",
  "guest guest",
  "guest user",
  "name",
  "n a",
  "na",
  "none",
  "not sure",
  "qwerty",
  "some guest",
  "someone",
  "test",
  "testing",
  "the guest",
  "unknown",
  "user",
  "xyz",
]);

/** Collapse double spaces and drop invisible characters before anything else. */
export function normalizeGuestName(value: string): string {
  return value
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns a guest-facing message, or `null` when the name is acceptable.
 * Used by the form, the Zod schema and the tests.
 */
export function guestNameError(value: string): string | null {
  const name = normalizeGuestName(value);
  if (!name) return "Please enter your full name.";
  if (name.length < 2) return "Enter your full name (at least two letters).";
  if (name.length > 100) return "Keep your name under 100 characters.";
  if (/https?:|www\.|@/i.test(name)) return "Links and email addresses are not names.";
  if (!NAME_CHARACTERS.test(name)) {
    return "Use letters only — numbers, emoji and symbols are not part of a name.";
  }
  const letters = name.replace(LETTERS_ONLY, "");
  if (letters.length < 2) return "Enter your real name (at least two letters).";
  const words = name.split(" ").filter((word) => word.replace(LETTERS_ONLY, "").length > 0);
  if (!words.some((word) => word.replace(LETTERS_ONLY, "").length >= 2)) {
    return "Enter your full name, not just initials.";
  }
  if (/^(\p{L})\1+$/u.test(letters)) return "Enter your real name.";
  if (PLACEHOLDER_NAMES.has(name.toLowerCase())) {
    return "Please enter the name you are replying for, not a placeholder.";
  }
  return null;
}

const guestName = z
  .string()
  .max(100, "Keep your name under 100 characters.")
  .superRefine((value, ctx) => {
    const message = guestNameError(value);
    if (message) ctx.addIssue({ code: z.ZodIssueCode.custom, message });
  })
  .transform(normalizeGuestName);

export const invitationRsvpSchema = z
  .object({
    card_id: z.string().uuid(),
    name: guestName,
    attending: z.boolean(),
    guests: z.number().int().min(0).max(10),
    contact: z.string().trim().max(120),
    dietary: z.string().trim().max(300),
    message: z.string().trim().max(1000),
  })
  .refine((value) => (value.attending ? value.guests >= 1 : value.guests === 0), {
    message: "Choose how many guests will attend",
    path: ["guests"],
  });
