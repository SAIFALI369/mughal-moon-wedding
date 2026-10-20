import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/lib/db";
import { compressPhoto } from "./photo-utils";
import { toast } from "sonner";

type Row = { slot: number; image_data: string; caption: string; source: "host" | "guest" };

const HOST_PHOTO_CAP = 12;

/**
 * Host-facing gallery manager inside the card editor. Photos live in the card's
 * own gallery table (never in another card's) and only the card's owner can add
 * or remove them; guests see a read-only gallery.
 */
export function InvitationGalleryEditor({ cardId }: { cardId?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!cardId) return;
    const { data, error } = await supabase
      .from("invitation_photos")
      .select("slot,image_data,caption,source")
      .eq("card_id", cardId)
      .order("slot");
    if (!error) setRows((data as Row[]) ?? []);
  }, [cardId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(files: FileList | null) {
    if (!files?.length || busy) return;
    if (!cardId) {
      setNote("Save the card once, then return to add gallery photos.");
      return;
    }
    const room = HOST_PHOTO_CAP - rows.length;
    if (room <= 0) {
      setNote(`The gallery already holds ${HOST_PHOTO_CAP} photos.`);
      return;
    }
    setBusy(true);
    setNote("");
    let saved = 0;
    try {
      for (const file of Array.from(files).slice(0, room)) {
        const image = await compressPhoto(file);
        const { error } = await supabase.rpc("add_invitation_photo", {
          p_card_id: cardId,
          photo_data: image,
          photo_caption: "",
        });
        if (error) throw new Error(error.message);
        saved += 1;
      }
      await load();
      setNote(`${saved} gallery photo${saved === 1 ? "" : "s"} added.`);
      toast.success("Gallery updated");
    } catch (error) {
      setNote(
        `${saved ? `${saved} saved. ` : ""}${error instanceof Error ? error.message : "Could not add the photo."}`,
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove(slot: number) {
    if (!cardId || busy) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("delete_invitation_photo", {
        p_card_id: cardId,
        target_slot: slot,
      });
      if (error) throw error;
      await load();
      setNote("Photo removed.");
    } catch {
      toast.error("This photo could not be removed.");
    } finally {
      setBusy(false);
    }
  }

  const hostCount = rows.filter((row) => row.source === "host").length;
  const legacyGuestCount = rows.filter((row) => row.source === "guest").length;

  return (
    <div className="rounded-xl border border-gold/40 bg-gold/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-serif text-lg text-foreground">Shared gallery</p>
          <p className="text-sm text-muted-foreground">
            Your portraits appear first. Add up to {HOST_PHOTO_CAP} photos here. Guests can view the
            gallery but cannot upload — only you can change it.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-gold px-4 py-2 text-xs uppercase tracking-[0.16em] text-gold transition hover:bg-gold/10 disabled:opacity-50"
          disabled={busy || !cardId}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="h-4 w-4" aria-hidden="true" />
          )}
          {busy ? "Adding…" : "Add photo"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          aria-label="Choose gallery photos"
          onChange={(event) => void add(event.target.files)}
        />
      </div>

      {!cardId && (
        <p className="mt-3 text-xs text-muted-foreground">
          Save this card once, then return here to add gallery photos.
        </p>
      )}

      {rows.length > 0 && (
        <ul className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {rows.map((row) => (
            <li
              key={row.slot}
              className="group relative overflow-hidden rounded-lg border border-border"
            >
              <img
                src={row.image_data}
                alt={row.caption || `Gallery photo ${row.slot}`}
                className="h-20 w-full object-cover"
              />
              <span className="absolute left-1 top-1 rounded-full bg-background/85 px-1.5 text-[9px] uppercase tracking-wider text-gold">
                {row.source}
              </span>
              <button
                type="button"
                aria-label="Remove gallery photo"
                className="absolute right-1 top-1 rounded-full bg-background/85 p-1 text-destructive"
                disabled={busy}
                onClick={() => void remove(row.slot)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        {hostCount} of {HOST_PHOTO_CAP} photos added
        {legacyGuestCount > 0
          ? ` · ${legacyGuestCount} legacy guest photo${legacyGuestCount === 1 ? "" : "s"} (view only)`
          : ""}
      </p>
      {note && (
        <p role="status" className="mt-1 text-xs text-gold">
          {note}
        </p>
      )}
    </div>
  );
}
