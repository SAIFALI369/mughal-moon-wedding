import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import eidSky from "@/assets/eid-sky.webp";
import gateVideo from "@/assets/noor-arch-gate.mp4.asset.json";
import finalFrame from "@/assets/noor-arch-final.jpg.asset.json";
import coverFrame from "@/assets/noor-arch-cover.jpg.asset.json";

export const noorArchStill = finalFrame.url;
export const noorArchCover = coverFrame.url;

export type NoorScene = { kicker: string; title: string; body?: string };

/**
 * Eid Light's opening: a sealed entrance door that plays the Noor Arch video
 * when opened, keeps `{children}` mounted underneath so audio autoplay fires
 * synchronously on tap, and transitions cleanly into the invitation hero.
 */
export function NoorArchExperience({
  groomName,
  brideName,
  hosts = "Together with their families",
  dateLine,
  scenes = [],
  enableQuiet = false,
  onOpen,
  onDone,
  children,
}: {
  groomName?: string;
  brideName?: string;
  hosts?: string;
  dateLine?: string;
  scenes?: NoorScene[];
  enableQuiet?: boolean;
  onOpen?: (withMusic?: boolean) => void;
  onDone?: () => void;
  children?: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"closed" | "playing" | "done">("closed");
  const [videoFallback, setVideoFallback] = useState(false);
  const [posterFallback, setPosterFallback] = useState(false);

  const finish = useCallback(() => {
    setPhase((prev) => {
      if (prev === "done") return prev;
      return "done";
    });
  }, []);

  const revealed = phase === "done";

  useEffect(() => {
    if (!revealed) return;
    onDone?.();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("wedding:revealed"));
    }
  }, [revealed, onDone]);

  useEffect(() => {
    if (revealed || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [revealed]);

  useEffect(() => {
    if (phase !== "playing") return;
    const timer = window.setTimeout(() => finish(), 15_000);
    return () => window.clearTimeout(timer);
  }, [phase, finish]);

  const open = (withMusic = true) => {
    if (phase !== "closed") return;
    onOpen?.(withMusic);
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
      const started = v.play();
      if (started && typeof started.catch === "function") {
        started.catch(() => finish());
      } else {
        // In environments without a real media decoder (e.g. jsdom), finish cleanly.
        finish();
      }
    } catch {
      finish();
    }
  };

  const hasCouple = Boolean(groomName && brideName);
  const videoSrc = videoFallback ? "/film/eid.mp4" : gateVideo.url;
  const posterSrc = posterFallback ? eidSky : coverFrame.url;

  return (
    <div className="relative min-h-svh">
      {!revealed && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={hasCouple ? "gate-title" : undefined}
          aria-label={!hasCouple ? "Wedding invitation entrance" : undefined}
          className="fixed inset-0 z-[100] overflow-hidden bg-[#140e0a]"
        >
          <img
            src={posterFallback ? eidSky : finalFrame.url}
            alt=""
            onError={() => setPosterFallback(true)}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <video
            ref={videoRef}
            src={videoSrc}
            poster={posterSrc}
            muted
            playsInline
            preload="auto"
            onEnded={(e) => {
              e.currentTarget.pause();
              finish();
            }}
            onError={() => {
              if (!videoFallback) {
                setVideoFallback(true);
              } else if (phase === "playing") {
                finish();
              }
            }}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-black/45 transition-opacity duration-500 ${
              phase === "playing" ? "opacity-0" : "opacity-100"
            }`}
          />

          {phase === "closed" && (
            <div className="relative z-10 flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center text-[#fbf6ec]">
              <p dir="rtl" className="font-arabic text-2xl text-[#ecd399] sm:text-3xl">
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </p>
              <p className="mt-5 text-[10px] uppercase tracking-[0.35em] text-[#e8c67d] sm:tracking-[0.5em]">
                {hosts}
              </p>
              {hasCouple && (
                <h1
                  id="gate-title"
                  className="mt-5 flex max-w-full flex-col items-center gap-2 font-serif text-[clamp(2.75rem,6vw,6rem)] font-medium text-[#fff9ee] drop-shadow lg:flex-row lg:gap-6"
                >
                  <span className="max-w-full break-words lg:max-w-[38vw]">{groomName}</span>
                  <span className="text-gold-shimmer shrink-0 font-script text-5xl font-normal sm:text-6xl">
                    weds
                  </span>
                  <span className="max-w-full break-words lg:max-w-[38vw]">{brideName}</span>
                </h1>
              )}
              {dateLine && (
                <p className="mt-4 max-w-xl text-[10px] uppercase tracking-[0.25em] text-[#ecd399]">
                  {dateLine}
                </p>
              )}
              <button
                type="button"
                onClick={() => open(true)}
                className="btn-shimmer bg-gold-gradient mt-8 inline-flex min-h-12 items-center gap-3 rounded-full px-8 py-3 text-xs font-medium uppercase tracking-[0.2em] text-burgundy-deep shadow-gold transition hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
              >
                <Sparkles className="h-4 w-4" aria-hidden="true" /> Open the gates
              </button>
              {enableQuiet && (
                <button
                  type="button"
                  onClick={() => open(false)}
                  className="mt-3 min-h-10 px-4 text-xs text-[#fbf6ec]/90 underline decoration-[#ecd399]/60 underline-offset-4 transition hover:text-[#ecd399]"
                >
                  Enter quietly
                </button>
              )}
            </div>
          )}

          {phase === "playing" && (
            <button
              type="button"
              onClick={finish}
              className="fixed bottom-6 right-6 z-20 rounded-full border border-[#ecd399]/50 bg-black/50 px-4 py-2 text-[11px] uppercase tracking-[0.18em] text-[#fbf6ec] backdrop-blur transition hover:bg-black/70"
            >
              Skip
            </button>
          )}
        </div>
      )}

      {revealed && scenes.length > 0 ? (
        <div className="relative z-10">
          <div className="fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
            <img
              src={posterFallback ? eidSky : finalFrame.url}
              alt=""
              onError={() => setPosterFallback(true)}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          {scenes.map((s, i) => (
            <section
              key={i}
              className="flex min-h-svh items-center justify-center px-10 pb-16 pt-[30svh]"
            >
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.6 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="max-w-xs text-center"
              >
                <p className="mb-3 font-serif text-base text-[color:var(--gold)]">{s.kicker}</p>
                <h2 className="font-serif text-4xl leading-tight text-primary sm:text-5xl">
                  {s.title}
                </h2>
                {s.body && (
                  <p className="mt-4 text-sm leading-relaxed text-foreground/80">{s.body}</p>
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
  );
}
