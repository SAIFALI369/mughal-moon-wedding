import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import { CouplePortraits } from "./invitation-stage";
import type { InvitationTheme } from "./invitation-options";

/**
 * Which tradition a theme belongs to. Hindu themes carry a Sanskrit blessing
 * where the Muslim themes carry the Bismillah, and their opening gate is a
 * diya instead of the heavenly doors.
 */
export type InvitationRite = "muslim" | "hindu" | "universal";

export const themeRites: Record<InvitationTheme, InvitationRite> = {
  eid: "muslim",
  mughal: "muslim",
  classic: "universal",
  aladin: "muslim",
  "bihari-vibe": "hindu",
  mecca_madinah: "muslim",
  luxury: "universal",
  futuristic: "universal",
  fairytale: "universal",
  ballroom: "universal",
  "diya-utsav": "hindu",
  "sacred-mandap": "hindu",
  "riad-noor": "muslim",
  "kashi-ghat": "hindu",
  "mehndi-night": "universal",
  "jharokha-dawn": "muslim",
  "haldi-baag": "hindu",
  "vows-in-ink": "universal",
};

export function riteForTheme(theme: InvitationTheme): InvitationRite {
  return themeRites[theme] ?? "universal";
}

/** One short blessing per tradition, shown on the gate and above the names. */
export const riteBlessings: Record<InvitationRite, { text: string; script: string } | null> = {
  muslim: { text: "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ", script: "arabic" },
  universal: null,
  hindu: { text: "॥ श्री गणेशाय नमः ॥", script: "sanskrit" },
};

/**
 * Shows a theme's artwork whole — never cropped — with a blurred copy of the
 * same photo filling the letterbox. On a phone the picture is fully visible
 * and the surrounding blur keeps the colour, so nothing is lost off-screen.
 */
export function FullArtFrame({
  src,
  className = "",
  priority = false,
  alt = "",
}: {
  src: string;
  className?: string;
  priority?: boolean;
  /** Describe the picture when it carries meaning; leave empty when decorative. */
  alt?: string;
}) {
  return (
    <div className={`full-art ${className}`.trim()}>
      <img src={src} alt="" aria-hidden="true" className="full-art-fill" />
      <img
        src={src}
        alt={alt}
        aria-hidden={alt ? undefined : "true"}
        className="full-art-image"
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? undefined : "lazy"}
      />
    </div>
  );
}

/**
 * A living celebratory scene layered over any theme artwork.
 *
 * Everything is drawn with CSS gradients and animation, so the fire, sparks and
 * fireworks move continuously like a video but the card downloads no media,
 * autoplays no sound and keeps working offline. `reduce` freezes it into a
 * single still frame for visitors who ask for less motion.
 */
