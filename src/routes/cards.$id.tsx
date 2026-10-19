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

export const Route = createFileRoute("/cards/$id")({
  component: CardEditor,
});

function CardEditor() {
  const { id } = Route.useParams();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [card, setCard] = useState<any>(null);
  const [form, setForm] = useState({ title: "", groomName: "", brideName: "", date: "", time: "", venue: "", address: "", message: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/sign-in" });
  }, [user, loading, navigate]);

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.from("invitation_cards").select("*").eq("id", id).single();
      if (error) {
        setError(error.message);
        return;
      }
      if (data.owner_id !== user?.id) {
        setError("You can only edit your own cards.");
        return;
      }
      setCard(data);
      const c = data.content as any;
      setForm({
        title: data.title,
        groomName: c.groomName || "",
        brideName: c.brideName || "",
        date: c.date || "",
        time: c.time || "",
        venue: c.venue || "",
        address: c.address || "",
        message: c.message || "",
      });
    }
    if (user) load();
  }, [id, user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const content = { groomName: form.groomName, brideName: form.brideName, date: form.date, time: form.time, venue: form.venue, address: form.address, message: form.message, theme: (card?.content as any)?.theme || "mughal" };
      const { error } = await supabase.from("invitation_cards").update({ title: form.title, content }).eq("id", id);
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
  if (error && !card) return <main className="p-8"><p className="text-destructive">{error}</p><Link to="/dashboard" className="underline">Back</Link></main>;
  if (!card) return <main className="p-8">Loading card…</main>;

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Edit — {card.title}</CardTitle>
            <CardDescription>Only you can edit this private draft. Publish from dashboard to share.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2"><Label>Title</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={120} /></div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Groom</Label><Input value={form.groomName} onChange={(e) => setForm({ ...form, groomName: e.target.value })} /></div>
                <div className="space-y-2"><Label>Bride</Label><Input value={form.brideName} onChange={(e) => setForm({ ...form, brideName: e.target.value })} /></div>
                <div className="space-y-2"><Label>Date</Label><Input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
                <div className="space-y-2"><Label>Time</Label><Input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
                <div className="space-y-2"><Label>Venue</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
                <div className="space-y-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Message</Label><Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} rows={4} /></div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <div className="flex gap-2">
                <Button type="submit" disabled={busy} className="bg-burgundy text-ivory">{busy ? "Saving…" : "Save"}</Button>
                <Button type="button" variant="outline" onClick={() => navigate({ to: "/dashboard" })}>Cancel</Button>
                <Link to={`/invite/${card.slug}`} className="ml-auto text-sm underline">Preview public link</Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
