import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion } from "framer-motion";
import eidSky from "@/assets/eid-sky.webp";
import finalFrame from "@/assets/noor-arch-final.jpg.asset.json";
import coverFrame from "@/assets/noor-arch-cover.jpg.asset.json";
import type { InvitationTheme } from "./invitation-options";
import {
  heroVideoForTheme,
  openingCoverForTheme,
  openingStillForTheme,
  openingVideoForTheme,
} from "./invitation-art";

export const noorArchStill = finalFrame.url;
export const noorArchCover = coverFrame.url;

export type NoorScene = { kicker: string; title: string; body?: string };

const DARK_OPENING_THEMES = new Set<InvitationTheme>([
  "aladin",
  "bihari-vibe",
  "mecca_madinah",
  "luxury",
  "futuristic",
  "diya-utsav",
  "riad-noor",
  "kashi-ghat",
  "mehndi-night",
  "chand-bagh",
  "royal-rajmahal",
  "mughal-moon-film",
]);

export function isDarkOpeningTheme(theme?: InvitationTheme): boolean {
  return theme ? DARK_OPENING_THEMES.has(theme) : false;
}

type OpeningPhaseState = {
  revealed: boolean;
  gated: boolean;
  heroVideoLive: boolean;
};

const OpeningPhaseContext = createContext<OpeningPhaseState>({
  revealed: true,
  gated: false,
  heroVideoLive: false,
});

export function useOpeningPhase() {
  return useContext(OpeningPhaseContext);
}

/**
 * Unified opening card experience across all themes:
 * 1. Starts directly on the first frame of the theme's video with only the
 *    bride & groom names in simple dark-brown/goldenish calligraphy and "Tap to open".
 * 2. On tap, primes audio silently inside the user gesture and plays the opening
 *    video smoothly with a gentle zoom-in.
 * 3. Freezes/pauses on the last frame at the end of the video, immediately triggers
 *    a sudden fade + pop-up reveal of the hero text in simple dark brown &
 *    goldenish calligraphy, and starts the music after the transition.
 * 4. Keeps the last frame stopped behind the hero initially, and triggers any
 *    configured follow-up hero video smoothly 2.5 seconds after the card text
 *    pops up.
 */
