import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { HeartHandshake, LockKeyhole, RefreshCw, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/db";
import { getUsernameFromUser, useAuth } from "@/lib/auth-context";

type CardSummary = { id: string; title: string; slug: string; status: "draft" | "published" };
type Reply = {
  id: string;
  card_id: string;
  name: string;
  attending: boolean;
  guests: number;
  contact: string;
  dietary: string;
  message: string;
  created_at: string;
};

export const Route = createFileRoute("/profile")({ component: Profile });

function Profile() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [cards, setCards] = useState<CardSummary[]>([]);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setBusy(true);
    setError("");
    try {
      // Defense in depth: RLS limits both reads; still filter cards by owner and
      // replies by precisely those card ids. No guest-read or public profile endpoint.
      const { data: cardRows, error: cardError } = await supabase
        .from("invitation_cards")
        .select("id, title, slug, status")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (cardError) throw cardError;
      const mine = (cardRows || []) as CardSummary[];
      setCards(mine);
      if (!mine.length) {
        setReplies([]);
        return;
      }
      const { data: replyRows, error: replyError } = await supabase
        .from("invitation_rsvps")
        .select("id, card_id, name, attending, guests, contact, dietary, message, created_at")
        .in(
          "card_id",
          mine.map((card) => card.id),
        )
        .order("created_at", { ascending: false });
      if (replyError) throw replyError;
      setReplies((replyRows || []) as Reply[]);
    } catch {
      setError(
        "We couldn't load your private guest replies. Please try again; if this continues, the database migration may still be pending.",
      );
      setReplies([]);
    } finally {
      setBusy(false);
    }
  }, [user]);

  useEffect(() => {
    if (!loading && !user) {
      void navigate({ to: "/sign-in" });
      return;
    }
    if (user) void load();
  }, [loading, user, navigate, load]);

  if (loading || !user)
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        Loading your profile…
      </main>
    );
  const accepted = replies.filter((reply) => reply.attending);
  const guests = accepted.reduce((total, reply) => total + reply.guests, 0);

  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-7">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link to="/dashboard" className="text-sm text-gold underline underline-offset-4">
              ← Your invitations
            </Link>
            <h1 className="mt-4 flex items-center gap-3 font-serif text-4xl">
              <UserRound className="h-8 w-8 text-gold" /> Your profile
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your account and the private replies to cards you own.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              void load();
            }}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${busy ? "animate-spin" : ""}`} /> Refresh replies
          </Button>
        </header>
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Account</CardTitle>
            <CardDescription>Visible only when signed in</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 text-sm sm:grid-cols-2">
            <p>
              <span className="text-muted-foreground">Username</span>
              <br />
              <strong>{getUsernameFromUser(user) || "Your account"}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Email</span>
              <br />
              <strong className="break-all">{user.email || "Not provided"}</strong>
            </p>
          </CardContent>
        </Card>
        <section aria-label="RSVP overview">
          <div className="flex items-center gap-2">
            <HeartHandshake className="h-6 w-6 text-gold" />
            <h2 className="font-serif text-3xl">Guest RSVPs</h2>
          </div>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
            <LockKeyhole className="h-4 w-4" /> Only you can read the names, contact details,
            dietary notes and messages for your cards.
          </p>
          {error && (
            <p
              role="alert"
              className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
            >
              {error}
            </p>
          )}
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              { label: "Responses", value: replies.length },
              { label: "Accepting", value: accepted.length },
              { label: "Guests expected", value: guests },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-gold/30 bg-card p-5">
                <p className="font-serif text-4xl text-gold">{stat.value}</p>
                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </section>
        {busy && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading private replies…
          </p>
        )}
        {!busy && !cards.length && !error && (
          <p className="rounded-xl border border-border p-8 text-center text-muted-foreground">
            Create your first invitation to start collecting RSVPs.
          </p>
        )}
        {!busy &&
          cards.map((card) => {
            const cardReplies = replies.filter((reply) => reply.card_id === card.id);
            return (
              <section
                id={`card-${card.id}`}
                key={card.id}
                aria-label={`RSVPs for ${card.title}`}
                className="scroll-mt-6 rounded-2xl border border-border bg-card p-5 sm:p-7"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-serif text-2xl">{card.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {card.status === "draft"
                        ? "Private draft — previous replies remain visible to you"
                        : "Published"}{" "}
                      · {cardReplies.length} response{cardReplies.length === 1 ? "" : "s"}
                    </p>
                  </div>
                  {card.status === "published" && (
                    <Link
                      to="/invite/$slug"
                      params={{ slug: card.slug }}
                      className="text-sm text-gold underline underline-offset-4"
                    >
                      Open invitation
                    </Link>
                  )}
                </div>
                {!cardReplies.length && (
                  <p className="mt-5 text-sm text-muted-foreground">
                    No guest replies yet for this card.
                  </p>
                )}
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  {cardReplies.map((reply) => (
                    <article
                      key={reply.id}
                      className="rounded-xl border border-border bg-background p-5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h4 className="break-words font-serif text-xl">{reply.name}</h4>
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${reply.attending ? "bg-emerald-100 text-emerald-900" : "bg-muted text-muted-foreground"}`}
                        >
                          {reply.attending
                            ? `Attending · ${reply.guests} guest${reply.guests === 1 ? "" : "s"}`
                            : "Unable to attend"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {new Date(reply.created_at).toLocaleString()}
                      </p>
                      {reply.contact && (
                        <p className="mt-4 break-all text-sm">
                          <span className="text-muted-foreground">Contact:</span> {reply.contact}
                        </p>
                      )}
                      {reply.dietary && (
                        <p className="mt-2 whitespace-pre-wrap text-sm">
                          <span className="text-muted-foreground">Dietary:</span> {reply.dietary}
                        </p>
                      )}
                      {reply.message && (
                        <p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 font-serif italic">
                          “{reply.message}”
                        </p>
                      )}
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
      </div>
    </main>
  );
}
