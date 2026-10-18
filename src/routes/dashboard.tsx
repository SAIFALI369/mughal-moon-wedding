import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth, getUsernameFromUser } from "@/lib/auth-context";
import { toast } from "sonner";
import { generateSlug } from "@/components/wedding/invitation-schema";
import { Copy, ExternalLink, Trash2, Edit3, Share2, Eye, LogOut, Brain } from "lucide-react";
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
  const [form, setForm] = useState({
    title: "",
    groomName: "Mohsin",
    brideName: "Simran",
    date: "22 November 2026",
    time: "4:00 PM IST",
    venue: "Jama Masjid Hall, Old Delhi",
    address: "Chandni Chowk, New Delhi",
    message: "Bismillah — You’re invited to celebrate our Nikah. Your presence is our blessing.",
    theme: "mughal" as "mughal" | "eid" | "classic",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) {
      navigate({ to: "/sign-in" });
    }
  }, [user, loading, navigate]);

  async function load() {
    setFetching(true);
    // cleanup expired local memories first (never saved on server)
    cleanupExpiredMemories();
    // auto-delete expired cards (client-side, server also has RPC)
    try {
      await supabase.rpc("delete_expired_invitations");
    } catch {}
    const { data, error } = await supabase
      .from("invitation_cards")
      .select("*")
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (cards.length >= 3) {
      setError("You already have 3 active cards. Delete one to create another. Limit enforced in database.");
      toast.error("Limit reached: 3 active cards max.");
      return;
    }
    const title = form.title.trim();
    if (!title) {
      setError("Title is required");
      return;
    }
    setCreating(true);
    setError("");
    try {
      const slug = generateSlug(title);
      const content = {
        groomName: form.groomName,
        brideName: form.brideName,
        date: form.date,
        time: form.time,
        venue: form.venue,
        address: form.address,
        message: form.message,
        theme: form.theme,
      };
      // expiry: wedding date +1 day 23:59; local memory also expires then
      let expires_at: string | undefined;
      try {
        const parsed = new Date(form.date);
        if (!isNaN(parsed.getTime())) {
          const exp = new Date(parsed);
          exp.setDate(exp.getDate() + 1);
          exp.setHours(23, 59, 59, 999);
          expires_at = exp.toISOString();
        }
      } catch {}
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
      setForm((f) => ({ ...f, title: "" }));
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
    const content = {
      groomName: form.groomName,
      brideName: form.brideName,
      date: form.date,
      time: form.time,
      venue: form.venue,
      address: form.address,
      message: form.message,
      theme: form.theme,
    };
    const { error } = await supabase
      .from("invitation_cards")
      .update({ title, content })
      .eq("id", card.id);
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
    const { error } = await supabase.from("invitation_cards").update({ status: newStatus }).eq("id", card.id);
    if (error) {
      setError(error.message);
      toast.error(error.message);
      return;
    }
    toast.success(newStatus === "published" ? "Published! Share your link." : "Moved back to draft (private).");
    load();
  }

  async function handleDelete(card: InvitationCard) {
    if (!confirm(`Delete "${card.title}"? This frees a slot.`)) return;
    const { error } = await supabase.from("invitation_cards").delete().eq("id", card.id);
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
    const c = card.content as Record<string, string>;
    setForm({
      title: card.title,
      groomName: (c.groomName as string) || "Mohsin",
      brideName: (c.brideName as string) || "Simran",
      date: (c.date as string) || "22 November 2026",
      time: (c.time as string) || "4:00 PM IST",
      venue: (c.venue as string) || "",
      address: (c.address as string) || "",
      message: (c.message as string) || "",
      theme: (c.theme as "mughal" | "eid" | "classic") || "mughal",
    });
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
  const email = user.email || "";

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl">Your invitations</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Signed in as <span className="font-medium text-foreground">{username || email}</span> {username && email ? `(${email})` : ""} ·{" "}
              <span className={cards.length >= 3 ? "text-destructive font-medium" : "text-emerald-700"}>{cards.length} / 3 active cards</span>
              <span className="ml-2 text-xs text-muted-foreground">Limit enforced in database, not just UI</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Cards start as private drafts; only you can edit or delete them. Publish to share a public link.</p>
          </div>
          <div className="flex items-center gap-2">
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
            <CardTitle className="font-serif text-2xl">{editingId ? "Edit card" : "Create a new card (draft)"}</CardTitle>
            <CardDescription>
              Personalize groom, bride, date, venue and message. You can have up to 3 active cards. Publishing makes it shareable.
              {cards.length >= 3 && !editingId && <span className="text-destructive"> — Limit reached.</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={editingId ? (e) => { e.preventDefault(); const c = cards.find(x=>x.id===editingId); if(c) handleUpdate(c); } : handleCreate} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="title">Card title *</Label>
                  <Input id="title" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Mohsin & Simran — Nikah Invite" required maxLength={120} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="groom">Groom name</Label>
                  <Input id="groom" value={form.groomName} onChange={(e) => setForm((f) => ({ ...f, groomName: e.target.value }))} maxLength={80} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bride">Bride name</Label>
                  <Input id="bride" value={form.brideName} onChange={(e) => setForm((f) => ({ ...f, brideName: e.target.value }))} maxLength={80} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Date</Label>
                  <Input id="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} placeholder="22 November 2026" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="time">Time</Label>
                  <Input id="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} placeholder="4:00 PM IST" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="venue">Venue</Label>
                  <Input id="venue" value={form.venue} onChange={(e) => setForm((f) => ({ ...f, venue: e.target.value }))} placeholder="Venue name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea id="message" value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} rows={3} maxLength={2000} />
                </div>
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select value={form.theme} onValueChange={(v) => setForm((f) => ({ ...f, theme: v as typeof form.theme }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="mughal">Mughal Night</SelectItem>
                      <SelectItem value="eid">Eid Light</SelectItem>
                      <SelectItem value="classic">Classic</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={creating || (!editingId && cards.length >= 3)} className="bg-burgundy text-ivory hover:bg-burgundy/90">
                  {editingId ? "Save changes" : creating ? "Creating…" : "Create card (private draft)"}
                </Button>
                {editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(f=>({...f,title:""})); setError(""); }}>Cancel edit</Button>}
              </div>
              <p className="text-xs text-muted-foreground">All cards are private drafts initially; ownership checked in database. Only you can edit/delete.</p>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8">
          <h2 className="font-serif text-2xl">Your active cards</h2>
          <p className="text-sm text-muted-foreground">{fetching ? "Loading…" : `${cards.length} card(s). You may create, edit, publish, share and delete. Limit: 3.`}</p>
          {error && !fetching && <p className="mt-2 text-sm text-destructive">{error}</p>}
          <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card) => (
              <Card key={card.id} className="flex flex-col">
                <CardHeader>
                  <CardTitle className="line-clamp-2 text-lg">{card.title}</CardTitle>
                  <CardDescription className="flex items-center gap-2 text-xs">
                    <span className={`rounded-full px-2 py-1 text-[10px] uppercase tracking-widest ${card.status === "published" ? "bg-emerald-100 text-emerald-800" : "bg-muted text-muted-foreground"}`}>
                      {card.status}
                    </span>
                    <span>/{card.slug}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col gap-3">
                  <div className="text-sm">
                    <p className="font-medium">{(card.content as any).groomName} & {(card.content as any).brideName}</p>
                    <p className="text-xs text-muted-foreground">{(card.content as any).date} · {(card.content as any).time}</p>
                    <p className="text-xs text-muted-foreground">{(card.content as any).venue}</p>
                    <p className="mt-2 line-clamp-3 text-xs">{(card.content as any).message}</p>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(card)}>
                      <Edit3 className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <Button size="sm" variant={card.status === "published" ? "outline" : "default"} onClick={() => togglePublish(card)} className={card.status === "published" ? "" : "bg-burgundy text-ivory hover:bg-burgundy/90"}>
                      <Eye className="mr-1 h-3 w-3" /> {card.status === "draft" ? "Publish" : "Unpublish"}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => copyShare(card)} disabled={card.status !== "published"} title={card.status !== "published" ? "Publish to share" : "Copy link"}>
                      <Copy className="mr-1 h-3 w-3" /> Copy link
                    </Button>
                    <a href={shareUrl(card)} target="_blank" rel="noreferrer" className={`inline-flex h-8 items-center justify-center rounded-md border px-3 text-xs ${card.status !== "published" ? "pointer-events-none opacity-50" : "hover:bg-accent"}`}>
                      <ExternalLink className="mr-1 h-3 w-3" /> View
                    </a>
                    <Button size="sm" variant="outline" onClick={() => handleDelete(card)} className="text-destructive hover:text-destructive">
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
                    Created {new Date(card.created_at).toLocaleDateString()} · Updated {new Date(card.updated_at).toLocaleDateString()}
                    {card.status === "published" && card.published_at ? ` · Published ${new Date(card.published_at).toLocaleDateString()}` : ""}
                  </p>
                </CardContent>
              </Card>
            ))}
            {cards.length === 0 && !fetching && (
              <Card className="md:col-span-2 lg:col-span-3">
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No cards yet. Create your first private draft above — you can have up to 3, each editable and shareable after publishing.
                </CardContent>
              </Card>
            )}
          </div>
          {cards.map((card) => (
            <div key={`mem-${card.id}`} className="mt-6">
              <SimranMemoryBar cardId={card.id} cardTitle={card.title} initialContent={card.content} expiresAt={card.expires_at} />
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-gold/20 bg-card p-4 text-xs">
          <p className="flex items-center gap-2 font-medium"><Brain className="h-4 w-4 text-gold" /> What Simran should know — per card, local only</p>
          <p className="mt-1 text-muted-foreground">Each card above has its own “What Simran should know” bar. Fill groom/bride/date/venue/custom notes → Save to Simran (local). It loads into Simran’s memory to answer specific questions about <em>that</em> card. Memory is stored in your browser only (localStorage), never on server, and auto-deleted when the card expires (after marriage day).</p>
        </div>

        <div className="mt-10 rounded-xl border border-gold/30 bg-muted/50 p-4 text-xs leading-relaxed">
          <p className="font-semibold">How it works:</p>
          <ul className="list-inside list-disc">
            <li>Cards are <strong>private drafts</strong> by default — only you (owner_id) can edit/delete; enforced via RLS.</li>
            <li>Up to <strong>3 active cards</strong> per account — enforced by <code>enforce_invitation_card_limit()</code> trigger + advisory lock, not just UI.</li>
            <li><strong>Publish</strong> to make shareable via <code>/invite/:slug</code>. Published cards are publicly readable (anon SELECT allowed where status=published).</li>
            <li><strong>Delete</strong> frees a slot. Ownership immutable.</li>
            <li>Email supports <strong>sign-in and password recovery</strong> via Supabase Auth email link.</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
