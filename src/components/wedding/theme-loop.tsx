import { memo, useEffect, useRef, useState } from "react";
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
 * Priority heroes keep their decoded `<video>` mounted across scroll dips so
 * scrolling back up never drops frames or forces a re-buffer flash. Lower tiles
 * still yield their decoder cleanly via the viewport film budget.
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

export const ThemeLoop = memo(function ThemeLoop({
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
  /** Host turned motion off, or the card is holding its stopped final frame. */
  enabled?: boolean;
  poster?: string | null;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const sentinel = useRef<HTMLSpanElement>(null);
  const [failedTheme, setFailedTheme] = useState<string | null>(null);
  const [fallbackTheme, setFallbackTheme] = useState<string | null>(null);
  const [mounted, setMounted] = useState(priority);
  const [allowed, setAllowed] = useState(priority);
  const [decoded, setDecoded] = useState(false);
  const failed = failedTheme === theme;
  const useFallback = fallbackTheme === theme;
  const motion = enabled && !reduced && !failed;
  const active = motion && allowed;
  const primarySrc = themeLoop(theme);
  const fallbackSrc = `/film/${theme}.mp4`;
  const videoSrc = useFallback ? fallbackSrc : primarySrc;

  useEffect(() => {
    setDecoded(false);
  }, [videoSrc]);

  // Tell the budget how much of this tile is on screen.
  useEffect(() => {
    if (!motion) return;
    const element = sentinel.current;
    const slot = requestFilmSlot(setAllowed, priority ? 0 : 1);
    if (!element || typeof IntersectionObserver === "undefined") {
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

  // Keep priority hero `<video>` mounted once loaded so scrolling back never drops a frame.
  useEffect(() => {
    if (active) {
      setMounted(true);
      return;
    }
    if (!priority) {
      setMounted(false);
    }
  }, [active, priority]);

  // Play once active & visible; pause smoothly when scrolled off or hidden.
  useEffect(() => {
    if (!mounted) return;
    const video = ref.current;
    if (!video) return;
    if (video.readyState >= 2) setDecoded(true);
    const sync = () => {
      if (!active || document.hidden) {
        if (!video.paused) video.pause();
      } else {
        playMedia(video);
      }
    };
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => {
      document.removeEventListener("visibilitychange", sync);
      if (!video.paused) video.pause();
    };
  }, [mounted, active, videoSrc]);

  if (!motion) return poster ? <PosterStill src={poster} className={className} /> : null;

  return (
    <>
      <span ref={sentinel} className="theme-loop-sentinel" aria-hidden="true" />
      {poster && (!active || !mounted || !decoded) && (
        <PosterStill src={poster} className={className} />
      )}
      {mounted && (priority || active) && (
        <video
          ref={ref}
          className={`theme-loop ${className}`.trim()}
          src={videoSrc}
          poster={poster ?? undefined}
          // `autoPlay` matters when active: the browser starts the muted film itself,
          // without waiting for hydration or a script. The effect above is the backup.
          autoPlay={active}
          muted
          loop
          playsInline
          preload={priority ? "auto" : "none"}
          disablePictureInPicture
          controls={false}
          tabIndex={-1}
          aria-hidden="true"
          data-ready={decoded ? "true" : "false"}
          onLoadedData={() => setDecoded(true)}
          onCanPlay={() => setDecoded(true)}
          onError={() => {
            if (!useFallback && primarySrc !== fallbackSrc) {
              setFallbackTheme(theme);
            } else {
              setFailedTheme(theme);
            }
          }}
        />
      )}
    </>
  );
});

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
