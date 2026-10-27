import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { supabase } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { PlatformShell } from "@/components/platform/platform-shell";
import { isPhoneViewport } from "@/lib/viewport";
import { toast } from "sonner";
import { invitationContentSchema } from "@/components/wedding/invitation-schema";
import {
  InvitationDetailsFields,
  invitationEditorSections,
  editorSectionForField,
  type InvitationEditorSection,
} from "@/components/wedding/invitation-form";
import {
  emptyInvitationForm,
  invitationFormForCard,
  isCardCoupleLocked,
  preserveLockedCoupleIdentity,
  type InvitationForm,
} from "@/components/wedding/invitation-form-data";
import { invitationExpiry } from "@/components/wedding/invitation-details";
import type { Database } from "@/integrations/supabase/types";

type InvitationCard = Database["public"]["Tables"]["invitation_cards"]["Row"];

export const Route = createFileRoute("/cards/$id")({
  head: () => ({
    meta: [
      { title: "Edit invitation — InvitingYou" },
      { name: "description", content: "Edit your invitation details, theme and soundtrack." },
      { property: "og:title", content: "Edit invitation — InvitingYou" },
      {
        property: "og:description",
        content: "Edit your invitation details, theme and soundtrack.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CardEditor,
});

function CardEditor() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [card, setCard] = useState<InvitationCard | null>(null);
  const [form, setForm] = useState<InvitationForm>(emptyInvitationForm);
  const [section, setSection] = useState<InvitationEditorSection>("essentials");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [simran, setSimran] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/sign-in" });
  }, [user, loading, navigate]);

  // Phones get the dedicated full-page editor; this page stays for desk-size screens.
  useEffect(() => {
    if (!id || !isPhoneViewport()) return;
    navigate({ to: "/create", search: { card: id, theme: "" }, replace: true });
  }, [id, navigate]);

  useEffect(() => {
    async function load() {
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
      if (!form.title.trim()) {
        setSection("essentials");
        throw new Error("Card title is required.");
      }
      const parsed = invitationContentSchema.safeParse(form);
      if (!parsed.success) {
        setSection(editorSectionForField(String(parsed.error.issues[0]?.path[0] ?? "title")));
        throw new Error(parsed.error.issues[0]?.message || "Complete required details.");
      }
      const { title, content } = card
        ? preserveLockedCoupleIdentity(form.title.trim(), parsed.data, card)
        : { title: form.title.trim(), content: parsed.data };
      const { error } = await supabase
        .from("invitation_cards")
        .update({
          title,
          content,
          expires_at: invitationExpiry(content.date),
        })
        .eq("id", id)
        .eq("owner_id", user?.id ?? "");
      if (error) throw error;
      toast.success("Saved");
      navigate({ to: "/dashboard" });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="p-8 text-sm text-muted-foreground">Loading…</main>;
  if (error && !card)
    return (
      <main className="p-8 space-y-2">
        <p className="text-sm text-destructive">{error}</p>
        <Link to="/dashboard" className="text-sm underline">
          Back
        </Link>
      </main>
    );
  if (!card) return <main className="p-8 text-sm text-muted-foreground">Loading…</main>;

  const stepIndex = invitationEditorSections.findIndex((item) => item.id === section);

  return (
    <PlatformShell workspace>
      <main className="studio-content admin-main">
        <form onSubmit={save} className="space-y-5">
          <header className="admin-header">
            <div className="flex items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => navigate({ to: "/dashboard" })}
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <h1>{card.title}</h1>
            </div>
            <div className="flex items-center gap-2">
              {card.status === "published" && (
                <Button asChild size="sm" variant="outline">
                  <Link to="/invite/$slug" params={{ slug: card.slug }}>
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Live card
                  </Link>
                </Button>
              )}
              <Button type="submit" size="sm" disabled={busy}>
                {busy ? "Saving…" : "Save"}
              </Button>
            </div>
          </header>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="overflow-clip rounded-xl border border-border bg-white">
            <InvitationDetailsFields
              compact
              section={section}
              onSectionChange={setSection}
              value={form}
              onChange={setForm}
              cardId={card.id}
              simran={simran}
              coupleLocked={isCardCoupleLocked(card)}
            />
            <div className="editor-step-footer flex items-center justify-between border-t border-border bg-muted/20 px-5 py-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => navigate({ to: "/dashboard" })}
              >
                Cancel
              </Button>
              <div className="editor-step-controls flex items-center gap-2">
                {stepIndex > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSection(invitationEditorSections[stepIndex - 1].id)}
                  >
                    Back
                  </Button>
                )}
                {stepIndex < invitationEditorSections.length - 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSection(invitationEditorSections[stepIndex + 1].id)}
                  >
                    Next
                  </Button>
                )}
                <Button type="submit" size="sm" disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </main>
    </PlatformShell>
  );
}
