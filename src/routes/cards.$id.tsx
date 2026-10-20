import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { invitationContentSchema } from "@/components/wedding/invitation-schema";
import { InvitationDetailsFields } from "@/components/wedding/invitation-form";
import {
  emptyInvitationForm,
  invitationFormForCard,
  type InvitationForm,
} from "@/components/wedding/invitation-form-data";
import { invitationExpiry } from "@/components/wedding/invitation-details";
import type { Database } from "@/integrations/supabase/types";

type InvitationCard = Database["public"]["Tables"]["invitation_cards"]["Row"];

export const Route = createFileRoute("/cards/$id")({
  component: CardEditor,
});

function CardEditor() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [card, setCard] = useState<InvitationCard | null>(null);
  const [form, setForm] = useState<InvitationForm>(emptyInvitationForm);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [simran, setSimran] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/sign-in" });
  }, [user, loading, navigate]);

  useEffect(() => {
    async function load() {
      // RLS already restricts drafts to their owner; scope the query too.
      const { data, error } = await supabase
        .from("invitation_cards")
        .select(
          "id, owner_id, title, slug, status, content, created_at, updated_at, published_at, expires_at",
        )
        .eq("id", id)
        .eq("owner_id", user?.id ?? "")
        .single();
      if (error) {
        setError(error.message);
        return;
      }
      if (data.owner_id !== user?.id) {
        setError("You can only edit your own cards.");
        return;
      }
      setCard(data as InvitationCard);
      setForm(invitationFormForCard(data.title, data.content));
    }
    if (user) load();
  }, [id, user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    // RLS limits this row to the signed-in owner; a print partner is an admin.
    supabase
      .from("print_partners")
      .select("active")
      .eq("owner_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setSimran(!!data?.active);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (!form.title.trim()) throw new Error("Card title is required.");
      const parsed = invitationContentSchema.safeParse(form);
      if (!parsed.success)
        throw new Error(parsed.error.issues[0]?.message || "Complete the invitation details.");
      const { error } = await supabase
        .from("invitation_cards")
        .update({
          title: form.title.trim(),
          content: parsed.data,
          expires_at: invitationExpiry(parsed.data.date),
        })
        .eq("id", id)
        .eq("owner_id", user?.id ?? "");
      if (error) throw error;
      toast.success("Card saved");
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="p-8">Loading…</main>;
  if (error && !card)
    return (
      <main className="p-8">
        <p className="text-destructive">{error}</p>
        <Link to="/dashboard" className="underline">
          Back
        </Link>
      </main>
    );
  if (!card) return <main className="p-8">Loading card…</main>;

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit — {card.title}</CardTitle>
            <CardDescription>
              Only you can edit this card. Preview private drafts on the dashboard; publish there to
              share.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <InvitationDetailsFields
                value={form}
                onChange={setForm}
                cardId={card.id}
                simran={simran}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={busy} className="bg-burgundy text-ivory">
                  {busy ? "Saving…" : "Save"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate({ to: "/dashboard" })}
                >
                  Cancel
                </Button>
                {card.status === "published" && (
                  <Link
                    to="/invite/$slug"
                    params={{ slug: card.slug }}
                    className="ml-auto text-sm underline"
                  >
                    View published invitation
                  </Link>
                )}
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