export function NoorArchExperience({
  groomName,
  brideName,
  theme = "eid",
  coverImage,
  stillImage,
  videoSrc,
  heroVideoSrc,
  heroDelayMs = 2500,
  scenes = [],
  onPrime,
  onOpen,
  onDone,
  children,
}: {
  groomName?: string;
  brideName?: string;
  theme?: InvitationTheme;
  coverImage?: string;
  stillImage?: string;
  videoSrc?: string;
  /** Optional dedicated hero video played ~2.5s after card text reveal. */
  heroVideoSrc?: string;
  heroDelayMs?: number;
  scenes?: NoorScene[];
  /** Called synchronously inside the tap gesture so browsers unlock media cleanly. */
  onPrime?: (withMusic?: boolean) => void;
  /** Called right after the opening video transition completes. */
  onOpen?: (withMusic?: boolean) => void;
  onDone?: () => void;
  children?: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const heroVideoRef = useRef<HTMLVideoElement>(null);
  const finishedRef = useRef(false);
  const loopTimerRef = useRef<number | null>(null);
  const [phase, setPhase] = useState<"closed" | "playing" | "done">("closed");
  const [overlayCleared, setOverlayCleared] = useState(false);
  const [heroVideoLive, setHeroVideoLive] = useState(false);
  const [videoFallback, setVideoFallback] = useState(false);
  const [posterFallback, setPosterFallback] = useState(false);

  const openingVideo = openingVideoForTheme(theme);
  const isFiniteOpening = Boolean(videoSrc) || (openingVideo.finiteOpening && !videoFallback);
  const resolvedCover =
    coverImage ?? (theme === "eid" && posterFallback ? eidSky : openingCoverForTheme(theme));
  const resolvedStill =
    stillImage ?? (theme === "eid" && posterFallback ? eidSky : openingStillForTheme(theme));
  const resolvedVideoSrc = videoFallback ? openingVideo.fallback : (videoSrc ?? openingVideo.src);
  const resolvedHeroVideo = heroVideoSrc ?? heroVideoForTheme(theme);

  const finish = useCallback(() => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    if (loopTimerRef.current !== null && typeof window !== "undefined") {
      window.clearTimeout(loopTimerRef.current);
      loopTimerRef.current = null;
    }
    const v = videoRef.current;
    if (v) {
      try {
        v.pause();
      } catch {
        // Ignore media stubs without pause.
      }
    }
    setPhase("done");
    onOpen?.(true);
    onDone?.();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("wedding:revealed"));
    }
  }, [onDone, onOpen]);

  const revealed = phase === "done";

  useEffect(() => {
    if (revealed || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [revealed]);

  useEffect(() => {
    if (!revealed || overlayCleared) return;
    const timer = window.setTimeout(() => setOverlayCleared(true), 260);
    return () => window.clearTimeout(timer);
  }, [revealed, overlayCleared]);

  useEffect(() => {
    if (phase !== "playing") return;
    const safetyTimer = window.setTimeout(() => finish(), 15_000);
    return () => window.clearTimeout(safetyTimer);
  }, [phase, finish]);

  // Trigger optional follow-up hero video ~2.5s after the card text pops up.
  useEffect(() => {
    if (!revealed || !resolvedHeroVideo) return;
    const timer = window.setTimeout(() => {
      const hv = heroVideoRef.current;
      if (hv) {
        try {
          const playAttempt = hv.play();
          if (playAttempt && typeof playAttempt.catch === "function") {
            playAttempt.catch(() => undefined);
          }
        } catch {
          // Keep stopped final frame if playback is blocked.
        }
      }
      setHeroVideoLive(true);
      window.dispatchEvent(new Event("wedding:hero-video-start"));
    }, heroDelayMs);
    return () => window.clearTimeout(timer);
  }, [revealed, resolvedHeroVideo, heroDelayMs]);

  useEffect(() => {
    return () => {
      if (loopTimerRef.current !== null && typeof window !== "undefined") {
        window.clearTimeout(loopTimerRef.current);
      }
    };
  }, []);

  const open = () => {
    if (phase !== "closed") return;
    // Unlock audio/media cleanly inside the user gesture before delayed playback.
    onPrime?.(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("wedding:prime-music"));
    }

    const v = videoRef.current;
    if (
      !v ||
      (typeof window !== "undefined" &&
        window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
    ) {
      finish();
      return;
    }

    setPhase("playing");
    try {
      v.currentTime = 0;
    } catch {
      // Ignore unseekable stream / test stubs.
    }

    if (!isFiniteOpening && typeof window !== "undefined") {
      loopTimerRef.current = window.setTimeout(() => finish(), 2600);
    }

    try {
      const started = v.play();
      if (started && typeof started.catch === "function") {
        started.catch(() => finish());
      } else {
        // Environments without a real media decoder (e.g. jsdom).
        finish();
      }
    } catch {
      finish();
    }
  };

  const hasCouple = Boolean(groomName && brideName);
  const darkSurface = isDarkOpeningTheme(theme);

  return (
    <OpeningPhaseContext.Provider
      value={{
        revealed,
        gated: true,
        heroVideoLive,
      }}
    >
      <div className="relative min-h-svh" data-opening-theme={theme}>
        {(!revealed || !overlayCleared) && (
          <div
            role={revealed ? undefined : "dialog"}
            aria-modal={revealed ? undefined : "true"}
            aria-labelledby={!revealed && hasCouple ? "gate-title" : undefined}
            aria-label={!revealed && !hasCouple ? "Wedding invitation entrance" : undefined}
            aria-hidden={revealed ? "true" : undefined}
            onClick={phase === "closed" ? open : undefined}
            onKeyDown={(event) => {
              if (phase === "playing" && event.key === "Escape") finish();
            }}
            className={`noor-gate-overlay fixed inset-0 z-[100] overflow-hidden bg-[#f9f3e7] transition-opacity duration-300 ${
              revealed ? "pointer-events-none opacity-0" : "opacity-100"
            }`}
          >
            <div
              className={`noor-gate-zoom absolute inset-0 ${
                phase === "playing" || phase === "done" ? "is-zooming" : ""
              }`}
            >
              <img
                src={resolvedStill}
                alt=""
                aria-hidden="true"
                onError={() => {
                  if (theme === "eid") setPosterFallback(true);
                }}
                className="absolute inset-0 h-full w-full object-cover"
              />
              <video
                ref={videoRef}
                src={resolvedVideoSrc}
                poster={resolvedCover}
                muted
                playsInline
                preload="auto"
                onEnded={(e) => {
                  e.currentTarget.pause();
                  finish();
                }}
                onError={() => {
                  if (!videoFallback && resolvedVideoSrc !== openingVideo.fallback) {
                    setVideoFallback(true);
                  } else if (phase === "playing") {
                    finish();
                  }
                }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>

            <div
              aria-hidden="true"
              className={`noor-start-scrim pointer-events-none absolute inset-0 transition-opacity duration-300 ${
                phase === "closed" ? "opacity-100" : "opacity-0"
              }`}
            />

            {phase === "closed" && (
              <div className="relative z-10 flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center">
                <div
                  className={`card-calligraphy-plate noor-start-card ${
                    darkSurface ? "is-dark-art" : "is-light-art"
                  }`}
                >
                  {hasCouple && (
                    <h1 id="gate-title" className="card-calligraphy-names">
                      <span className="card-calligraphy-name">{groomName}</span>
                      <span className="card-calligraphy-amp" aria-hidden="true">
                        &amp;
                      </span>
                      <span className="card-calligraphy-name">{brideName}</span>
                    </h1>
                  )}
                  <span className="card-calligraphy-rule" aria-hidden="true" />
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      open();
                    }}
                    className="noor-tap-open mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-8 py-3 text-sm tracking-[0.18em] uppercase transition hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b07f24]"
                  >
                    Tap to open
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {revealed && scenes.length > 0 ? (
          <div className="relative z-10">
            <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
              <img
                src={resolvedStill}
                alt=""
                onError={() => {
                  if (theme === "eid") setPosterFallback(true);
                }}
                className="noor-gate-zoom is-zooming absolute inset-0 h-full w-full object-cover"
              />
              {resolvedHeroVideo && (
                <video
                  ref={heroVideoRef}
                  src={resolvedHeroVideo}
                  muted
                  loop
                  playsInline
                  preload="auto"
                  className={`theme-loop absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                    heroVideoLive ? "opacity-100" : "opacity-0"
                  }`}
                />
              )}
            </div>
            {scenes.map((s, i) => (
              <section
                key={i}
                className="flex min-h-svh items-center justify-center px-6 pb-16 pt-[24svh]"
              >
                <motion.div
                  initial={{ opacity: 0, y: 28, scale: 0.92 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ amount: 0.45, once: true }}
                  transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
                  className="card-calligraphy-plate is-light-art max-w-md text-center"
                >
                  {s.kicker && (
                    <p className="card-calligraphy-kicker mb-2 text-xs uppercase tracking-[0.26em]">
                      {s.kicker}
                    </p>
                  )}
                  <h2 className="card-calligraphy-names text-4xl leading-tight sm:text-5xl">
                    {s.title}
                  </h2>
                  {s.body && (
                    <p className="card-calligraphy-body mt-4 text-base leading-relaxed">{s.body}</p>
                  )}
                </motion.div>
              </section>
            ))}
            {children && <div className="relative">{children}</div>}
          </div>
        ) : (
          children
        )}
      </div>
    </OpeningPhaseContext.Provider>
  );
}
