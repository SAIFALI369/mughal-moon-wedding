import { z } from "zod";

export const invitationRsvpSchema = z
  .object({
    card_id: z.string().uuid(),
    name: z.string().trim().min(1, "Please enter your name").max(100),
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