export function LivingScene({
  theme,
  variant,
  reduce = false,
}: {
  theme: InvitationTheme;
  variant: "gate" | "hero" | "stage" | "page";
  reduce?: boolean;
}) {
  const rite = riteForTheme(theme);
  const hindu = rite === "hindu";
  /**
   * The page layer is fixed behind a whole invitation for the immersive
   * themes: the same lanterns, petals, drapes and river diyas follow the
   * guest from the hero to the footer instead of stopping after the opening.
   */
  const page = variant === "page";
  const draped = theme === "riad-noor" || theme === "kashi-ghat" || theme === "mehndi-night";
  const night =
    hindu ||
    theme === "mughal" ||
    theme === "aladin" ||
    theme === "futuristic" ||
    theme === "riad-noor" ||
    theme === "mehndi-night";
  return (
    <div
      className={`living-scene living-${variant}`}
      data-rite={rite}
      data-tone={night ? "night" : "day"}
      data-theme={theme}
      data-reduced={reduce ? "true" : undefined}
      aria-hidden="true"
    >
      {variant !== "stage" && !page && (
        <div className="living-sky" aria-hidden="true">
          {theme === "ballroom" && <div className="living-chandelier-glow" />}
          {hindu && <div className="living-marigold-glow" />}
        </div>
      )}
      {!page && (
        <div className="living-bokeh" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((index) => (
            <span className={`bokeh bokeh-${index}`} key={index} />
          ))}
        </div>
      )}
      {!page && (
        <div className="living-fireworks">
          <span className="burst burst-a" />
          <span className="burst burst-b" />
          <span className="burst burst-c" />
          <span className="burst burst-d" />
        </div>
      )}
      {(variant !== "stage" || draped) && (
        <div className="living-drapes" aria-hidden="true">
          {[0, 1, 2, 3].map((index) => (
            <span className={`drape drape-${index}`} key={index} />
          ))}
        </div>
      )}
      {theme === "riad-noor" && (
        <div className="living-lanterns">
          {[0, 1, 2].map((index) => (
            <span className={`lantern lantern-${index}`} key={index}>
              <span className="lantern-cord" />
              <span className="lantern-body" />
              <span className="lantern-glow" />
            </span>
          ))}
        </div>
      )}
      {theme === "vows-in-ink" && <div className="living-ink-grain" aria-hidden="true" />}
      {(theme === "mehndi-night" ||
        theme === "bihari-vibe" ||
        theme === "jharokha-dawn" ||
        theme === "haldi-baag") && (
        <div className="living-petals">
          {Array.from({ length: 10 }, (_, index) => (
            <span className={`petal petal-${index}`} key={index} />
          ))}
        </div>
      )}
      {theme === "kashi-ghat" && (
        <div className="living-river-diyas">
          {Array.from({ length: 8 }, (_, index) => (
            <span className={`river-diya river-diya-${index}`} key={index} />
          ))}
        </div>
      )}
      {variant !== "stage" && !page && (
        <div className="living-diya-row">
          {[0, 1, 2, 3, 4].map((index) => (
            <span className={`diya diya-${index}`} key={index}>
              <span className="diya-bowl" />
              <span className="diya-flame" />
              <span className="diya-glow" />
            </span>
          ))}
        </div>
      )}
      {!page && (
        <div className="living-sparks">
          {Array.from({ length: 14 }, (_, index) => (
            <span className={`spark spark-${index}`} key={index} />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Mandap Aarti — a Hindu ceremony stage with a living havan fire.
 *
 * The section is taller than the viewport and its stage sticky, so scrolling
 * walks the guest under the flower canopy (garlands swing, marigolds drift) and
 * the sacred fire grows. Reduced-motion visitors get the still frame.
 */
export function MandapStage({
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

  const sceneScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.34]);
  const sceneY = useTransform(scrollYProgress, [0, 1], ["0%", "6%"]);
  const copyY = useTransform(scrollYProgress, [0, 1], [0, -40]);
  const canopySwing = useTransform(scrollYProgress, [0, 1], ["-1.4deg", "1.4deg"]);

  return (
    <section
      ref={ref}
      id="invitation-top"
      aria-label="Wedding invitation"
      className="mandap-stage"
      data-theme={details.theme}
      data-reduced={reduced ? "true" : undefined}
    >
      <div className="mandap-sticky">
        <motion.div
          className="mandap-scene"
          style={reduced ? undefined : { scale: sceneScale, y: sceneY }}
        >
          <FullArtFrame src={backgroundImage} className="mandap-scene-art" priority />
          <div className="mandap-scene-shade" aria-hidden="true" />
        </motion.div>

        <LivingScene theme={details.theme} variant="hero" reduce={reduced ?? false} />

        <motion.div className="mandap-canopy" style={reduced ? undefined : { rotate: canopySwing }}>
          <span className="mandap-garland mandap-garland-left" aria-hidden="true" />
          <span className="mandap-garland mandap-garland-right" aria-hidden="true" />
          <span className="mandap-bell mandap-bell-left" aria-hidden="true" />
          <span className="mandap-bell mandap-bell-right" aria-hidden="true" />
        </motion.div>

        <motion.div
          className="mandap-copy"
          initial={reduced ? undefined : { opacity: 0, y: 30 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: entranceDelay }}
          style={reduced ? undefined : { y: copyY }}
        >
          <div className="stage-copy mandap-card">
            <p dir="ltr" className="mandap-shloka font-sanskrit text-xl sm:text-2xl">
              ॥ श्री गणेशाय नमः ॥
            </p>
            <p className="stage-kicker text-xs font-medium uppercase tracking-[0.36em] text-gold">
              {details.hosts || "Together with their families"}
            </p>
            <p className="stage-overline mt-5 font-serif text-lg italic text-foreground">
              {details.riteLine || "A sacred celebration"}
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

        <div className="mandap-havan" aria-hidden="true">
          <span className="havan-glow" />
          <span className="havan-flame havan-flame-a" />
          <span className="havan-flame havan-flame-b" />
          <span className="havan-flame havan-flame-c" />
          <span className="havan-ember havan-ember-a" />
          <span className="havan-ember havan-ember-b" />
          <span className="havan-ember havan-ember-c" />
        </div>

        <a href={scrollTo} className="mandap-scroll">
          <span>Step under the mandap</span>
          <ChevronDown className="mx-auto mt-1 h-5 w-5" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

/** The Sanskrit blessing for a card, or nothing for a tradition without one. */
export function riteBlessing(theme: InvitationTheme) {
  return riteBlessings[riteForTheme(theme)];
}
