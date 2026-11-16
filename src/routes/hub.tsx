import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HeartHandshake, MessageSquareHeart, PanelsTopLeft, RefreshCw, Search, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformShell } from "@/components/platform/platform-shell";
import { supabase } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";

type Card = { id: string; title: string; slug: string; status: string; created_at: string };
type Reply = { id: string; card_id: string; name: string; attending: boolean; guests: number; dietary: string; message: string; created_at: string };
type Wish = { id: string; card_id: string; name: string; message: string; created_at: string };

export const Route = createFileRoute("/hub")({
  head: () => ({
    meta: [
      { title: "Admin hub — InvitingYou" },
      { name: "description", content: "One place for your invitations, guest replies and wishes." },
      { property: "og:title", content: "Admin hub — InvitingYou" },
      { property: "og:description", content: "One place for your invitations, guest replies and wishes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Hub,
});

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        <Icon size={14} /> {label}
      </div>
      <div className="mt-2 text-3xl font-semibold text-foreground">{value}</div>
    </div>
  );
}

function Hub() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<Card[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [tab, setTab] = useState<"cards" | "replies" | "wishes">("cards");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(true);

  useEffect(() => { if (!loading && !user) navigate({ to: "/sign-in" }); }, [loading, user, navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    const { data: c } = await supabase.from("invitation_cards").select("id, title, slug, status, created_at").eq("owner_id", user.id).order("created_at", { ascending: false });
    const mine = (c || []) as Card[];
    setCards(mine);
    const ids = mine.map((x) => x.id);
    if (ids.length) {
      const [r, w] = await Promise.all([
        supabase.from("invitation_rsvps").select("id, card_id, name, attending, guests, dietary, message, created_at").in("card_id", ids).order("created_at", { ascending: false }),
        supabase.from("invitation_wishes").select("id, card_id, name, message, created_at").in("card_id", ids).order("created_at", { ascending: false }),
      ]);
      setReplies((r.data || []) as Reply[]);
      setWishes((w.data || []) as Wish[]);
    } else { setReplies([]); setWishes([]); }
    setBusy(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel(`hub-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "invitation_rsvps" }, () => void load())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "invitation_wishes" }, () => void load())
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [user, load]);

  const title = useMemo(() => Object.fromEntries(cards.map((c) => [c.id, c.title])), [cards]);
  const term = q.toLowerCase().trim();
  const match = (s: string) => s.toLowerCase().includes(term);
  const attending = replies.filter((r) => r.attending);
  const headcount = attending.reduce((n, r) => n + r.guests, 0);

  return (
    <PlatformShell workspace>
      <div className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-8">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Admin hub</p>
            <h1 className="text-2xl font-semibold text-foreground md:text-3xl">Everything in one place</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={busy}>
              <RefreshCw size={14} className={busy ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button size="sm" asChild><Link to="/dashboard">Manage invitations</Link></Button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={PanelsTopLeft} label="Invitations" value={cards.length} />
          <Stat icon={HeartHandshake} label="Replies" value={replies.length} />
          <Stat icon={Users} label="Guests coming" value={headcount} />
          <Stat icon={MessageSquareHeart} label="Wishes" value={wishes.length} />
        </section>

        <section className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-3">
            <div className="flex rounded-lg bg-muted p-1 text-sm">
              {(["cards", "replies", "wishes"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`rounded-md px-3 py-1.5 capitalize transition ${tab === t ? "bg-background font-medium text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                  {t === "cards" ? "Invitations" : t}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-1.5 text-sm">
              <Search size={14} className="text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="w-40 bg-transparent outline-none" />
            </label>
          </div>

          <div className="divide-y divide-border">
            {tab === "cards" && cards.filter((c) => match(c.title)).map((c) => {
              const n = replies.filter((r) => r.card_id === c.id).length;
              return (
                <div key={c.id} className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{c.title}</p>
                    <p className="text-xs text-muted-foreground">{n} replies · {new Date(c.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${c.status === "published" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{c.status}</span>
                    {c.status === "published" && (
                      <a href={`/invite/${c.slug}`} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="Open"><ExternalLink size={16} /></a>
                    )}
                  </div>
                </div>
              );
            })}
            {tab === "replies" && replies.filter((r) => match(r.name)).map((r) => (
              <div key={r.id} className="flex items-start justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{r.name} <span className="text-xs font-normal text-muted-foreground">· {title[r.card_id]}</span></p>
                  {r.message && <p className="mt-1 text-sm text-muted-foreground">{r.message}</p>}
                  {r.dietary && <p className="mt-1 text-xs text-muted-foreground">Diet: {r.dietary}</p>}
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${r.attending ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"}`}>
                  {r.attending ? `Coming · ${r.guests}` : "Can't come"}
                </span>
              </div>
            ))}
            {tab === "wishes" && wishes.filter((w) => match(w.name) || match(w.message)).map((w) => (
              <div key={w.id} className="p-4">
                <p className="font-medium text-foreground">{w.name} <span className="text-xs font-normal text-muted-foreground">· {title[w.card_id]}</span></p>
                <p className="mt-1 text-sm text-muted-foreground">{w.message}</p>
              </div>
            ))}
            {!busy && ((tab === "cards" && !cards.length) || (tab === "replies" && !replies.length) || (tab === "wishes" && !wishes.length)) && (
              <p className="p-8 text-center text-sm text-muted-foreground">Nothing here yet.</p>
            )}
          </div>
        </section>
      </div>
    </PlatformShell>
  );
}
