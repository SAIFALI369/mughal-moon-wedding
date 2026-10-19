import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { invitationContentSchema } from "@/components/wedding/invitation-schema";
import { getInvitationDetails, invitationExpiry, parseInvitationDate } from "@/components/wedding/invitation-details";
import { InvitationCover } from "@/components/wedding/invitation-template";
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
  const [form, setForm] = useState({
    title: "",
    groomName: "",
    brideName: "",
    date: "",
    time: "",
    venue: "",
    address: "",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      const c = data.content && typeof data.content === "object" && !Array.isArray(data.content)
        ? data.content as Record<string, unknown> : {};
      const field = (name: string) => typeof c[name] === "string" ? c[name] as string : "";
      setForm({
        title: data.title,
        groomName: field("groomName"),
        brideName: field("brideName"),
        date: field("date"),
        time: field("time"),
        venue: field("venue"),
        address: field("address"),
        message: field("message"),
      });
    }
    if (user) load();
  }, [id, user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const parsed = invitationContentSchema.safeParse({
        ...form,
        theme: getInvitationDetails(card?.content).theme,
      });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message || "Complete the invitation details.");
      if (!parseInvitationDate(parsed.data.date)) {
        throw new Error("Use a real wedding date, such as 22 November 2026 or 2026-11-22.");
      }
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
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit — {card.title}</CardTitle>
            <CardDescription>
              Only you can edit this card. Preview private drafts on the dashboard; publish there to share.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                  maxLength={120}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Groom *</Label>
                  <Input
                    value={form.groomName}
                    onChange={(e) => setForm({ ...form, groomName: e.target.value })}
                    required
                    maxLength={80}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bride *</Label>
                  <Input
                    value={form.brideName}
                    onChange={(e) => setForm({ ...form, brideName: e.target.value })}
                    required
                    maxLength={80}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Wedding date *</Label>
                  <Input
                    value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                    placeholder="15 December 2026 or 2026-12-15"
                    required
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    value={form.time}
                    onChange={(e) => setForm({ ...form, time: e.target.value })}
                    placeholder="e.g. 4:00 PM IST (optional)"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Venue *</Label>
                  <Input
                    value={form.venue}
                    onChange={(e) => setForm({ ...form, venue: e.target.value })}
                    required
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    maxLength={200}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={form.message}
                  onChange={(e) => setForm({ ...form, message: e.target.value })}
                  rows={4}
                  maxLength={2000}
                />
              </div>
              <div className="mx-auto max-w-sm">
                <p className="mb-3 text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">Live cover preview</p>
                <InvitationCover content={{ ...form, theme: getInvitationDetails(card.content).theme }} />
              </div>
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
