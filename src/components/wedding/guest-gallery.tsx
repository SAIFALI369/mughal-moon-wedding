import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2, Upload, ImagePlus, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/db";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { GUEST_PHOTO_LIMIT, MAX_PHOTO_BYTES, validatePhoto, compressPhoto } from "./photo-utils";
import { toast } from "sonner";

type PhotoRow = { slot: number; image_data: string; caption: string; owner_id?: string | null };

export function GuestGallery() {
  const cache = useQueryClient();
  const { user } = useAuth();
  const isOwner = !!user; // any authenticated user is considered owner (couple / admin)
  const inputRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<PhotoRow | null>(null);
  const [replaceSlot, setReplaceSlot] = useState<number | null>(null);
  const query = useQuery({
    queryKey: ["wedding-guest-photos"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wedding_photos")
        .select("slot,image_data,caption,owner_id")
        .order("slot");
      if (error) throw new Error("Shared photos aren't available yet. Please try again later.");
      return data as PhotoRow[];
    },
    retry: 1,
  });
  useEffect(() => {
    const channel = supabase
      .channel("guest-photos")
      .on("postgres_changes", { event: "*", schema: "public", table: "wedding_photos" }, () => {
        void cache.invalidateQueries({ queryKey: ["wedding-guest-photos"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [cache]);

  async function upload(files: FileList | null) {
    if (!files?.length || busy) return;
    const remaining = GUEST_PHOTO_LIMIT - (query.data?.length ?? 0);
    if (files.length > remaining) {
      setStatus(`Only ${remaining} shared photo slots remain. Select fewer photos.`);
      return;
    }
    setBusy(true);
    setStatus("");
    let saved = 0;
    try {
      Array.from(files).forEach(validatePhoto);
      for (const file of Array.from(files)) {
        const image = await compressPhoto(file);
        const { error } = await supabase.rpc("add_wedding_photo", {
          photo_data: image,
          photo_caption: "Mohsin & Simran · A memory from our guests",
        });
        if (error)
          throw new Error(
            error.message.includes("Gallery is full")
              ? "All five slots have been filled."
              : error.message.includes("2 MB")
                ? "Photo exceeds 2 MB limit."
                : "Photo could not be saved. Try a smaller JPEG.",
          );
        saved++;
        await cache.invalidateQueries({ queryKey: ["wedding-guest-photos"] });
      }
      setStatus(`${saved} photo${saved === 1 ? "" : "s"} added. Thank you!`);
      toast.success(`${saved} photo(s) added`);
    } catch (error) {
      setStatus(
        `${saved ? `${saved} saved. ` : ""}${error instanceof Error ? error.message : "Upload failed."}`,
      );
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(slot: number) {
    if (!isOwner) {
      toast.error("Sign in as owner to manage photos");
      return;
    }
    if (!confirm(`Remove photo in slot ${slot}?`)) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("delete_wedding_photo", { target_slot: slot });
      if (error) throw new Error(error.message);
      toast.success("Photo removed");
      await cache.invalidateQueries({ queryKey: ["wedding-guest-photos"] });
      setSelected(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  async function replace(files: FileList | null) {
    if (!files?.length || replaceSlot === null || busy) return;
    const file = files[0];
    if (!file) return;
    try {
      validatePhoto(file);
      setBusy(true);
      const image = await compressPhoto(file);
      const { error } = await supabase.rpc("replace_wedding_photo", {
        target_slot: replaceSlot,
        photo_data: image,
        photo_caption: "Mohsin & Simran · Updated by owner",
      });
      if (error) throw new Error(error.message);
      toast.success(`Photo in slot ${replaceSlot} updated`);
      await cache.invalidateQueries({ queryKey: ["wedding-guest-photos"] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Replace failed");
    } finally {
      setBusy(false);
      setReplaceSlot(null);
      if (replaceRef.current) replaceRef.current.value = "";
    }
  }

  const count = query.data?.length ?? 0;
  return (
    <div className="guest-gallery mx-auto mt-10 max-w-6xl rounded-3xl border border-gold/25 bg-card p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-muted-foreground">Through your eyes — 5 max, groom & bride at their spots</p>
          <h3 className="mt-2 font-serif text-3xl">Share a little memory</h3>
          <p className="mt-2 text-sm text-muted-foreground">Five total, curated. JPG/PNG/WebP · strict 2 MB each. {isOwner && <span className="inline-flex items-center gap-1 text-emerald-700"><ShieldCheck size={14}/> Owner: you can remove/replace any slot</span>}</p>
        </div>
        <div className="flex items-center gap-2">
          <label
            className={`simran-action inline-flex min-h-12 items-center gap-2 rounded-xl px-5 py-3 text-sm ${busy || count >= 5 || !query.isSuccess ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
          >
            <Upload size={16} />
            {busy ? "Saving…" : count >= 5 ? "Gallery is full" : "Add your photos"}
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              disabled={busy || count >= 5 || !query.isSuccess}
              onChange={(event) => void upload(event.target.files)}
            />
          </label>
          {isOwner && (
            <label className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-gold/40 px-4 py-3 text-xs hover:bg-gold/10 cursor-pointer">
              <Pencil size={14} /> Replace slot
              <input ref={replaceRef} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => void replace(e.target.files)} />
            </label>
          )}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Guest uploads are public; owner (signed-in) can remove or change any of the 5 slots. 2 MB strict — larger files are rejected at DB.
      </p>
      <div className="mt-2 flex flex-wrap gap-2 text-xs">
        {Array.from({ length: 5 }, (_, i) => i + 1).map((slot) => (
          <button
            key={slot}
            onClick={() => isOwner && setReplaceSlot(slot)}
            className={`rounded-full border px-3 py-1 ${replaceSlot === slot ? "bg-burgundy text-ivory border-burgundy" : isOwner ? "border-gold/40 hover:bg-gold/10" : "border-muted text-muted-foreground"}`}
            disabled={!isOwner}
            title={isOwner ? `Select slot ${slot} to replace` : "Sign in as owner to manage"}
          >
            Slot {slot} {replaceSlot === slot ? "• selected" : ""}
          </button>
        ))}
        {replaceSlot && <span className="text-muted-foreground">→ choose a JPEG ≤2 MB to replace slot {replaceSlot}</span>}
      </div>
      <p role="status" className="mt-3 text-sm">
        {query.isPending ? "Loading…" : query.isError ? query.error.message : `${count} / 5 guest photos`} {status && `· ${status}`}
      </p>
      {query.isError && (
        <button type="button" className="mt-2 underline text-sm" onClick={() => void query.refetch()}>
          Retry
        </button>
      )}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {query.data?.map((photo) => (
          <div key={photo.slot} className="relative overflow-hidden rounded-xl border border-gold/20 group">
            <button type="button" onClick={() => setSelected(photo)} className="block w-full">
              <img src={photo.image_data} alt={photo.caption} loading="lazy" decoding="async" className="aspect-[4/5] w-full object-cover" />
            </button>
            {isOwner && (
              <div className="absolute inset-x-1 bottom-1 flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition">
                <Button size="sm" variant="secondary" className="h-7 text-xs flex-1" onClick={() => setReplaceSlot(photo.slot)}>
                  <Pencil size={12} className="mr-1" /> Change
                </Button>
                <Button size="sm" variant="destructive" className="h-7 text-xs flex-1" onClick={() => void remove(photo.slot)} disabled={busy}>
                  <Trash2 size={12} className="mr-1" /> Remove
                </Button>
              </div>
            )}
            <span className="absolute left-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-[10px] text-ivory">Slot {photo.slot}</span>
          </div>
        ))}
        {query.isSuccess &&
          Array.from({ length: 5 - count }, (_, i) => (
            <div key={`empty-${i}`} className="flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gold/30 bg-muted/30 text-muted-foreground">
              <ImagePlus size={24} />
              <span className="text-xs">A memory awaits — slot {count + i + 1}</span>
            </div>
          ))}
      </div>
      <div className="mt-4 rounded-xl border border-gold/20 bg-muted/40 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Curated gallery is 5 photos (groom & bride fixed at slots 2 & 4):</p>
        <p>Main “Moments of Us” above shows 5 curated images with groom (slot 2) & bride (slot 4) always at their places — guest uploads fill the 5 shared slots below. Owner may replace any slot with ≤2 MB JPEG.</p>
      </div>
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogTitle>{selected?.caption} — Slot {selected?.slot}</DialogTitle>
          {selected && <img src={selected.image_data} alt={selected.caption} className="max-h-[75vh] w-full object-contain" />}
          {isOwner && selected && (
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setReplaceSlot(selected.slot)}>Change this slot</Button>
              <Button size="sm" variant="destructive" onClick={() => void remove(selected.slot)}>Remove</Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
