import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/db";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useAuth, getUsernameFromUser } from "@/lib/auth-context";
import { toast } from "sonner";
import {
  generateSlug,
  invitationContentSchema,
  type InvitationContent,
} from "@/components/wedding/invitation-schema";
import { InvitationDetailsFields } from "@/components/wedding/invitation-form";
import {
  emptyInvitationForm,
  invitationFormForCard,
  type InvitationForm,
} from "@/components/wedding/invitation-form-data";
import { getInvitationDetails, invitationExpiry } from "@/components/wedding/invitation-details";
import { InvitationCover, PersonalInvitation } from "@/components/wedding/invitation-template";
import {
  Copy,
  ExternalLink,
  Trash2,
  Edit3,
  Share2,
  Eye,
  LogOut,
  Brain,
  HeartHandshake,
} from "lucide-react";
import { SimranMemoryBar } from "@/components/wedding/simran-memory-bar";
import { cleanupExpiredMemories, deleteSimranMemory } from "@/lib/simran-memory";

type InvitationCard = {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  content: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  published_at: string | null;
  expires_at?: string | null;
};

export const Route = createFileRoute("/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<InvitationCard[]>([]);
  const [fetching, setFetching] = useState(true);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<InvitationForm>(emptyInvitationForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [previewCard, setPreviewCard] = useState<InvitationCard | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/sign-in" });
    }
  }, [user, loading, navigate]);

  async function load() {
    if (!user) return;
    setFetching(true);
    // cleanup expired local memories first (never saved on server)
    cleanupExpiredMemories();
    // auto-delete expired cards (client-side, server also has RPC)
    try {
      await supabase.rpc("delete_expired_invitations");
    } catch {
      // Cleanup can fail offline; the dashboard and public route also hide expired cards.
    }
    // Defense in depth: RLS already restricts rows to the owner;
    // always scope queries by owner_id so no other row can leak.
    const { data, error } = await supabase
      .from("invitation_cards")
      .select(
        "id, owner_id, title, slug, status, content, created_at, updated_at, published_at, expires_at",
      )
      .eq("owner_id", user?.id ?? "")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setError(error.message);
    } else {
      const filtered = (data as InvitationCard[]).filter((c) => {
        if (c.expires_at && new Date(c.expires_at).getTime() < Date.now()) {
          // card expired -> will be deleted by RPC next load, hide for now and clear local memory
          deleteSimranMemory(c.id);
          return false;
        }
        return true;
      });
      setCards(filtered);
    }
    setFetching(false);
  }

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  function validContent(): InvitationContent | null {
    const result = invitationContentSchema.safeParse(form);
    if (!result.success) {
      const message =
        result.error.issues[0]?.message || "Please fill in the couple, date and venue.";
      setError(message);
      toast.error(message);
      return null;
    }
    return result.data;
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (cards.length >= 3) {
      setError(
        "You already have 3 active cards. Delete one to create another. Limit enforced in database.",
      );
      toast.error("Limit reached: 3 active cards max.");
      return;
    }
    const title = form.title.trim();
    if (!title) {
      setError("Title is required");
      return;
    }
    const content = validContent();
    if (!content) return;
    setCreating(true);
    setError("");
    try {
      const slug = generateSlug(title);
      // Store a new expiry based on this card's date, not the homepage date.
      const expires_at = invitationExpiry(content.date);
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("invitation_cards")
        .insert({
          owner_id: session.session.user.id,
          title,
          slug,
          status: "draft",
          content,
          ...(expires_at ? { expires_at } : {}),
        })
        .select()
        .single();
      if (error) {
        if (error.code === "23505" || error.message.includes("at most 3")) {
          setError(error.message);
          toast.error(error.message);
        } else {
          setError(error.message);
        }
        return;
      }
      toast.success("Card created as draft (private). Only you can see it until published.");
      setCards((prev) => [data as InvitationCard, ...prev]);
      setForm(emptyInvitationForm());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpdate(card: InvitationCard) {
    if (!editingId) return;
    setError("");
    const title = form.title.trim() || card.title;
    const content = validContent();
    if (!content) return;
    const { error } = await supabase
      .from("invitation_cards")
      .update({ title, content, expires_at: invitationExpiry(content.date) })
      .eq("id", card.id)
      .eq("owner_id", user?.id ?? "");
    if (error) {
      setError(error.message);
      toast.error(error.message);
      return;
    }
    toast.success("Card updated");
    setEditingId(null);
    load();
  }

  async function togglePublish(card: InvitationCard) {
    const newStatus = card.status === "draft" ? "published" : "draft";
    if (newStatus === "published" && !invitationContentSchema.safeParse(card.content).success) {
      const message = "Complete the required wedding details before publishing this card.";
      setError(message);
      toast.error(message);
      startEdit(card);
      return;
    }
    const { error } = await supabase
      .from("invitation_cards")
      .update({ status: newStatus })
      .eq("id", card.id)
      .eq("owner_id", user?.id ?? "");
    if (error) {
      setError(error.message);
      toast.error(error.message);
      return;
    }
    toast.success(
      newStatus === "published" ? "Published! Share your link." : "Moved back to draft (private).",
    );
    load();
  }

  async function handleDelete(card: InvitationCard) {
    if (!confirm(`Delete "${card.title}"? This frees a slot.`)) return;
    const { error } = await supabase
      .from("invitation_cards")
      .delete()
      .eq("id", card.id)
      .eq("owner_id", user?.id ?? "");
    if (error) {
      setError(error.message);
      toast.error(error.message);
      return;
    }
    toast.success("Card deleted");
    setCards((prev) => prev.filter((c) => c.id !== card.id));
  }

  function startEdit(card: InvitationCard) {
    setEditingId(card.id);
    setForm(invitationFormForCard(card.title, card.content));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function shareUrl(card: InvitationCard) {
    return `${window.location.origin}/invite/${card.slug}`;
  }

  async function copyShare(card: InvitationCard) {
    const url = shareUrl(card);
    await navigator.clipboard.writeText(url);
    toast.success("Share link copied!");
  }

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <p className="text-muted-foreground">Loading your account…</p>
      </main>
    );
  }

  const username = getUsernameFromUser(user);

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl">Your invitations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as{" "}
              <span className="font-medium text-foreground">{username || "your account"}</span> ·{" "}
              <span
                className={cards.length >= 3 ? "text-destructive font-medium" : "text-emerald-700"}
              >
                {cards.length} / 3 active cards
              </span>
              <span className="ml-2 text-xs text-muted-foreground">
                Limit enforced in database, not just UI
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Cards start as private drafts; only you can edit or delete them. Publish to share a
              public link.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/profile" className="text-sm underline text-foreground">
              <HeartHandshake className="mr-1 inline h-4 w-4" /> My profile & RSVPs
            </Link>
            <Link to="/" className="text-sm underline text-muted-foreground">
              ← Invitation
            </Link>
            <Button variant="outline" size="sm" onClick={() => signOut()}>
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>
        </div>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">
              {editingId ? "Edit card" : "Create a new card (draft)"}
            </CardTitle>
            <CardDescription>
              Start with the moonlit invitation from the homepage, or choose another cinematic theme
              and layout. Add your details, preview privately, then publish to collect guest
              replies.
              {cards.length >= 3 && !editingId && (
                <span className="text-destructive"> — Limit reached.</span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={
                editingId
                  ? (e) => {
                      e.preventDefault();
                      const c = cards.find((x) => x.id === editingId);
                      if (c) handleUpdate(c);
                    }
                  : handleCreate
              }
              className="space-y-4"
            >
              <InvitationDetailsFields value={form} onChange={setForm} />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button
                  type="submit"
                  disabled={creating || (!editingId && cards.length >= 3)}
                  className="bg-burgundy text-ivory hover:bg-burgundy/90"
                >
                  {editingId
                    ? "Save changes"
                    : creating
                      ? "Creating…"
                      : "Create card (private draft)"}
                </Button>
                {editingId && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setEditingId(null);
                      setForm(emptyInvitationForm());
                      setError("");
                    }}
                  >
                    Cancel edit
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                All cards are private drafts initially; ownership checked in database. Only you can
                edit/delete.
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8">
          <h2 className="font-serif text-2xl">Your active cards</h2>
          <p className="text-sm text-muted-foreground">
            {fetching
              ? "Loading…"
              : `${cards.length} card(s). You may create, edit, publish, share and delete. Limit: 3.`}
          </p>
          {error && !fetching && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Card
                key={card.id}
                className="flex flex-col gap-0 overflow-hidden border-gold/40 pt-0"
              >
                <InvitationCover content={card.content} />
                <CardHeader className="pt-5">
                  <CardTitle className="line-clamp-2 font-serif text-xl">{card.title}</CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-widest ${card.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}
                    >
                      {card.status}
                    </span>
                    <span className="truncate">/{card.slug}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3 pt-4">
                  {getInvitationDetails(card.content).message && (
                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {getInvitationDetails(card.content).message}
                    </p>
                  )}
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setPreviewCard(card)}>
                      <Eye className="mr-1 h-3 w-3" /> Preview
                    </Button>
                    <Link
                      to="/profile"
                      hash={`card-${card.id}`}
                      className="inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs hover:bg-accent"
                    >
                      <HeartHandshake className="mr-1 h-3 w-3" /> RSVPs
                    </Link>
                    <Button size="sm" variant="outline" onClick={() => startEdit(card)}>
                      <Edit3 className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <Button
                      size="sm"
                      variant={card.status === "published" ? "outline" : "default"}
                      onClick={() => togglePublish(card)}
                      className={
                        card.status === "published"
                          ? ""
                          : "bg-burgundy text-ivory hover:bg-burgundy/90"
                      }
                    >
                      <Eye className="mr-1 h-3 w-3" />{" "}
                      {card.status === "draft" ? "Publish" : "Unpublish"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => copyShare(card)}
                      disabled={card.status !== "published"}
                      title={card.status !== "published" ? "Publish to share" : "Copy link"}
                    >
                      <Copy className="mr-1 h-3 w-3" /> Copy link
                    </Button>
                    {card.status === "published" && (
                      <a
                        href={shareUrl(card)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs hover:bg-accent"
                      >
                        <ExternalLink className="mr-1 h-3 w-3" /> View live
                      </a>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(card)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="mr-1 h-3 w-3" /> Delete
                    </Button>
                    {card.status === "published" && (
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`You're invited! ${card.title} — ${shareUrl(card)}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex h-8 items-center justify-center rounded-md bg-emerald-600 px-3 text-xs text-white hover:bg-emerald-700"
                      >
                        <Share2 className="mr-1 h-3 w-3" /> WhatsApp
                      </a>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Created {new Date(card.created_at).toLocaleDateString()} · Updated{" "}
                    {new Date(card.updated_at).toLocaleDateString()}
                    {card.status === "published" && card.published_at
                      ? ` · Published ${new Date(card.published_at).toLocaleDateString()}`
                      : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
            {cards.length === 0 && !fetching && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No cards yet. Create your first private draft above — you can have up to 3, each
                  editable and shareable after publishing.
                </CardContent>
              </Card>
            )}
          </div>
          <Dialog
            open={previewCard !== null}
            onOpenChange={(open) => {
              if (!open) setPreviewCard(null);
            }}
          >
            <DialogContent className="max-h-[92dvh] w-[96vw] max-w-[1100px] gap-0 overflow-y-auto p-0 sm:max-w-[1100px]">
              {previewCard && (
                <>
                  <div className="bg-background px-6 py-5">
                    <DialogTitle className="font-serif text-2xl">
                      {previewCard.title} — preview
                    </DialogTitle>
                    <DialogDescription className="mt-1">
                      {previewCard.status === "draft"
                        ? "Private draft: only you can see this preview. Publish to share a live link."
                        : "This is what guests see at your published link."}
                    </DialogDescription>
                  </div>
                  <PersonalInvitation
                    title={previewCard.title}
                    content={previewCard.content}
                    showGate={false}
                    preview
                  />
                </>
              )}
            </DialogContent>
          </Dialog>
          {cards.map((card) => (
            <div key={`mem-${card.id}`} className="mt-6">
              <SimranMemoryBar
                cardId={card.id}
                cardTitle={card.title}
                initialContent={card.content}
                expiresAt={card.expires_at}
              />
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-gold/20 bg-card p-4 text-xs">
          <p className="flex items-center gap-2 font-medium">
            <Brain className="h-4 w-4 text-gold" /> What Simran should know — per card, local only
          </p>
          <p className="mt-1 text-muted-foreground">
            Each card above has its own “What Simran should know” bar. Fill
            groom/bride/date/venue/custom notes → Save to Simran (local). It loads into Simran’s
            memory to answer specific questions about <em>that</em> card. Memory is stored in your
            browser only (localStorage), never on server, and auto-deleted when the card expires
            (after marriage day).
          </p>
        </div>

        <div className="mt-10 rounded-xl border border-gold/30 bg-muted/50 p-4 text-xs leading-relaxed">
          <p className="font-semibold">How it works:</p>
          <ul className="list-inside list-disc">
            <li>
              Cards are <strong>private drafts</strong> by default — only you (owner_id) can
              edit/delete; enforced via RLS.
            </li>
            <li>
              Up to <strong>3 active cards</strong> per account — enforced by{" "}
              <code>enforce_invitation_card_limit()</code> trigger + advisory lock, not just UI.
            </li>
            <li>
              <strong>Publish</strong> to make shareable via <code>/invite/:slug</code>. Published
              cards are publicly readable (anon SELECT allowed where status=published).
            </li>
            <li>
              <strong>Delete</strong> frees a slot. Ownership immutable.
            </li>
            <li>
              Use your <strong>username and password</strong> to sign in. No password reset is
              available; if forgotten, create a new account.
            </li>
          </ul>
        </div>
      </div>
    </main>
  );
}
