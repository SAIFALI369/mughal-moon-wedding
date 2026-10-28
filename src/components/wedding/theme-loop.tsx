import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { InvitationTheme } from "./invitation-options";
import { themeLoop } from "./invitation-art";
import { requestFilmSlot } from "@/lib/film-budget";

/**
 * A theme's own hero film.
 *
 * Each theme already ships an illustration; `public/film/<theme>.mp4` is the
 * same scene turned into a real eight-second video — a slow camera move with
 * the theme's ambient layer (petals, embers, stars, lantern bokeh). It plays
 * muted, inline and looping behind the invitation, with the illustration as its
 * poster frame, so the card looks complete before a single byte of video lands.
 *
 * Playback is rationed: a page can show twenty-odd theme tiles, and twenty-odd
 * decoders is what made the studio feel slow. Each player reports how much of
 * itself is on screen and the global film budget (`@/lib/film-budget`) lets only
 * the most visible one or two play; everyone else keeps the still, which is the
 * same picture. Scroll, and the film follows the guest — never all at once.
 *
 * Nothing downloads until a tile is on screen, the still stays visible until the
 * first frame is decoded, and guests who ask for reduced motion (or who turn on
 * data saver) never see a video at all — they keep the illustration.
 */

/** Start a media element without assuming every engine returns a promise. */
export function playMedia(element: HTMLMediaElement) {
  try {
    const started = element.play();
    if (started && typeof started.catch === "function") started.catch(() => undefined);
  } catch {
    // Nothing to do: the still frame is already on screen.
  }
}

export function ThemeLoop({
  theme,
  className = "",
  priority = false,
  enabled = true,
  poster = null,
}: {
  theme: InvitationTheme;
  className?: string;
  /** Front of the page: wins the film budget over a thumbnail further down. */
  priority?: boolean;
  /** Host turned motion off, or the card is printed. */
  enabled?: boolean;
  /**
   * Still image to draw while another tile holds the film budget. Defaults to
   * nothing, because every call site already paints the theme artwork behind
   * this element — pass a (small) poster only where it does not.
   */
  poster?: string | null;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  /**
   * The video only exists while this tile holds the budget, so visibility is
   * measured on an always-present, invisible box with the same containing
   * block — otherwise "is this tile on screen?" could never be asked before the
   * tile was allowed to play, and nothing would ever hand the slot over.
   */
  const sentinel = useRef<HTMLSpanElement>(null);
  const [failed, setFailed] = useState(false);
  // A hero (or the first tile above the fold) renders its film in the server
  // HTML so the browser can start it before hydration — it is one decoder.
  // Everything else waits for the budget to say it is the visible one.
  const [mounted, setMounted] = useState(priority);
  const [allowed, setAllowed] = useState(priority);
  const motion = enabled && !reduced && !failed;
  const active = motion && allowed;

  // Tell the budget how much of this tile is on screen.
  useEffect(() => {
    if (!motion) return;
    const element = sentinel.current;
    const slot = requestFilmSlot(setAllowed, priority ? 0 : 1);
    if (!element || typeof IntersectionObserver === "undefined") {
      // No observer (old engine, test environment): the caller's own still is
      // already on screen, so treat this tile as visible and let the budget pick.
      slot.setRatio(1);
      return () => slot.release();
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        const height = entry.boundingClientRect.height || 1;
        const visible = entry.intersectionRect.height || 0;
        slot.setRatio(entry.isIntersecting ? Math.min(1, visible / height) : 0);
      },
      { threshold: [0, 0.15, 0.5, 0.9] },
    );
    observer.observe(element);
    return () => {
      observer.disconnect();
      slot.release();
    };
  }, [motion, priority]);

  // Hold the film only while the budget says so: mounting the element is what
  // costs a decoder, so an unbudgeted tile keeps the still and no video at all.
  useEffect(() => {
    if (!active) {
      setMounted(false);
      return;
    }
    setMounted(true);
  }, [active]);

  // Play once the element exists, and stop the moment the tab is hidden.
  useEffect(() => {
    if (!mounted || !active) return;
    const video = ref.current;
    if (!video) return;
    const sync = () => {
      if (document.hidden) video.pause();
      else playMedia(video);
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      video.pause();
    };
  }, [mounted, active]);

  if (!motion) return poster ? <PosterStill src={poster} className={className} /> : null;

  return (
    <>
      <span ref={sentinel} className="theme-loop-sentinel" aria-hidden="true" />
      {/* The still is the poster frame, the fallback when autoplay is refused,
          and what a guest sees while a decoder is busy with another tile. */}
      {poster && (!active || !mounted) && <PosterStill src={poster} className={className} />}
      {mounted && active && (
        <video
          ref={ref}
          className={`theme-loop ${className}`.trim()}
          src={themeLoop(theme)}
          // `autoPlay` matters: the browser starts the muted film itself, without
          // waiting for hydration or a script. The effect above is the backup (and
          // the wake-up call for browsers that refused it at load).
          autoPlay
          muted
          loop
          playsInline
          preload={priority ? "auto" : "none"}
          disablePictureInPicture
          controls={false}
          tabIndex={-1}
          aria-hidden="true"
          onError={() => setFailed(true)}
        />
      )}
    </>
  );
}

/** The theme's artwork, positioned exactly where its film would be. */
function PosterStill({ src, className }: { src: string; className: string }) {
  return (
    <img
      className={`theme-loop theme-loop-still ${className}`.trim()}
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      decoding="async"
    />
  );
}
