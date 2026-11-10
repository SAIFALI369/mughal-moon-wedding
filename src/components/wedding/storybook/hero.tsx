import { useEffect, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { InvitationDetails } from "../invitation-details";
import { heroVideoForTheme, invitationArt } from "../invitation-art";
import { isDarkOpeningTheme } from "../noor-arch-gate";
import { ThemeLoop } from "../theme-loop";

export function StorybookHero({
  details,
  motion: allowMotion = true,
  waitingForGate = false,
}: {
  details: InvitationDetails;
  actions?: ReactNode;
  /** False keeps the framed photograph a still, as the host asked. */
  motion?: boolean;
  waitingForGate?: boolean;
}) {
  const reduced = useReducedMotion();
  const [revealed, setRevealed] = useState(!waitingForGate);
  const [heroVideoReady, setHeroVideoReady] = useState(false);
  const darkSurface = isDarkOpeningTheme(details.theme);
  const followUp = heroVideoForTheme(details.theme);

  useEffect(() => {
    if (!waitingForGate) {
      setRevealed(true);
      return;
    }
    const reveal = () => setRevealed(true);
    window.addEventListener("storybook:opened", reveal);
    window.addEventListener("wedding:revealed", reveal);
    return () => {
      window.removeEventListener("storybook:opened", reveal);
      window.removeEventListener("wedding:revealed", reveal);
    };
  }, [waitingForGate]);

  useEffect(() => {
    if (!revealed || !followUp) return;
    const timer = window.setTimeout(() => setHeroVideoReady(true), 2500);
    return () => window.clearTimeout(timer);
  }, [revealed, followUp]);

  return (
    <section id="invitation-top" tabIndex={-1} className="sb-hero">
      <div className="sb-hero-visual hero-media-lock">
        <div className="sb-hero-frame">
          <img
            src={invitationArt[details.theme]}
            alt=""
            fetchPriority="high"
            className="sb-hero-art"
          />
          {followUp && heroVideoReady && allowMotion ? (
            <video src={followUp} autoPlay muted loop playsInline className="sb-hero-video" />
          ) : (
            <ThemeLoop
              theme={details.theme}
              className="sb-hero-video"
              priority
              enabled={allowMotion && !waitingForGate}
            />
          )}
        </div>
      </div>
      <motion.div
        initial={waitingForGate && !reduced ? { opacity: 0, y: 28, scale: 0.92 } : false}
        animate={revealed ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 28, scale: 0.92 }}
        transition={reduced ? { duration: 0 } : { duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        className={`sb-hero-copy card-calligraphy-plate ${
          darkSurface ? "is-dark-art" : "is-light-art"
        }`}
      >
        <h1 className="card-calligraphy-names">
          <span className="card-calligraphy-name">{details.groomName}</span>
          <span className="card-calligraphy-amp" aria-hidden="true">
            &amp;
          </span>
          <span className="card-calligraphy-name">{details.brideName}</span>
        </h1>
        {(details.date || details.time) && (
          <>
            <span className="card-calligraphy-rule" aria-hidden="true" />
            <p className="card-calligraphy-date mt-4">
              {[details.date, details.time].filter(Boolean).join(" · ")}
            </p>
          </>
        )}
      </motion.div>
    </section>
  );
}
