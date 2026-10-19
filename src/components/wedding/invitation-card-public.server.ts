import { createClient } from "@supabase/supabase-js";
import type { JsonValue } from "./invitation-schema";

export type { JsonValue };

export type PublicInvitationCard = {
  id: string;
  title: string;
  slug: string;
  content: JsonValue;
  published_at: string | null;
  expires_at: string | null;
};

/**
 * Public, anonymous read of a published card. Never use the owner's session or a
 * service-role key here: the card's RLS policy and the status check must both apply.
 */
export async function fetchPublishedCardForGuests(
  slug: string,
): Promise<PublicInvitationCard | null> {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Invitation service is unavailable");

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Opaque publishable keys belong in `apikey`, not in a Bearer token.
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith("sb_") && headers.get("Authorization") === `Bearer ${key}`) {
          headers.delete("Authorization");
        }
        headers.set("apikey", key);
        return fetch(input, {
          ...init,
          headers,
          signal: init?.signal ?? AbortSignal.timeout(5_000),
        });
      },
    },
  });

  const { data: card, error } = await client
    .from("invitation_cards")
    .select("id, title, slug, content, published_at, expires_at")
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  if (error) throw new Error(error.message);
  // Match the dashboard's expiry behavior even if cleanup has not run yet.
  if (!card || (card.expires_at && new Date(card.expires_at).getTime() < Date.now())) {
    return null;
  }
  return card as PublicInvitationCard;
}
