import { useCallback, useEffect, useState } from "react";
import { Camera, ChevronLeft, ChevronRight, X } from "lucide-react";
import { supabase } from "@/lib/db";
import {
  getOfflineDraftPhotos,
  isOfflineDraftId,
  subscribeOfflineDrafts,
} from "@/lib/offline-studio";
import type { InvitationDetails } from "./invitation-details";
import { SuiteHeading } from "./invitation-ornaments";

type GalleryPhoto = {
  slot: number;
  image_data: string;
  caption: string;
  source: "host" | "guest" | "portrait";
};

/**
 * The card's shared gallery. The first two frames are the couple's own
 * portraits (when supplied); every other photo is added by the host from the
 * card editor. Guests can look, open the lightbox and nothing more — the
 * database rejects anonymous uploads even if somebody calls it directly.
 */
export function InvitationGallery({
  cardId,
  details,
  preview = false,
  heading,
}: {
  cardId?: string;
  details: InvitationDetails;
  preview?: boolean;
  heading?: { eyebrow: string; title: string };
}) {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<number | null>(null);

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
    if (isOfflineDraftId(cardId)) {
      setStatus("");
      setPhotos(getOfflineDraftPhotos(cardId));
      return;
    }
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
    if (isOfflineDraftId(cardId)) {
      setPhotos(getOfflineDraftPhotos(cardId));
      return subscribeOfflineDrafts(() => {
        setPhotos(getOfflineDraftPhotos(cardId));
      });
    }
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

  const current = selected !== null ? items[selected] : undefined;

  return (
    <section
      id="gallery"
      className="invite-section invite-suite invite-suite-gallery relative overflow-hidden px-6 py-20 sm:py-28"
    >
      <SuiteHeading eyebrow={heading?.eyebrow ?? "Gallery"}>
        {heading?.title ?? "Moments of Us"}
      </SuiteHeading>
      <p className="invite-suite-sub">
        Portraits and celebration frames, shared by the hosts — tap any photo to see it larger.
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
              ? "This is where the hosts' gallery appears. Add portraits and gallery photos in the Photos panel, then publish the card."
              : "The hosts haven't added photos yet. Please check back soon."}
          </p>
        </div>
      )}

      <p className="invite-gallery-note invite-gallery-note-readonly">
        <Camera className="h-3.5 w-3.5" aria-hidden="true" />
        View only · photos are added by the hosts
      </p>

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
