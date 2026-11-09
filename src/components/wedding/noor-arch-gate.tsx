import { useRef, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import gateVideo from "@/assets/noor-arch-gate.mp4.asset.json";
import finalFrame from "@/assets/noor-arch-final.jpg.asset.json";
import coverFrame from "@/assets/noor-arch-cover.jpg.asset.json";

export const noorArchStill = finalFrame.url;
export const noorArchCover = coverFrame.url;

export type NoorScene = { kicker: string; title: string; body?: string };

/**
 * Eid Light's opening: a sealed box that plays the gate video once on tap,
 * freezes on the lantern archway, and keeps it as a fixed background while
 * only the text scrolls. `children` continue below (RSVP and the rest).
 */
export function NoorArchExperience({
  scenes,
  onOpen,
  children,
}: {
  scenes: NoorScene[];
  onOpen?: () => void;
  children?: ReactNode;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [phase, setPhase] = useState<"closed" | "playing" | "done">("closed");

  const open = () => {
    const v = videoRef.current;
    if (phase !== "closed") return;
    onOpen?.();
    if (!v || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return setPhase("done");
    setPhase("playing");
    v.play().catch(() => setPhase("done"));
  };

  const revealed = phase === "done";

  return (
    <div className="relative min-h-svh">
      <div className="fixed inset-0 z-0 overflow-hidden" aria-hidden>
        <img src={finalFrame.url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <video
          ref={videoRef}
          src={gateVideo.url}
          poster={coverFrame.url}
          muted
          playsInline
          preload="auto"
          onEnded={(e) => {
            e.currentTarget.pause();
            setPhase("done");
          }}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${revealed ? "opacity-0" : "opacity-100"}`}
        />
      </div>

      {phase === "closed" && (
        <button
          type="button"
          onClick={open}
          className="fixed inset-0 z-50 flex items-end justify-center pb-[12svh]"
          aria-label="Open the invitation"
        >
          <span className="animate-pulse rounded-full border border-[color:var(--gold)] bg-background/80 px-7 py-3 font-serif text-lg tracking-wide text-primary shadow-lg backdrop-blur">
            Tap to open the invitation
          </span>
        </button>
      )}

      {phase === "playing" && <div className="fixed inset-0 z-50" aria-hidden />}

      {revealed && (
        <div className="relative z-10">
          {scenes.map((s, i) => (
            <section key={i} className="flex min-h-svh items-center justify-center px-10 pb-16 pt-[30svh]">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ amount: 0.6 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="max-w-xs text-center"
              >
                <p className="mb-3 font-serif text-base text-[color:var(--gold)]">{s.kicker}</p>
                <h2 className="font-serif text-4xl leading-tight text-primary sm:text-5xl">{s.title}</h2>
                {s.body && <p className="mt-4 text-sm leading-relaxed text-foreground/80">{s.body}</p>}
              </motion.div>
            </section>
          ))}
          {children && <div className="relative">{children}</div>}
        </div>
      )}
    </div>
  );
}
