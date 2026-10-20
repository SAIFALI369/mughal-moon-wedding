import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generateSlug,
  invitationCardSchema,
  jsonValueSchema,
  type JsonValue,
} from "./invitation-schema";

// Server function variants enforce ownership and limit in addition to DB trigger

const createInput = z.object({
  title: z.string().min(1).max(120),
  slug: z
    .string()
    .min(8)
    .max(64)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  content: jsonValueSchema.default({}),
});

export const createInvitationCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const slug = data.slug?.trim() ? data.slug.trim().toLowerCase() : generateSlug(data.title);
    // The atomic database credit trigger is authoritative on every create path.
    const { data: inserted, error } = await supabase
      .from("invitation_cards")
      .insert({
        owner_id: userId,
        title: data.title.trim(),
        slug,
        status: "draft",
        content: data.content,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const updateInvitationCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        title: z.string().min(1).max(120).optional(),
        slug: z
          .string()
          .min(8)
          .max(64)
          .regex(/^[a-z0-9-]+$/)
          .optional(),
        status: z.enum(["draft", "published"]).optional(),
        content: jsonValueSchema.optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Ensure ownership
    const { data: current, error: fetchError } = await supabase
      .from("invitation_cards")
      .select("id, owner_id")
      .eq("id", data.id)
      .single();
    if (fetchError || !current) throw new Error("Card not found");
    if (current.owner_id !== userId) throw new Error("Not authorized to edit this card");
    const patch: {
      title?: string;
      slug?: string;
      status?: "draft" | "published";
      content?: JsonValue;
    } = {};
    if (data.title) patch.title = data.title.trim();
    if (data.slug) patch.slug = data.slug.trim().toLowerCase();
    if (data.status) patch.status = data.status;
    if (data.content) patch.content = data.content;
    const { data: updated, error } = await supabase
      .from("invitation_cards")
      .update(patch)
      .eq("id", data.id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const deleteInvitationCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: current, error: fetchError } = await supabase
      .from("invitation_cards")
      .select("id, owner_id")
      .eq("id", data.id)
      .single();
    if (fetchError || !current) throw new Error("Card not found");
    if (current.owner_id !== userId) throw new Error("Not authorized to delete this card");
    const { error } = await supabase.from("invitation_cards").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { success: true };
  });

export const getMyInvitationCards = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("invitation_cards")
      .select("*")
      .eq("owner_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  });

export const getInvitationCardBySlug = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        slug: z
          .string()
          .min(8)
          .max(64)
          .regex(/^[a-z0-9-]+$/),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { fetchPublishedCardForGuests } = await import("./invitation-card-public.server");
    return fetchPublishedCardForGuests(data.slug);
  });
