import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Film, RotateCcw } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import { invitationFilmArt } from "./invitation-art";
import { CouplePortraits } from "./invitation-stage";
import { filmActs, filmStory } from "./invitation-film";

/**
 * The invitation as a film, continued.
 *
 * The opening plays by itself; this stage is the same picture scrubbed by the
 * guest's thumb. Scrolling becomes the camera: the palace dissolves into the
 * arch, the arch into the courtyard, the letterbox closes in, and the names
 * arrive in the middle of the move. Reduced-motion guests get one still frame
 * with the same words.
 */
export function ReelStage({
  details,
  actions,
  scrollTo,
  onReplay,
  replayLabel = "Replay the film",
}: {
  details: InvitationDetails;
  backgroundImage?: string;
  actions: ReactNode;
  scrollTo: string;
  entranceDelay?: number;
  /** Opens the film again; the poster is the gate, this is the encore. */
  onReplay?: () => void;
  replayLabel?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const story = filmStory(details);
  const acts = filmActs(details);

  // Each shot holds the frame, then dissolves into the next one.
  const palaceOpacity = useTransform(scrollYProgress, [0, 0.24, 0.38], [1, 1, 0]);
  const archOpacity = useTransform(scrollYProgress, [0.3, 0.44, 0.6, 0.7], [0, 1, 1, 0]);
  const courtyardOpacity = useTransform(scrollYProgress, [0.62, 0.76, 1], [0, 1, 1]);

  const palaceScale = useTransform(scrollYProgress, [0, 0.4], [1.02, 1.16]);
  const archScale = useTransform(scrollYProgress, [0.26, 0.74], [1.04, 1.16]);
  const courtyardScale = useTransform(scrollYProgress, [0.58, 1], [1.04, 1.15]);

  // Copy arrives on the second shot and lifts away as the guest leaves the stage.
  const copyOpacity = useTransform(scrollYProgress, [0.08, 0.2, 0.84, 0.97], [0, 1, 1, 0.12]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -48]);
  const barHeight = useTransform(
    scrollYProgress,
    [0, 0.18, 0.86, 1],
    ["7svh", "0svh", "0svh", "4svh"],
  );
  const actOneOpacity = useTransform(scrollYProgress, [0, 0.3, 0.4], [1, 1, 0.28]);
  const actTwoOpacity = useTransform(scrollYProgress, [0.3, 0.42, 0.62, 0.72], [0.28, 1, 1, 0.28]);
  const actThreeOpacity = useTransform(scrollYProgress, [0.62, 0.74, 1], [0.28, 1, 1]);

  const still = (index: 0 | 1 | 2) => invitationFilmArt[story.shots[index].id];

  return (
    <section
      ref={ref}
      id="invitation-top"
      aria-label="Wedding invitation"
      className="reel-stage"
      data-theme={details.theme}
      data-reduced={reduced ? "true" : undefined}
    >
      <div className="reel-sticky">
        <motion.div
          className="reel-frames"
          style={reduced ? undefined : { opacity: palaceOpacity }}
        >
          <motion.img
            src={still(0)}
            alt=""
            aria-hidden="true"
            className="reel-frame"
            style={reduced ? undefined : { scale: palaceScale }}
            fetchPriority="high"
          />
        </motion.div>
        <motion.div className="reel-frames" style={reduced ? undefined : { opacity: archOpacity }}>
          <motion.img
            src={still(1)}
            alt=""
            aria-hidden="true"
            className="reel-frame"
            style={reduced ? undefined : { scale: archScale }}
          />
        </motion.div>
        <motion.div
          className="reel-frames"
          style={reduced ? undefined : { opacity: courtyardOpacity }}
        >
          <motion.img
            src={still(2)}
            alt=""
            aria-hidden="true"
            className="reel-frame"
            style={reduced ? undefined : { scale: courtyardScale }}
          />
        </motion.div>

        <div className="reel-grade" aria-hidden="true" />
        <div className="reel-grain" aria-hidden="true" />
        <motion.span
          className="reel-bar reel-bar-top"
          aria-hidden="true"
          style={reduced ? undefined : { height: barHeight }}
        />
        <motion.span
          className="reel-bar reel-bar-bottom"
          aria-hidden="true"
          style={reduced ? undefined : { height: barHeight }}
        />

        <motion.div
          className="reel-copy"
          style={reduced ? undefined : { opacity: copyOpacity, y: copyY }}
        >
          <p className="reel-kicker">{details.hosts || "Together with their families"}</p>
          <p className="reel-act-line">
            <Film className="h-3.5 w-3.5" aria-hidden="true" /> Now showing
          </p>
          <h1 className="reel-names">
            <span>{details.groomName}</span>
            <span className="reel-amp">&amp;</span>
            <span>{details.brideName}</span>
          </h1>
          <p className="reel-date">{[details.date, details.time].filter(Boolean).join(" · ")}</p>
          <p className="reel-venue">
            {[details.venue, details.address].filter(Boolean).join(" · ")}
          </p>
          <CouplePortraits details={details} />
          <div className="reel-actions">
            {actions}
            {onReplay && (
              <button type="button" className="reel-replay" onClick={onReplay}>
                <RotateCcw className="h-4 w-4" aria-hidden="true" /> {replayLabel}
              </button>
            )}
          </div>
        </motion.div>

        <div className="reel-acts" aria-hidden="true">
          {reduced ? (
            <span>{acts.map((act) => act.label).join(" · ")}</span>
          ) : (
            <>
              <motion.span style={{ opacity: actOneOpacity }}>{acts[0].label}</motion.span>
              <motion.span style={{ opacity: actTwoOpacity }}>{acts[1].label}</motion.span>
              <motion.span style={{ opacity: actThreeOpacity }}>{acts[2].label}</motion.span>
            </>
          )}
        </div>

        <a href={scrollTo} className="reel-scroll">
          Scroll to begin
          <ChevronDown className="mx-auto mt-1 h-5 w-5" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

/**
 * The three acts, as a strip of film between sections: sprocket holes, warm
 * frames and the film's own captions. Decorative for a screen reader — the same
 * words are already in the story and gallery — and still under reduced motion.
 */
export function ReelInterlude({ details }: { details: InvitationDetails }) {
  const acts = filmActs(details);
  const frames = acts.map((act, index) => ({
    ...act,
    art: invitationFilmArt[(["palace", "arch", "courtyard"] as const)[index]!],
  }));
  return (
    <div className="reel-interlude" aria-hidden="true">
      <span className="reel-perf reel-perf-top" />
      <div className="reel-strip">
        <div className="reel-strip-track">
          {[0, 1].map((round) =>
            frames.map((frame) => (
              <figure className="reel-cell" key={`${round}-${frame.label}`}>
                <img src={frame.art} alt="" loading="lazy" />
                <figcaption>
                  <span>{frame.label}</span>
                  <small>{frame.caption}</small>
                </figcaption>
              </figure>
            )),
          )}
        </div>
      </div>
      <span className="reel-perf reel-perf-bottom" />
    </div>
  );
}
