import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Upload, ImagePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

import { GUEST_PHOTO_LIMIT, validatePhoto, compressPhoto } from "./photo-utils";

export function GuestGallery() {
  const cache = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<{ image_data: string; caption: string } | null>(null);
  const query = useQuery({
    queryKey: ["wedding-guest-photos"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("wedding_photos")
        .select("slot,image_data,caption")
        .order("slot");
      if (error) throw new Error("Shared photos aren't available yet. Please try again later.");
      return data;
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
      // Validate the entire selection before starting an insert.
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
              ? "All five slots have been filled by guests."
              : "Photo could not be saved. Please retry or contact the couple.",
          );
        saved++;
        await cache.invalidateQueries({ queryKey: ["wedding-guest-photos"] });
      }
      setStatus(`${saved} photo${saved === 1 ? "" : "s"} added. Thank you for sharing!`);
    } catch (error) {
      setStatus(
        `${saved ? `${saved} saved. ` : ""}${error instanceof Error ? error.message : "Upload failed. Please try again."}`,
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const count = query.data?.length ?? 0;
  return (
    <div className="guest-gallery mx-auto mt-10 max-w-6xl rounded-3xl border border-gold/25 bg-card p-5 sm:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[.2em] text-muted-foreground">
            Through your eyes
          </p>
          <h3 className="mt-2 font-serif text-3xl">Share a little memory</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Five guest photos total, shared with everyone. JPG, PNG or WebP · up to 10 MB each.
          </p>
        </div>
        <label
          className={`simran-action inline-flex min-h-12 items-center gap-2 rounded-xl px-5 py-3 text-sm ${busy || count >= 5 || !query.isSuccess ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        >
          <Upload size={16} />
          {busy ? "Saving photos…" : count >= 5 ? "Gallery is full" : "Add your photos"}
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
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Only upload bride-and-groom photos you have permission to share. Photos become public; only
        the site owner can remove them.
      </p>
      <p role="status" className="mt-3 text-sm">
        {query.isPending
          ? "Loading shared memories…"
          : query.isError
            ? query.error.message
            : `${count} / 5 guest photos`}{" "}
        {status}
      </p>
      {query.isError && (
        <button type="button" className="mt-2 underline" onClick={() => void query.refetch()}>
          Retry loading photos
        </button>
      )}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {query.data?.map((photo) => (
          <button
            type="button"
            key={photo.slot}
            onClick={() => setSelected(photo)}
            className="overflow-hidden rounded-xl border border-gold/20 focus-visible:outline-2 focus-visible:outline-emerald-500"
          >
            <img
              src={photo.image_data}
              alt={photo.caption}
              loading="lazy"
              decoding="async"
              className="aspect-[4/5] w-full object-cover"
            />
          </button>
        ))}
        {query.isSuccess &&
          Array.from({ length: 5 - count }, (_, i) => (
            <div
              key={`empty-${i}`}
              className="flex aspect-[4/5] flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gold/30 bg-muted/30 text-muted-foreground"
            >
              <ImagePlus size={24} />
              <span className="text-xs">A memory awaits</span>
            </div>
          ))}
      </div>
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="max-w-4xl">
          <DialogTitle>{selected?.caption}</DialogTitle>
          {selected && (
            <img
              src={selected.image_data}
              alt={selected.caption}
              className="max-h-[75vh] w-full object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
