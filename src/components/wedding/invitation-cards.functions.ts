import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { invitationCardSchema, generateSlug } from "./invitation-schema";

// Server function variants enforce ownership and limit in addition to DB trigger

const createInput = z.object({
  title: z.string().min(1).max(120),
  slug: z.string().min(8).max(64).regex(/^[a-z0-9-]+$/).optional(),
  content: z.record(z.unknown()).default({}),
});

export const createInvitationCard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    const slug = data.slug?.trim() ? data.slug.trim().toLowerCase() : generateSlug(data.title);
    const { data: existing, error: countError } = await supabase
      .from("invitation_cards")
      .select("id", { count: "exact" })
      .eq("owner_id", userId);
    if (countError) throw new Error(countError.message);
    if ((existing?.length ?? 0) >= 3) {
      throw new Error("You may have at most 3 active cards. Delete one before creating another.");
    }
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
        slug: z.string().min(8).max(64).regex(/^[a-z0-9-]+$/).optional(),
        status: z.enum(["draft", "published"]).optional(),
        content: z.record(z.unknown()).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as { supabase: any; userId: string };
    // Ensure ownership
    const { data: current, error: fetchError } = await supabase
      .from("invitation_cards")
      .select("id, owner_id")
      .eq("id", data.id)
      .single();
    if (fetchError || !current) throw new Error("Card not found");
    if (current.owner_id !== userId) throw new Error("Not authorized to edit this card");
    const patch: Record<string, unknown> = {};
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
    const { supabase, userId } = context as { supabase: any; userId: string };
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
    const { supabase, userId } = context as { supabase: any; userId: string };
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
    z.object({ slug: z.string().min(8).max(64).regex(/^[a-z0-9-]+$/) }).parse(input),
  )
  .handler(async ({ data }) => {
    // Always use an anonymous client, never the owner's session or a service-role key.
    // The query and the database's RLS must both require a published card.
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    if (!url || !key) throw new Error("Invitation service is unavailable");
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        // Opaque publishable keys belong in `apikey`, not in a Bearer token.
        // This matches the public wishes loader and works with Lovable's Supabase proxy.
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`)
            headers.delete("Authorization");
          headers.set("apikey", key);
          return fetch(input, { ...init, headers, signal: init?.signal ?? AbortSignal.timeout(5_000) });
        },
      },
    });
    const { data: card, error } = await client
      .from("invitation_cards")
      .select("id, title, slug, content, published_at, expires_at")
      .eq("slug", data.slug)
      .eq("status", "published")
      .maybeSingle();
    if (error) throw new Error(error.message);
    // Match the dashboard's expiry behavior even if cleanup has not run yet.
    if (!card || (card.expires_at && new Date(card.expires_at).getTime() < Date.now())) return null;
    return card;
  });
