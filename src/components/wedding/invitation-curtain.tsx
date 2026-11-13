import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import { heroVideoForTheme } from "./invitation-art";
import { isDarkOpeningTheme, useOpeningPhase } from "./noor-arch-gate";
import { FullArtFrame } from "./invitation-rite";

/**
 * Grand Curtain — the "walk into the film" hero, stabilized against background jitter
 * and styled cleanly in simple dark-brown and goldenish calligraphy.
 */
export function CurtainStage({
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
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { revealed, gated, heroVideoLive } = useOpeningPhase();
  const followUp = heroVideoForTheme(details.theme);
  const allowMotion = !gated || (heroVideoLive && Boolean(followUp));
  const copyVisible = !gated || revealed;
  const darkSurface = isDarkOpeningTheme(details.theme);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  const open = useTransform(scrollYProgress, [0, 0.78], [0.5, 1]);
  const leftRotate = useTransform(open, [0.5, 1], ["-38deg", "-104deg"]);
  const rightRotate = useTransform(open, [0.5, 1], ["38deg", "104deg"]);
  const leftX = useTransform(open, [0.5, 1], ["-14%", "-74%"]);
  const rightX = useTransform(open, [0.5, 1], ["14%", "74%"]);
  const panelFade = useTransform(open, [0.86, 1], [1, 0.12]);

  const copyOpacity = useTransform(scrollYProgress, [0, 0.78, 0.98], [1, 1, 0]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -32]);

  const curtainStyle = reduced ? undefined : { rotateY: leftRotate, x: leftX, opacity: panelFade };
  const curtainRightStyle = reduced
    ? undefined
    : { rotateY: rightRotate, x: rightX, opacity: panelFade };

  return (
    <section
      ref={ref}
      id="invitation-top"
      aria-label="Wedding invitation"
      className="curtain-stage"
      data-reduced={reduced ? "true" : undefined}
      data-theme={details.theme}
    >
      <div className="curtain-sticky">
        <div className="curtain-scene hero-media-lock">
          {gated && followUp ? (
            <>
              <FullArtFrame
                src={backgroundImage}
                theme={details.theme}
                className="curtain-scene-art"
                priority
                motion={false}
              />
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
            <FullArtFrame
              src={backgroundImage}
              theme={details.theme}
              className="curtain-scene-art"
              priority
              motion={allowMotion}
            />
          )}
          <div className="curtain-scene-glow" aria-hidden="true" />
          <div className="curtain-rays" aria-hidden="true" />
        </div>

        <div className="curtain-proscenium" aria-hidden="true">
          <span className="curtain-arch" />
          <span className="curtain-column curtain-column-left" />
          <span className="curtain-column curtain-column-right" />
        </div>

        <motion.div
          className="curtain-copy"
          style={reduced ? undefined : { opacity: copyOpacity, y: copyY }}
        >
          <motion.div
            initial={gated && !reduced ? { opacity: 0, y: 28, scale: 0.92 } : false}
            animate={
              copyVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 28, scale: 0.92 }
            }
            transition={reduced ? { duration: 0 } : { duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
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
          </motion.div>
        </motion.div>

        <motion.div
          className="curtain-panel curtain-panel-left"
          aria-hidden="true"
          style={curtainStyle}
        >
          <span className="curtain-edge" />
        </motion.div>
        <motion.div
          className="curtain-panel curtain-panel-right"
          aria-hidden="true"
          style={curtainRightStyle}
        >
          <span className="curtain-edge" />
        </motion.div>

        <div className="curtain-valance" aria-hidden="true" />

        <a href={scrollTo} className="curtain-scroll card-scroll-cue">
          <span>Scroll</span>
          <ChevronDown className="mx-auto mt-1 h-5 w-5" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
