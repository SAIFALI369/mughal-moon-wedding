import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

type InvitationCard = {
  id: string;
  title: string;
  slug: string;
  status: string;
  content: Record<string, unknown>;
  created_at: string;
  published_at: string | null;
};

export const Route = createFileRoute("/invite/$slug")({
  component: InviteView,
});

function InviteView() {
  const { slug } = Route.useParams();
  const [card, setCard] = useState<InvitationCard | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError("");
      const { data, error } = await supabase.from("invitation_cards").select("*").eq("slug", slug).single();
      if (error || !data) {
        setError(error?.message || "Invitation not found");
        setCard(null);
      } else {
        if ((data as InvitationCard).status !== "published") {
          setError("This invitation is still a private draft and not yet shared.");
          setCard(null);
        } else {
          setCard(data as InvitationCard);
        }
      }
      setLoading(false);
    }
    load();
  }, [slug]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-ivory px-4">
        <p className="text-muted-foreground">Loading invitation…</p>
      </main>
    );
  }

  if (error || !card) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
        <Card className="w-full max-w-lg text-center">
          <CardHeader>
            <CardTitle className="font-serif text-2xl">Invitation unavailable</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Link to="/" className="inline-flex rounded-full bg-burgundy px-6 py-2 text-sm text-ivory">
              Back to invitation
            </Link>
            <p className="text-xs text-muted-foreground">Private drafts are only visible to their owner. Ask the host to publish and share the link.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  const c = card.content as Record<string, string>;

  return (
    <main className="min-h-screen bg-background px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <p className="font-arabic text-xl text-gold">بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ</p>
          <h1 className="mt-4 font-serif text-4xl sm:text-5xl">{card.title}</h1>
          <p className="mt-2 font-script text-2xl text-gold">
            {(c.groomName as string) || "Groom"} & {(c.brideName as string) || "Bride"}
          </p>
          <p className="mt-2 text-sm uppercase tracking-[0.2em] text-muted-foreground">{c.date} {c.time ? `· ${c.time}` : ""}</p>
        </div>

        <Card className="mt-8 overflow-hidden border-gold/30">
          <div className={`h-2 ${c.theme === "eid" ? "bg-emerald-600" : c.theme === "classic" ? "bg-burgundy" : "bg-gold"}`} />
          <CardHeader>
            <CardTitle className="font-serif text-2xl">You’re cordially invited</CardTitle>
            <p className="text-sm text-muted-foreground">{c.venue} · {c.address}</p>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed">{c.message}</p>
            <div className="rounded-xl bg-muted p-4 text-center">
              <p className="font-medium">{c.groomName} & {c.brideName}</p>
              <p className="text-sm text-muted-foreground">{c.date} — {c.venue}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-3">
              <a
                href={`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(card.title)}&dates=20261122T103000Z/20261122T123000Z&details=${encodeURIComponent(slug)}&location=${encodeURIComponent((c.venue as string) || "")}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-gold px-5 py-2 text-sm text-gold hover:bg-gold/10"
              >
                Add to Google Calendar
              </a>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(((c.venue as string) || "") + " " + ((c.address as string) || ""))}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-burgundy px-6 py-2 text-sm text-ivory hover:bg-burgundy/90"
              >
                Get Directions
              </a>
              <Button variant="outline" onClick={() => navigator.clipboard.writeText(window.location.href)}>Copy link</Button>
            </div>
            <p className="text-center text-xs text-muted-foreground">Shared via /invite/{card.slug} · Published {card.published_at ? new Date(card.published_at).toLocaleDateString() : ""}</p>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <Link to="/" className="text-sm text-muted-foreground underline">← Explore Mohsin & Simran’s celebration</Link>
          <span className="mx-2 text-muted-foreground">·</span>
          <Link to="/dashboard" className="text-sm text-burgundy underline">Create your own invitations</Link>
        </div>
      </div>
    </main>
  );
}
