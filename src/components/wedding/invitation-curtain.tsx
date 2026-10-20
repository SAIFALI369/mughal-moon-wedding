import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import { CouplePortraits } from "./invitation-stage";

/**
 * Grand Curtain — the "walk into the film" hero.
 *
 * The section is taller than the viewport and its stage is sticky, so a scroll
 * gesture reads as one continuous camera move: the velvet curtains swing apart
 * in 3D, the scene behind them pushes forward, and the names drift through the
 * proscenium. Everything is CSS transform/opacity, so it stays smooth on a
 * phone and needs no video file. Reduced-motion visitors get a still frame.
 */
export function CurtainStage({
  details,
  backgroundImage,
  actions,
  scrollTo,
  entranceDelay,
}: {
  details: InvitationDetails;
  backgroundImage: string;
  actions: ReactNode;
  scrollTo: string;
  entranceDelay: number;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  // 0.5 = draped open far enough to frame the names, 1 = flown off stage.
  const open = useTransform(scrollYProgress, [0, 0.78], [0.5, 1]);
  const leftRotate = useTransform(open, [0.5, 1], ["-38deg", "-104deg"]);
  const rightRotate = useTransform(open, [0.5, 1], ["38deg", "104deg"]);
  const leftX = useTransform(open, [0.5, 1], ["-14%", "-74%"]);
  const rightX = useTransform(open, [0.5, 1], ["14%", "74%"]);
  const panelFade = useTransform(open, [0.86, 1], [1, 0.12]);

  // The camera move: the scene grows and lifts as the guest scrolls in.
  const sceneScale = useTransform(scrollYProgress, [0, 1], [1.04, 1.5]);
  const sceneY = useTransform(scrollYProgress, [0, 1], ["0%", "7%"]);

  // Names sit in the window, then fly past the camera at the end of the move.
  const copyScale = useTransform(scrollYProgress, [0, 0.7, 1], [1, 1, 1.22]);
  const copyOpacity = useTransform(scrollYProgress, [0, 0.16, 0.78, 0.98], [0, 1, 1, 0]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -46]);

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
        <motion.div
          className="curtain-scene"
          style={reduced ? undefined : { scale: sceneScale, y: sceneY }}
        >
          <img
            src={backgroundImage}
            alt=""
            aria-hidden="true"
            className="curtain-scene-art"
            fetchPriority="high"
          />
          <div className="curtain-scene-glow" aria-hidden="true" />
          <div className="curtain-rays" aria-hidden="true" />
          <div className="curtain-motes" aria-hidden="true" />
        </motion.div>

        <div className="curtain-proscenium" aria-hidden="true">
          <span className="curtain-arch" />
          <span className="curtain-column curtain-column-left" />
          <span className="curtain-column curtain-column-right" />
        </div>

        <motion.div
          className="curtain-copy"
          initial={reduced ? undefined : { opacity: 0, y: 26 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 1.1, delay: entranceDelay }}
          style={reduced ? undefined : { scale: copyScale, opacity: copyOpacity, y: copyY }}
        >
          <div className="stage-copy">
            <p className="stage-kicker text-xs font-medium uppercase tracking-[0.36em] text-gold">
              <Sparkles aria-hidden="true" className="mr-2 inline h-4 w-4" />
              {details.hosts || "Together with their families"}
            </p>
            <p className="stage-overline mt-5 font-serif text-lg italic text-foreground">
              A storybook celebration
            </p>
            <h1 className="stage-names mt-6 font-serif font-medium leading-[0.95]">
              <span className="stage-name break-words">{details.groomName}</span>
              <span className="stage-amp text-gold-shimmer font-script font-normal">&amp;</span>
              <span className="stage-name break-words">{details.brideName}</span>
            </h1>
            <p className="stage-date mt-8 font-serif text-2xl italic text-foreground sm:text-3xl">
              {details.date}
              {details.time ? ` · ${details.time}` : ""}
            </p>
            <p className="stage-location mt-3 text-xs uppercase tracking-[0.22em] text-gold">
              {details.venue}
            </p>
            <CouplePortraits details={details} />
            <div className="stage-actions mt-9 flex flex-wrap justify-center gap-3">{actions}</div>
          </div>
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

        <a href={scrollTo} className="curtain-scroll">
          <span>Enter the celebration</span>
          <ChevronDown className="mx-auto mt-1 h-5 w-5" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
