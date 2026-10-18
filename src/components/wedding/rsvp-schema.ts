import { z } from "zod";

export const normalizeGuestName = (name: string) => name.trim().replace(/\s+/g, " ").toLowerCase();

export const rsvpSchema = z.object({
  name: z.string().trim().min(1, "Please share your name").max(100),
  guests: z.number().int().min(1).max(5),
  events: z.array(z.enum(["Nikah", "Barat", "Walima"])),
  diet: z.string().trim().max(500),
  message: z.string().trim().max(2000),
});