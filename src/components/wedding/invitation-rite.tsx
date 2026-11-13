import { useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import { heroVideoForTheme, invitationArtFallback } from "./invitation-art";
import { isDarkOpeningTheme, useOpeningPhase } from "./noor-arch-gate";
import type { InvitationTheme } from "./invitation-options";
import { ThemeLoop } from "./theme-loop";

/**
 * Which tradition a theme belongs to. Hindu themes carry a Sanskrit blessing
 * where the Muslim themes carry the Bismillah.
 */
export type InvitationRite = "muslim" | "hindu" | "universal";

export const themeRites: Record<InvitationTheme, InvitationRite> = {
  "mughal-moon-film": "muslim",
  "royal-rajmahal": "hindu",
  "lotus-goddess": "hindu",
  calligraphy: "hindu",
  eid: "muslim",
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
  "jharokha-dawn": "universal",
  "haldi-baag": "hindu",
  "vows-in-ink": "universal",
  "chand-bagh": "muslim",
  "mela-maidan": "universal",
};

export function riteForTheme(theme: InvitationTheme): InvitationRite {
  return themeRites[theme] ?? "universal";
}

/** One short blessing per tradition, shown in ceremony sections where relevant. */
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
  theme,
  className = "",
  priority = false,
  alt = "",
  motion: enableMotion = true,
}: {
  src: string;
  /** The card's theme: its own film plays over the still once it is ready. */
  theme?: InvitationTheme;
  className?: string;
  priority?: boolean;
  /** Describe the picture when it carries meaning; leave empty when decorative. */
  alt?: string;
  /** False keeps this frame a still, even when a film exists for the theme. */
  motion?: boolean;
}) {
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const key = `${theme ?? ""}:${src}`;
  const fallbackActive = failedKey === key;
  const fallbackSrc = theme ? invitationArtFallback[theme] : undefined;
  const displaySrc = fallbackActive && fallbackSrc ? fallbackSrc : src;

  return (
    <div className={`full-art ${className}`.trim()}>
      <img
        src={displaySrc}
        alt=""
        aria-hidden="true"
        className="full-art-fill"
        onError={() => {
          if (fallbackSrc && !fallbackActive) setFailedKey(key);
        }}
      />
      <img
        src={displaySrc}
        alt={alt}
        aria-hidden={alt ? undefined : "true"}
        className="full-art-image"
        fetchPriority={priority ? "high" : undefined}
        loading={priority ? undefined : "lazy"}
        onError={() => {
          if (fallbackSrc && !fallbackActive) setFailedKey(key);
        }}
      />
      {theme && (
        <ThemeLoop
          theme={theme}
          className="full-art-video"
          priority={priority}
          enabled={enableMotion}
          poster={displaySrc}
        />
      )}
    </div>
  );
}

/**
 * A living celebratory scene layered over any theme artwork.
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
  const page = variant === "page";
  const draped = theme === "riad-noor" || theme === "kashi-ghat" || theme === "mehndi-night";
  const night =
    hindu ||
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
 * Mandap Aarti — Hindu ceremony stage stabilized without vertical background jitter
 * and styled in simple dark brown and goldenish calligraphy.
 */
export function MandapStage({
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

  const copyY = useTransform(scrollYProgress, [0, 1], [0, -32]);
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
        <div className="mandap-scene hero-media-lock">
          {gated && followUp ? (
            <>
              <FullArtFrame
                src={backgroundImage}
                theme={details.theme}
                className="mandap-scene-art"
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
              className="mandap-scene-art"
              priority
              motion={allowMotion}
            />
          )}
          <div className="mandap-scene-shade" aria-hidden="true" />
        </div>

        <LivingScene theme={details.theme} variant="hero" reduce={reduced ?? false} />

        <motion.div className="mandap-canopy" style={reduced ? undefined : { rotate: canopySwing }}>
          <span className="mandap-garland mandap-garland-left" aria-hidden="true" />
          <span className="mandap-garland mandap-garland-right" aria-hidden="true" />
          <span className="mandap-bell mandap-bell-left" aria-hidden="true" />
          <span className="mandap-bell mandap-bell-right" aria-hidden="true" />
        </motion.div>

        <motion.div className="mandap-copy" style={reduced ? undefined : { y: copyY }}>
          <motion.div
            initial={gated && !reduced ? { opacity: 0, y: 28, scale: 0.92 } : false}
            animate={
              copyVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 28, scale: 0.92 }
            }
            transition={reduced ? { duration: 0 } : { duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
            className={`stage-copy mandap-card card-calligraphy-plate mx-auto ${
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

        <div className="mandap-havan" aria-hidden="true">
          <span className="havan-glow" />
          <span className="havan-flame havan-flame-a" />
          <span className="havan-flame havan-flame-b" />
          <span className="havan-flame havan-flame-c" />
          <span className="havan-ember havan-ember-a" />
          <span className="havan-ember havan-ember-b" />
          <span className="havan-ember havan-ember-c" />
        </div>

        <a href={scrollTo} className="mandap-scroll card-scroll-cue">
          <span>Scroll</span>
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
