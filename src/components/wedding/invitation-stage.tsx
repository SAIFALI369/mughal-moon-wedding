import { type PointerEvent, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import { heroVideoForTheme } from "./invitation-art";
import { isDarkOpeningTheme, useOpeningPhase } from "./noor-arch-gate";
import { FullArtFrame, LivingScene } from "./invitation-rite";

export function CouplePortraits({
  details,
  compact = false,
}: {
  details: InvitationDetails;
  compact?: boolean;
}) {
  if (!details.elements.portraits || (!details.groomPhoto && !details.bridePhoto)) return null;
  return (
    <div className={`invite-portraits ${compact ? "invite-portraits-compact" : ""}`}>
      {details.groomPhoto && (
        <figure>
          <img src={details.groomPhoto} alt={`Portrait of ${details.groomName}`} loading="lazy" />
          {!compact && <figcaption>{details.groomName}</figcaption>}
        </figure>
      )}
      {details.bridePhoto && (
        <figure>
          <img src={details.bridePhoto} alt={`Portrait of ${details.brideName}`} loading="lazy" />
          {!compact && <figcaption>{details.brideName}</figcaption>}
        </figure>
      )}
    </div>
  );
}

/** Shared stage layout stabilized across frameworks with simple dark-brown & gold calligraphy. */
export function InvitationStage({
  details,
  backgroundImage,
  scrollTo,
}: {
  details: InvitationDetails;
  backgroundImage: string;
  actions: ReactNode;
  scrollTo: string;
  entranceDelay: number;
}) {
  const reduced = useReducedMotion();
  const { revealed, gated, heroVideoLive } = useOpeningPhase();
  const followUp = heroVideoForTheme(details.theme);
  const allowMotion = !gated || (heroVideoLive && Boolean(followUp));
  const copyVisible = !gated || revealed;
  const darkSurface = isDarkOpeningTheme(details.theme);

  function move(event: PointerEvent<HTMLElement>) {
    if (
      details.framework !== "cinematic-stage" ||
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--stage-x",
      `${((event.clientX - box.left) / box.width - 0.5) * 12}deg`,
    );
    event.currentTarget.style.setProperty(
      "--stage-y",
      `${((event.clientY - box.top) / box.height - 0.5) * -10}deg`,
    );
  }

  function reset(event: PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty("--stage-x", "0deg");
    event.currentTarget.style.setProperty("--stage-y", "0deg");
  }

  return (
    <section
      id="invitation-top"
      aria-label="Wedding invitation"
      className="invitation-stage relative isolate flex min-h-[100svh] items-center justify-center overflow-hidden px-6 py-24 text-foreground"
      onPointerMove={move}
      onPointerLeave={reset}
    >
      <div className="stage-background hero-media-lock absolute inset-0 -z-30 h-full w-full">
        {gated && followUp ? (
          <>
            <FullArtFrame src={backgroundImage} theme={details.theme} priority motion={false} />
            {heroVideoLive && !reduced && (
              <video
                src={followUp}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                className="theme-loop full-art-video absolute inset-0 h-full w-full object-cover"
              />
            )}
          </>
        ) : (
          <FullArtFrame src={backgroundImage} theme={details.theme} priority motion={allowMotion} />
        )}
      </div>
      <div className="stage-shade absolute inset-0 -z-20" aria-hidden="true" />
      <LivingScene theme={details.theme} variant="stage" />
      <div
        className="stage-frame pointer-events-none absolute inset-6 border border-gold/50"
        aria-hidden="true"
      />

      <motion.div
        initial={gated && !reduced ? { opacity: 0, y: 28, scale: 0.92 } : false}
        animate={copyVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 28, scale: 0.92 }}
        transition={reduced ? { duration: 0 } : { duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        className="stage-content relative z-10 mx-auto w-full max-w-4xl"
      >
        <div
          className={`stage-copy card-calligraphy-plate mx-auto ${
            darkSurface ? "is-dark-art" : "is-light-art"
          }`}
        >
          <h1 className="stage-names card-calligraphy-names">
            <span className="stage-name card-calligraphy-name break-words">
              {details.groomName}
            </span>
            <span className="stage-amp card-calligraphy-amp" aria-hidden="true">
              &amp;
            </span>
            <span className="stage-name card-calligraphy-name break-words">
              {details.brideName}
            </span>
          </h1>
          {(details.date || details.time) && (
            <>
              <span className="card-calligraphy-rule" aria-hidden="true" />
              <p className="stage-date card-calligraphy-date mt-4">
                {[details.date, details.time].filter(Boolean).join(" · ")}
              </p>
            </>
          )}
        </div>
      </motion.div>
      <a
        href={scrollTo}
        className="stage-scroll card-scroll-cue absolute bottom-7 left-1/2 z-10 -translate-x-1/2 text-center text-[10px] uppercase tracking-[0.3em]"
      >
        Explore <ChevronDown className="mx-auto mt-1 h-5 w-5" aria-hidden="true" />
      </a>
    </section>
  );
}
