import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { InvitationTheme } from "./invitation-options";
import { themeLoop } from "./invitation-art";

/**
 * A theme's own hero film.
 *
 * Each theme already ships an illustration; `public/film/<theme>.mp4` is the
 * same scene turned into a real eight-second video — a slow camera move with
 * the theme's ambient layer (petals, embers, stars, lantern bokeh). It plays
 * muted, inline and looping behind the invitation, with the illustration as its
 * poster frame, so the card looks complete before a single byte of video lands.
 *
 * Nothing here downloads until the hero is on screen, the still stays visible
 * underneath until the first frame is decoded, and guests who ask for reduced
 * motion never see a video at all — they keep the illustration.
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
}: {
  theme: InvitationTheme;
  className?: string;
  /** Front of the page: start loading on mount instead of on intersection. */
  priority?: boolean;
  /** Host turned motion off, or the card is printed. */
  enabled?: boolean;
}) {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLVideoElement>(null);
  const [live, setLive] = useState(false);
  const [mounted, setMounted] = useState(priority);
  const active = enabled && !reduced;

  // Load on approach: a hero far down the page costs nothing until it is near.
  useEffect(() => {
    if (mounted || !active) return;
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") {
      setMounted(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setMounted(true);
        observer.disconnect();
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [mounted, active]);

  // Play only what is visible, and stop it the moment it leaves the screen or
  // the tab is hidden: a phone should never decode a film nobody is watching.
  useEffect(() => {
    const element = ref.current;
    if (!element || !mounted || !active) return;
    let visible = true;
    const play = () => {
      if (!visible || document.hidden) {
        element.pause();
        return;
      }
      // Older engines return undefined here, so never assume a promise.
      const started = element.play();
      if (started && typeof started.catch === "function") {
        started.catch(() => {
          // Autoplay refused (battery saver, data saver, older browser): the
          // poster is already on screen, so the card simply stays a still.
          setLive(false);
        });
      }
    };
    const sync = () => play();
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(
            ([entry]) => {
              visible = entry?.isIntersecting ?? false;
              play();
            },
            { threshold: 0.01 },
          )
        : null;
    observer?.observe(element);
    document.addEventListener("visibilitychange", sync);
    // A first tap anywhere wakes a browser that refused autoplay at load.
    window.addEventListener("pointerdown", play, { once: true, capture: true });
    play();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("pointerdown", play, true);
    };
  }, [mounted, active]);

  if (!active) return null;

  return (
    <video
      ref={ref}
      className={`theme-loop ${className}`.trim()}
      data-live={live ? "true" : undefined}
      poster={undefined}
      src={mounted ? themeLoop(theme) : undefined}
      muted
      loop
      playsInline
      preload={priority ? "auto" : "none"}
      disablePictureInPicture
      controls={false}
      tabIndex={-1}
      aria-hidden="true"
      onLoadedData={() => setLive(true)}
      onError={() => setLive(false)}
    />
  );
}
