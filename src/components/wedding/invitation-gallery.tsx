import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, ImagePlus, Loader2, Trash2, X } from "lucide-react";
import { supabase } from "@/lib/db";
import { useAuth } from "@/lib/auth-context";
import type { InvitationDetails } from "./invitation-details";
import { compressPhoto, GUEST_PHOTO_LIMIT } from "./photo-utils";
import { toast } from "sonner";
import { SuiteHeading } from "./invitation-ornaments";

type GalleryPhoto = {
  slot: number;
  image_data: string;
  caption: string;
  source: "host" | "guest" | "portrait";
};

const HOST_PHOTO_LIMIT = 12;

/**
 * The card's shared gallery. The first two frames are the couple's own
 * portraits (when supplied); guests and the host can add photos afterwards.
 * Everything is scoped to this one card, so links never leak between weddings.
 */
export function InvitationGallery({
  cardId,
  details,
  preview = false,
}: {
  cardId?: string;
  details: InvitationDetails;
  preview?: boolean;
}) {
  const { user } = useAuth();
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const portraits: GalleryPhoto[] = [];
  if (details.elements.portraits) {
    if (details.groomPhoto)
      portraits.push({
        slot: -1,
        image_data: details.groomPhoto,
        caption: details.groomName,
        source: "portrait",
      });
    if (details.bridePhoto)
      portraits.push({
        slot: -2,
        image_data: details.bridePhoto,
        caption: details.brideName,
        source: "portrait",
      });
  }
  const items = [...portraits, ...photos];

  const load = useCallback(async () => {
    if (!cardId) return;
    const { data, error } = await supabase
      .from("invitation_photos")
      .select("slot,image_data,caption,source")
      .eq("card_id", cardId)
      .order("slot");
    if (error) {
      setStatus("Shared photos aren't available yet.");
      return;
    }
    setPhotos((data as GalleryPhoto[]) ?? []);
  }, [cardId]);

  useEffect(() => {
    if (!cardId) return;
    setLoading(true);
    void load().finally(() => setLoading(false));
    // A preview is a static snapshot; only the live card follows Realtime.
    if (preview) return;
    const channel = supabase
      .channel(`invitation-gallery-${cardId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "invitation_photos",
          filter: `card_id=eq.${cardId}`,
        },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [cardId, preview, load]);

  useEffect(() => {
    if (selected === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowRight")
        setSelected((current) => (current === null ? 0 : (current + 1) % items.length));
      if (event.key === "ArrowLeft")
        setSelected((current) =>
          current === null ? 0 : (current - 1 + items.length) % items.length,
        );
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, items.length]);

  async function upload(files: FileList | null) {
    if (!files?.length || busy) return;
    if (!cardId) {
      setStatus("Publish the invitation before adding photos.");
      return;
    }
    const guestCount = photos.filter((photo) => photo.source === "guest").length;
    const remainingGuest = Math.max(0, GUEST_PHOTO_LIMIT - guestCount);
    const remainingHost = Math.max(0, HOST_PHOTO_LIMIT - photos.length);
    const remaining = user ? remainingHost : Math.min(remainingGuest, remainingHost);
    if (remaining === 0) {
      setStatus(
        user
          ? "This gallery already holds twelve photos."
          : `Only ${GUEST_PHOTO_LIMIT} guest photos are allowed for this invitation.`,
      );
      return;
    }
    const chosen = Array.from(files).slice(0, remaining);
    setBusy(true);
    setStatus("");
    let saved = 0;
    try {
      for (const file of chosen) {
        const image = await compressPhoto(file);
        const { error } = await supabase.rpc("add_invitation_photo", {
          p_card_id: cardId,
          photo_data: image,
          photo_caption: user
            ? `${details.groomName} & ${details.brideName}`
            : "A memory shared with love",
        });
        if (error) {
          throw new Error(
            error.message.includes("five guest photos")
              ? "All five guest photo slots are filled."
              : error.message.includes("twelve photos")
                ? "This gallery already holds twelve photos."
                : error.message.includes("2 MB")
                  ? "Photo exceeds the 2 MB limit."
                  : "Photo could not be saved. Try a smaller JPEG.",
          );
        }
        saved += 1;
      }
      await load();
      setStatus(`${saved} photo${saved === 1 ? "" : "s"} added. Thank you!`);
      toast.success(`${saved} photo${saved === 1 ? "" : "s"} added`);
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

  async function remove(photo: GalleryPhoto) {
    if (!cardId) return;
    if (!confirm("Remove this photo from the gallery?")) return;
    setBusy(true);
    try {
      const { error } = await supabase.rpc("delete_invitation_photo", {
        p_card_id: cardId,
        target_slot: photo.slot,
      });
      if (error) throw error;
      await load();
      setSelected(null);
      toast.success("Photo removed");
    } catch {
      toast.error("Only the host can remove this photo.");
    } finally {
      setBusy(false);
    }
  }

  const current = selected !== null ? items[selected] : undefined;

  return (
    <section
      id="gallery"
      className="invite-section invite-suite invite-suite-gallery relative overflow-hidden px-6 py-20 sm:py-28"
    >
      <SuiteHeading eyebrow="Gallery">Moments of Us</SuiteHeading>
      <p className="invite-suite-sub">
        Portraits, celebration frames and photos shared by guests — all in one place.
      </p>

      {items.length > 0 ? (
        <div className="invite-gallery-grid mx-auto max-w-6xl">
          {items.map((photo, index) => (
            <button
              key={`${photo.source}-${photo.slot}`}
              type="button"
              className="invite-gallery-tile"
              onClick={() => setSelected(index)}
              aria-label={`Open photo ${index + 1}${photo.caption ? `: ${photo.caption}` : ""}`}
            >
              <img
                src={photo.image_data}
                alt={photo.caption || `Invitation gallery photo ${index + 1}`}
                loading="lazy"
              />
              <span className="invite-gallery-tile-caption">{photo.caption}</span>
              <span className="invite-gallery-zoom" aria-hidden="true">
                ✦
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="invite-gallery-empty-wrap mx-auto max-w-5xl">
          <div className="invite-gallery-placeholders" aria-hidden="true">
            {["Portraits", "Mehndi", "The vows", "Walima"].map((label) => (
              <span key={label} className="invite-gallery-placeholder">
                <span className="invite-gallery-placeholder-star">✦</span>
                <span>{label}</span>
              </span>
            ))}
          </div>
          <p className="invite-gallery-empty">
            {preview || !cardId
              ? "This is where your shared gallery appears. Publish the card, then add portraits above and let guests add their own frames."
              : "Be the first to add a photo from the celebration."}
          </p>
        </div>
      )}

      {!preview && cardId && (
        <div className="invite-gallery-actions">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="sr-only"
            aria-label="Choose photos for the gallery"
            onChange={(event) => void upload(event.target.files)}
          />
          <button
            type="button"
            className="invite-gallery-add"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden="true" />
            )}
            {busy ? "Adding photo…" : "Add a photo"}
          </button>
          <p className="invite-gallery-note">
            <Camera className="h-3.5 w-3.5" aria-hidden="true" />
            {user
              ? "Host upload · up to twelve photos per invitation"
              : "Guest upload · five shared slots per invitation"}
          </p>
        </div>
      )}
      {loading && (
        <p className="invite-gallery-status" role="status">
          Loading shared photos…
        </p>
      )}
      {status && (
        <p className="invite-gallery-status" role="status" aria-live="polite">
          {status}
        </p>
      )}

      {current && (
        <div
          className="invite-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={current.caption || "Gallery photo"}
          onClick={() => setSelected(null)}
        >
          <div className="invite-lightbox-inner" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="invite-lightbox-close"
              aria-label="Close photo"
              onClick={() => setSelected(null)}
            >
              <X className="h-5 w-5" />
            </button>
            <img
              src={current.image_data}
              alt={current.caption || "Gallery photo"}
              className="invite-lightbox-image"
            />
            <div className="invite-lightbox-bar">
              <div>
                <span className="invite-lightbox-count">
                  {selected! + 1} / {items.length}
                </span>
                <p className="invite-lightbox-caption">{current.caption}</p>
              </div>
              <div className="invite-lightbox-controls">
                {user && current.source !== "portrait" && (
                  <button
                    type="button"
                    aria-label="Remove photo"
                    disabled={busy}
                    onClick={() => void remove(current)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label="Previous photo"
                  onClick={() =>
                    setSelected((value) =>
                      value === null ? 0 : (value - 1 + items.length) % items.length,
                    )
                  }
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next photo"
                  onClick={() =>
                    setSelected((value) => (value === null ? 0 : (value + 1) % items.length))
                  }
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
