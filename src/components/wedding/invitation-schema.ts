import { z } from "zod";
import {
  defaultInvitationElements,
  invitationFrameworkIds,
  invitationThemeIds,
} from "./invitation-options";
import { isSafePortrait, isSafeWebUrl, parseInvitationDate } from "./invitation-details";
import { INVITATION_SONG_LIMIT, isSafeSongUrl } from "./invitation-music";

/**
 * JSON-safe content. Invitation content is user-authored JSON, and the server
 * functions must hand the database something serializable — never `unknown`.
 */
export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

const portraitSchema = z
  .string()
  .refine(isSafePortrait, "Use a compressed JPEG portrait under 180 KB")
  .nullable()
  .default(null);

export const INVITATION_DATE_FORMAT_MESSAGE = "Date should be in this format: 26th November 2029";

const extraEventSchema = z.object({
  title: z.string().trim().min(1, "Event name is required").max(100),
  date: z
    .string()
    .trim()
    .min(1, INVITATION_DATE_FORMAT_MESSAGE)
    .max(100)
    .refine((value) => !!parseInvitationDate(value), INVITATION_DATE_FORMAT_MESSAGE),
  time: z.string().trim().min(1, "Event time is required").max(100),
  venue: z.string().trim().min(1, "Event venue is required").max(120),
  address: z.string().trim().max(200).default(""),
});

const songSchema = z.object({
  title: z.string().trim().min(1, "Give the song a title").max(80),
  url: z
    .string()
    .trim()
    .min(1, "Add a song link")
    .max(500)
    .refine(
      isSafeSongUrl,
      "Paste a valid YouTube song link, Spotify track/playlist link, or https:// audio URL",
    ),
});

const elementsSchema = z.object({
  gate: z.boolean().default(defaultInvitationElements.gate),
  countdown: z.boolean().default(defaultInvitationElements.countdown),
  message: z.boolean().default(defaultInvitationElements.message),
  portraits: z.boolean().default(defaultInvitationElements.portraits),
  story: z.boolean().default(defaultInvitationElements.story),
  gallery: z.boolean().default(defaultInvitationElements.gallery),
  schedule: z.boolean().default(defaultInvitationElements.schedule),
  venueMap: z.boolean().default(defaultInvitationElements.venueMap),
  dressCode: z.boolean().default(defaultInvitationElements.dressCode),
  contact: z.boolean().default(defaultInvitationElements.contact),
  rsvp: z.boolean().default(defaultInvitationElements.rsvp),
  wishes: z.boolean().default(defaultInvitationElements.wishes),
  gifts: z.boolean().default(defaultInvitationElements.gifts),
  livestream: z.boolean().default(defaultInvitationElements.livestream),
});

const optionalWebUrl = z
  .string()
  .trim()
  .max(500)
  .refine((value) => !value || isSafeWebUrl(value), "Use a full https:// link")
  .default("");

export const invitationContentSchema = z.object({
  groomName: z.string().trim().min(1, "Groom's name is required").max(80),
  brideName: z.string().trim().min(1, "Bride's name is required").max(80),
  date: z
    .string()
    .trim()
    .min(1, "Wedding date is required")
    .max(100)
    .refine((value) => !!parseInvitationDate(value), INVITATION_DATE_FORMAT_MESSAGE),
  time: z.string().trim().min(1, "Wedding time is required").max(100),
  venue: z.string().trim().min(1, "Venue is required").max(120),
  address: z.string().trim().min(1, "Venue address or city is required").max(200),
  eventType: z
    .string()
    .trim()
    .min(1, "Name the main ceremony")
    .max(80)
    .default("Wedding celebration"),
  message: z.string().trim().max(2000).default(""),
  story: z.string().trim().max(2000).default(""),
  hosts: z.string().trim().max(160).default(""),
  hostName: z.string().trim().max(60).default(""),
  riteLine: z.string().trim().max(80).default(""),
  dressCode: z.string().trim().max(160).default(""),
  contactName: z.string().trim().max(100).default(""),
  contactPhone: z
    .string()
    .trim()
    .max(50)
    .regex(/^[+0-9().\s-]*$/, "Use a phone number with digits, spaces or +")
    .default(""),
  arrivalNotes: z.string().trim().max(500).default(""),
  rsvpDeadline: z
    .string()
    .trim()
    .max(100)
    .refine((value) => !value || !!parseInvitationDate(value), INVITATION_DATE_FORMAT_MESSAGE)
    .default(""),
  /** Optional end of the ceremony; improves the calendar block. */
  endTime: z.string().trim().max(100).default(""),
  mapUrl: optionalWebUrl,
  livestreamUrl: optionalWebUrl,
  hashtag: z.string().trim().max(60).default(""),
  giftsNote: z.string().trim().max(300).default(""),
  additionalEvents: z.array(extraEventSchema).max(4, "Add at most four extra events").default([]),
  songs: z.array(songSchema).max(INVITATION_SONG_LIMIT, "Add at most five songs").default([]),
  groomPhoto: portraitSchema,
  bridePhoto: portraitSchema,
  theme: z.enum(invitationThemeIds).default("eid"),
  framework: z.enum(invitationFrameworkIds).default("moonlit"),
  elements: elementsSchema.default(defaultInvitationElements),
});

export type InvitationContent = z.infer<typeof invitationContentSchema>;
export type InvitationSongInput = InvitationContent["songs"][number];
export type ExtraEvent = InvitationContent["additionalEvents"][number];

export const invitationCardSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  slug: z
    .string()
    .trim()
    .min(8, "Slug must be at least 8 characters")
    .max(64)
    .regex(/^[a-z0-9-]+$/, "Use only lowercase letters, numbers and hyphens"),
  status: z.enum(["draft", "published"]).default("draft"),
  content: invitationContentSchema,
});

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

export function generateSlug(title: string): string {
  const base = slugify(title) || "invitation";
  const random = Math.random().toString(36).slice(2, 8).toLowerCase();
  const slug = `${base}-${random}`.replace(/^-+/, "").slice(0, 64);
  if (slug.length < 8) return `${slug}-${Math.random().toString(36).slice(2, 10)}`.slice(0, 8);
  return slug;
}
