import { supabase } from "@/lib/db";

export type InvitationCardRow = { id: string; owner_id: string; title: string; slug: string; status: string; content: Record<string, unknown>; created_at: string; updated_at: string; published_at: string | null; expires_at: string | null };
export type InvitationCardInsert = Partial<InvitationCardRow> & { owner_id: string; title: string; slug: string };

export async function fetchMyCards() {
  const { data, error } = await supabase
    .from("invitation_cards")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchCardById(id: string) {
  const { data, error } = await supabase
    .from("invitation_cards")
    .select("*")
    .eq("id", id)
    .single();
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

export async function createCard(input: Omit<InvitationCardInsert, "owner_id"> & { owner_id?: string }) {
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
