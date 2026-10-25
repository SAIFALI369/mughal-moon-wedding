import { useCallback, useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/db";
import {
  addOfflineDraftPhoto,
  getOfflineDraftPhotos,
  isOfflineDraftId,
  removeOfflineDraftPhoto,
} from "@/lib/offline-studio";
import { compressPhoto } from "./photo-utils";
import { toast } from "sonner";

type Row = { slot: number; image_data: string; caption: string; source: "host" | "guest" };

const HOST_PHOTO_CAP = 12;

export function InvitationGalleryEditor({ cardId }: { cardId?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!cardId) return;
    if (isOfflineDraftId(cardId)) {
      setRows(getOfflineDraftPhotos(cardId));
      return;
    }
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
      setNote("Save the card first to upload gallery photos.");
      return;
    }
    const room = HOST_PHOTO_CAP - rows.length;
    if (room <= 0) {
      setNote(`Maximum ${HOST_PHOTO_CAP} photos reached.`);
      return;
    }
    setBusy(true);
    setNote("");
    let saved = 0;
    try {
      for (const file of Array.from(files).slice(0, room)) {
        const image = await compressPhoto(file);
        if (isOfflineDraftId(cardId)) {
          addOfflineDraftPhoto(cardId, image, "", HOST_PHOTO_CAP);
        } else {
          const { error } = await supabase.rpc("add_invitation_photo", {
            p_card_id: cardId,
            photo_data: image,
            photo_caption: "",
          });
          if (error) throw new Error(error.message);
        }
        saved += 1;
      }
      await load();
      toast.success(`${saved} photo${saved === 1 ? "" : "s"} added`);
    } catch (error) {
      setNote(
        `${saved ? `${saved} saved. ` : ""}${error instanceof Error ? error.message : "Could not add photo."}`,
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
      if (isOfflineDraftId(cardId)) {
        removeOfflineDraftPhoto(cardId, slot);
      } else {
        const { error } = await supabase.rpc("delete_invitation_photo", {
          p_card_id: cardId,
          target_slot: slot,
        });
        if (error) throw error;
      }
      await load();
    } catch {
      toast.error("Could not remove photo.");
    } finally {
      setBusy(false);
    }
  }

  const hostCount = rows.filter((row) => row.source === "host").length;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Gallery</p>
          <p className="text-xs text-muted-foreground">
            {cardId
              ? `${hostCount} / ${HOST_PHOTO_CAP} photos`
              : "Save card first to add gallery photos"}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || !cardId}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <ImagePlus className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
          )}
          {busy ? "Uploading…" : "Add photos"}
        </Button>
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

      {rows.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
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
              <button
                type="button"
                aria-label="Remove gallery photo"
                className="absolute right-1 top-1 rounded-full bg-background/90 p-1 text-destructive shadow-sm"
                disabled={busy}
                onClick={() => void remove(row.slot)}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {note && (
        <p role="status" className="mt-2 text-xs text-muted-foreground">
          {note}
        </p>
      )}
    </div>
  );
}
