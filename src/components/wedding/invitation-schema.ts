import { z } from "zod";

export const invitationContentSchema = z.object({
  groomName: z.string().trim().min(1).max(80),
  brideName: z.string().trim().min(1).max(80),
  date: z.string().trim().min(1).max(100),
  time: z.string().trim().max(100).default(""),
  venue: z.string().trim().min(1).max(120),
  address: z.string().trim().max(200).default(""),
  message: z.string().trim().max(2000).default(""),
  theme: z.enum(["mughal", "eid", "classic"]).default("mughal"),
});

export type InvitationContent = z.infer<typeof invitationContentSchema>;

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
  // ensure 8-64 chars and matches ^[a-z0-9-]+$
  const slug = `${base}-${random}`.replace(/^-+/, "").slice(0, 64);
  // pad if too short
  if (slug.length < 8) return `${slug}-${Math.random().toString(36).slice(2, 10)}`.slice(0, 8);
  return slug;
}
