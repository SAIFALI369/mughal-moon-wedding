import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlatformShell } from "@/components/platform/platform-shell";
import { supabase } from "@/lib/db";
import { getUsernameFromUser, useAuth } from "@/lib/auth-context";
import { downloadRsvps, rsvpFileName, summariseRsvps } from "@/lib/rsvp-export";

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

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Guest replies — InvitingYou" },
      { name: "description", content: "Privately review and export replies to your invitations." },
      { property: "og:title", content: "Guest replies — InvitingYou" },
      { property: "og:description", content: "Privately review and export replies to your invitations." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Profile,
});

export function Profile() {
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
      setError("Unable to load guest replies. Please try again.");
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

  if (loading || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8 text-sm text-muted-foreground">
        Loading…
      </main>
    );
  }

  const summary = summariseRsvps(replies);
  const username = getUsernameFromUser(user) || "Partner";

  return (
    <PlatformShell workspace activePage="responses">
      <main className="studio-content admin-main space-y-6">
        <header className="admin-header">
          <div>
            <h1>Guest RSVPs</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {username}
              {user.email ? ` · ${user.email}` : ""}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={!replies.length}
              onClick={() => downloadRsvps(replies, rsvpFileName("all-cards"))}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" /> Export all replies
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy}
              onClick={() => {
                void load();
              }}
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${busy ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        </header>

        {error && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        <section aria-label="RSVP overview" className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Responses", value: summary.responses },
              { label: "Accepting", value: summary.accepting },
              { label: "Guests expected", value: summary.guestsExpected },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-white px-4 py-3.5"
              >
                <p className="text-2xl font-semibold text-foreground">{stat.value}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          {summary.dietary.length > 0 && (
            <div
              role="region"
              aria-label="Dietary summary"
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-white px-4 py-3"
            >
              <span className="text-xs font-medium text-muted-foreground">Dietary:</span>
              {summary.dietary.map((entry) => (
                <span
                  key={entry.label}
                  className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs"
                >
                  {entry.label} · {entry.count}
                </span>
              ))}
            </div>
          )}
        </section>

        {busy && (
          <p role="status" className="text-sm text-muted-foreground">
            Loading…
          </p>
        )}

        {!busy && !cards.length && !error && (
          <div className="rounded-xl border border-border bg-white p-8 text-center text-sm text-muted-foreground">
            No invitations yet.
          </div>
        )}

        {!busy && (
          <div className="space-y-4">
            {cards.map((card) => {
              const cardReplies = replies.filter((reply) => reply.card_id === card.id);
              const cardSummary = summariseRsvps(cardReplies);
              return (
                <section
                  id={`card-${card.id}`}
                  key={card.id}
                  aria-label={`RSVPs for ${card.title}`}
                  className="scroll-mt-6 rounded-xl border border-border bg-white p-5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">{card.title}</h3>
                        <span className={`dashboard-card-status ${card.status}`}>
                          {card.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {cardSummary.responses} response{cardSummary.responses === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {cardSummary.responses > 0 && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => downloadRsvps(cardReplies, rsvpFileName(card.slug))}
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
                        </Button>
                      )}
                      {card.status === "published" && (
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/invite/$slug" params={{ slug: card.slug }}>
                            <ExternalLink className="mr-1 h-3.5 w-3.5" /> Live card
                          </Link>
                        </Button>
                      )}
                    </div>
                  </div>

                  {cardSummary.responses > 0 && (
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                      {[
                        { label: "Attending", value: cardSummary.accepting },
                        { label: "Guests", value: cardSummary.guestsExpected },
                        { label: "Declined", value: cardSummary.declined },
                        { label: "Dietary notes", value: cardSummary.dietary.length },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="rounded-lg border border-border bg-muted/20 px-3 py-2"
                        >
                          <dt className="text-[11px] text-muted-foreground">{stat.label}</dt>
                          <dd className="mt-0.5 text-base font-semibold">{stat.value}</dd>
                        </div>
                      ))}
                    </dl>
                  )}

                  {!cardReplies.length ? (
                    <p className="mt-3 text-xs text-muted-foreground">No replies yet.</p>
                  ) : (
                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                      {cardReplies.map((reply) => (
                        <article
                          key={reply.id}
                          className="rounded-lg border border-border bg-background p-3.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h4 className="break-words text-sm font-medium">{reply.name}</h4>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                reply.attending
                                  ? "bg-emerald-100 text-emerald-900"
                                  : "bg-muted text-muted-foreground"
                              }`}
                            >
                              {reply.attending ? `Attending · ${reply.guests}` : "Declined"}
                            </span>
                          </div>
                          {(reply.contact || reply.dietary) && (
                            <p className="mt-1.5 break-words text-xs text-muted-foreground">
                              {[reply.contact, reply.dietary].filter(Boolean).join(" · ")}
                            </p>
                          )}
                          {reply.message && (
                            <p className="mt-2 whitespace-pre-wrap text-xs italic text-foreground/90">
                              “{reply.message}”
                            </p>
                          )}
                        </article>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </main>
    </PlatformShell>
  );
}
