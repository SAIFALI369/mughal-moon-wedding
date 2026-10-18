import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Brain, Trash2, Save, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { getSimranMemory, saveSimranMemory, deleteSimranMemory, type SimranMemory } from "@/lib/simran-memory";

type Props = {
  cardId: string;
  cardTitle: string;
  initialContent: Record<string, unknown>;
  expiresAt?: string | null;
};

export function SimranMemoryBar({ cardId, cardTitle, initialContent, expiresAt }: Props) {
  const [form, setForm] = useState<SimranMemory>(() => {
    const existing = getSimranMemory(cardId);
    if (existing) return existing;
    const c = initialContent as Record<string, string>;
    // default expiry: card expiresAt or +1 day after date, or +2 days
    const exp = expiresAt || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
    return {
      cardId,
      cardTitle,
      groomName: c.groomName || "Mohsin",
      brideName: c.brideName || "Simran",
      date: c.date || "22 November 2026",
      time: c.time || "4:00 PM IST",
      venue: c.venue || "",
      address: c.address || "",
      customDetails: "",
      updatedAt: new Date().toISOString(),
      expiresAt: exp,
    };
  });

  useEffect(() => {
    const m = getSimranMemory(cardId);
    if (m) setForm(m);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  function save() {
    const mem: SimranMemory = {
      ...form,
      cardId,
      cardTitle,
      updatedAt: new Date().toISOString(),
    };
    saveSimranMemory(mem);
    toast.success("Saved to Simran's local memory (not on server). Will auto-delete when card expires.");
  }

  function clear() {
    deleteSimranMemory(cardId);
    toast.success("Local memory cleared");
    const c = initialContent as Record<string, string>;
    setForm((f) => ({ ...f, customDetails: "", groomName: c.groomName || f.groomName, brideName: c.brideName || f.brideName, date: c.date || f.date, venue: c.venue || f.venue, address: c.address || f.address }));
  }

  return (
    <Card className="border-gold/30 bg-amber-50/40 dark:bg-burgundy/10">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base"><Brain className="h-4 w-4 text-gold" /> What Simran should know about this card</CardTitle>
        <CardDescription className="text-xs">This bar loads into Simran’s memory <strong>locally only</strong> — stored in your browser, never on server. Used to answer specific questions about <em>{cardTitle}</em>. Auto-deleted when marriage day ends and card is removed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1"><Label className="text-xs">Groom</Label><Input value={form.groomName} onChange={(e) => setForm({ ...form, groomName: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Bride</Label><Input value={form.brideName} onChange={(e) => setForm({ ...form, brideName: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Date</Label><Input value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} placeholder="e.g. 22 November 2026" /></div>
          <div className="space-y-1"><Label className="text-xs">Time</Label><Input value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Venue</Label><Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-xs">Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Custom details for Simran (dress code, contacts, parking, menu, story, etc.)</Label>
          <Textarea value={form.customDetails} onChange={(e) => setForm({ ...form, customDetails: e.target.value })} rows={4} maxLength={2000} placeholder="e.g. Nikah at 4 PM at Jama Masjid Hall, valet parking available, contact: +91..., vegetarian menu, no kids after 9 PM..." />
          <p className="text-[11px] text-muted-foreground">{form.customDetails.length}/2000 · Stored locally only, never sent to DB.</p>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Memory expires (auto-delete card after)</Label>
          <Input type="datetime-local" value={form.expiresAt ? new Date(form.expiresAt).toISOString().slice(0,16) : ""} onChange={(e) => setForm({ ...form, expiresAt: e.target.value ? new Date(e.target.value).toISOString() : form.expiresAt })} />
          <p className="text-[11px] text-muted-foreground">When this time passes, browser memory and the card are deleted automatically. Default: card’s expiry.</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={save} className="bg-burgundy text-ivory hover:bg-burgundy/90"><Save size={14} className="mr-1"/> Save to Simran (local)</Button>
          <Button size="sm" variant="outline" onClick={clear}><Trash2 size={14} className="mr-1"/> Clear local</Button>
        </div>
        <p className="flex items-center gap-1 text-[11px] text-emerald-700"><ShieldAlert size={12}/> Local only · not saved · auto-deleted after {form.expiresAt ? new Date(form.expiresAt).toLocaleDateString() : "expiry"}</p>
      </CardContent>
    </Card>
  );
}
