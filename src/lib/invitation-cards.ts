import { supabase } from "@/lib/db";
import { generateSlug } from "@/components/wedding/invitation-schema";

export type InvitationCardRow = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: string;
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  expires_at: string | null;
};
export type InvitationCardInsert = Partial<InvitationCardRow> & {
  owner_id: string;
  title: string;
  slug: string;
};

export async function fetchMyCards() {
  const { data, error } = await supabase
    .from("invitation_cards")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchCardById(id: string) {
  const { data, error } = await supabase.from("invitation_cards").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function fetchCardBySlug(slug: string) {
  // Public fetch: RLS allows anon to read published
  const { data, error } = await supabase
    .from("invitation_cards")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data;
}

export async function createCard(
  input: Omit<InvitationCardInsert, "owner_id"> & { owner_id?: string },
) {
  const { data: session } = await supabase.auth.getSession();
  const owner_id = input.owner_id ?? session.session?.user.id;
  if (!owner_id) throw new Error("You must be signed in to create a card");
  const payload = { ...input, owner_id };
  const { data, error } = await supabase.from("invitation_cards").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateCard(id: string, patch: Partial<InvitationCardInsert>) {
  const { data, error } = await supabase
    .from("invitation_cards")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCard(id: string) {
  const { error } = await supabase.from("invitation_cards").delete().eq("id", id);
  if (error) throw error;
}

export async function publishCard(id: string) {
  return updateCard(id, { status: "published" });
}
export async function unpublishCard(id: string) {
  return updateCard(id, { status: "draft" });
}

/** Postgres error codes we translate into something a partner can act on. */
const FRIENDLY_ERRORS: Record<string, string> = {
  "23505": "That link is already taken. Try saving again — a new link is generated each time.",
  "42501": "You are not signed in as the owner of this card. Sign in again and retry.",
  P0001: "Your account cannot create more cards right now. Check the package credits.",
};

export function friendlyCardError(error: { code?: string; message?: string } | null): string {
  if (!error) return "Something went wrong. Please try again.";
  const mapped = error.code ? FRIENDLY_ERRORS[error.code] : undefined;
  if (mapped && error.code === "P0001") {
    // The trigger messages are already specific about credits/allowance.
    return error.message?.trim() || mapped;
  }
  return mapped ?? error.message?.trim() ?? "Something went wrong. Please try again.";
}

/**
 * Inserts a card, regenerating the share slug if it ever collides.
 *
 * Two cards with the same title and theme are perfectly valid — the only
 * uniqueness the database enforces is `slug` — so a collision must retry, never
 * surface as "the card wasn't created".
 */
export async function insertInvitationCard<T = Record<string, unknown>>(
  payload: Record<string, unknown> & { title: string; slug: string },
  attempts = 4,
): Promise<T> {
  let lastError: { code?: string; message?: string } | null = null;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const slug = attempt === 0 ? payload.slug : generateSlug(payload.title);
    const { data, error } = await supabase
      .from("invitation_cards")
      .insert({ ...payload, slug })
      .select()
      .single();
    if (!error && data) return data as T;
    lastError = error;
    if (error?.code !== "23505") break;
  }
  throw new Error(friendlyCardError(lastError));
}

/**
 * Moves a card between draft and published and *verifies* it happened.
 *
 * A `.update()` without `.select()` reports no error even when row-level
 * security matched zero rows, which is how a publish could previously look
 * successful while nothing changed.
 */
export async function setCardStatus(id: string, status: "draft" | "published") {
  const { data, error } = await supabase
    .from("invitation_cards")
    .update({ status })
    .eq("id", id)
    .select("id, status, published_at")
    .maybeSingle();
  if (error) throw new Error(friendlyCardError(error));
  if (!data) throw new Error("Nothing changed — this card is not yours or it no longer exists.");
  return data as { id: string; status: string; published_at: string | null };
}
