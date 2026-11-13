import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ChevronDown } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import { parseInvitationDate } from "./invitation-details";
import { heroVideoForTheme } from "./invitation-art";
import { mascotsForTheme, type InvitationLayout, type InvitationTheme } from "./invitation-options";
import { isDarkOpeningTheme, useOpeningPhase } from "./noor-arch-gate";
import { CatMascot, SquirrelMascot } from "./invitation-world";
import { FullArtFrame, LivingScene } from "./invitation-rite";

type StageProps = {
  details: InvitationDetails;
  backgroundImage: string;
  actions: ReactNode;
  scrollTo: string;
  entranceDelay: number;
};

function shortDate(value: string) {
  const parts = parseInvitationDate(value);
  if (!parts) return { day: "", month: "", year: "", weekday: "" };
  const month = new Date(Date.UTC(parts.year, parts.month - 1, 1)).toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });
  const weekday = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).toLocaleString(
    "en-US",
    { weekday: "long", timeZone: "UTC" },
  );
  return {
    day: String(parts.day).padStart(2, "0"),
    month,
    year: String(parts.year),
    weekday,
  };
}

function HeroFollowUpLayer({
  theme,
  backgroundImage,
  className,
}: {
  theme: InvitationTheme;
  backgroundImage: string;
  className: string;
}) {
  const reduced = useReducedMotion();
  const { gated, heroVideoLive } = useOpeningPhase();
  const followUp = heroVideoForTheme(theme);
  const allowMotion = !gated || (heroVideoLive && Boolean(followUp));

  if (gated && followUp) {
    return (
      <>
        <FullArtFrame
          src={backgroundImage}
          theme={theme}
          className={className}
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
    );
  }

  return (
    <FullArtFrame
      src={backgroundImage}
      theme={theme}
      className={className}
      priority
      motion={allowMotion}
    />
  );
}

/* ─────────────────────────── 1. Jharokha Dawn ─────────────────────────── */

export function ChhatriDawnStage({ details, backgroundImage, scrollTo }: StageProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { revealed, gated } = useOpeningPhase();
  const copyVisible = !gated || revealed;
  const darkSurface = isDarkOpeningTheme(details.theme);
  const date = shortDate(details.date);

  return (
    <section
      ref={ref}
      id="invitation-top"
      aria-label="Wedding invitation"
      className="dawn-stage"
      data-theme={details.theme}
      data-reduced={reduced ? "true" : undefined}
    >
      <div className="dawn-sky hero-media-lock" aria-hidden="true">
        <HeroFollowUpLayer
          theme={details.theme}
          backgroundImage={backgroundImage}
          className="dawn-art"
        />
        <span className="dawn-wash" />
      </div>
      <LivingScene theme={details.theme} variant="hero" reduce={reduced ?? false} />
      <span className="dawn-petals" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <i key={index} />
        ))}
      </span>

      <motion.div
        className="dawn-frame"
        initial={gated && !reduced ? { opacity: 0, y: 28, scale: 0.92 } : false}
        animate={copyVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 28, scale: 0.92 }}
        transition={reduced ? { duration: 0 } : { duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      >
        <span className="dawn-jali dawn-jali-left" aria-hidden="true" />
        <span className="dawn-jali dawn-jali-right" aria-hidden="true" />
        <div
          className={`dawn-window card-calligraphy-plate ${
            darkSurface ? "is-dark-art" : "is-light-art"
          }`}
        >
          <span className="dawn-window-crest" aria-hidden="true" />
          <h1 className="dawn-names card-calligraphy-names">
            <span className="dawn-name card-calligraphy-name">{details.groomName}</span>
            <span className="dawn-weds card-calligraphy-amp" aria-hidden="true">
              &amp;
            </span>
            <span className="dawn-name card-calligraphy-name">{details.brideName}</span>
          </h1>
          <span className="card-calligraphy-rule" aria-hidden="true" />
          <p className="dawn-date card-calligraphy-date mt-4">
            {date.day ? `${date.day} ${date.month} ${date.year}` : details.date || "Save the date"}
            {details.time ? ` · ${details.time}` : ""}
          </p>
        </div>
        <span className="dawn-sill" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </motion.div>

      <div className="dawn-lower">
        <a href={scrollTo} className="dawn-scroll card-scroll-cue">
          Scroll
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

/* ─────────────────────────── 2. Haldi Baag ─────────────────────────── */

export function BaagStage({ details, backgroundImage, scrollTo }: StageProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { revealed, gated } = useOpeningPhase();
  const copyVisible = !gated || revealed;
  const darkSurface = isDarkOpeningTheme(details.theme);

  return (
    <section
      ref={ref}
      id="invitation-top"
      aria-label="Wedding invitation"
      className="baag-stage"
      data-theme={details.theme}
      data-reduced={reduced ? "true" : undefined}
    >
      <div className="baag-garland" aria-hidden="true">
        {Array.from({ length: 22 }, (_, index) => (
          <span className={`baag-bloom baag-bloom-${index % 5}`} key={index} />
        ))}
      </div>
      <LivingScene theme={details.theme} variant="hero" reduce={reduced ?? false} />

      <div className="baag-inner">
        <div className="baag-frame">
          <span className="baag-photo hero-media-lock">
            <div className="baag-photo-inner" aria-hidden="true">
              <HeroFollowUpLayer
                theme={details.theme}
                backgroundImage={backgroundImage}
                className="baag-art"
              />
            </div>
          </span>
          <span className="baag-tape baag-tape-left" aria-hidden="true" />
          <span className="baag-tape baag-tape-right" aria-hidden="true" />
        </div>

        <motion.div
          className={`baag-copy card-calligraphy-plate ${
            darkSurface ? "is-dark-art" : "is-light-art"
          }`}
          initial={gated && !reduced ? { opacity: 0, y: 28, scale: 0.92 } : false}
          animate={
            copyVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 28, scale: 0.92 }
          }
          transition={reduced ? { duration: 0 } : { duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="baag-names card-calligraphy-names">
            <span className="card-calligraphy-name">{details.groomName}</span>
            <span className="baag-plus card-calligraphy-amp" aria-hidden="true">
              &amp;
            </span>
            <span className="card-calligraphy-name">{details.brideName}</span>
          </h1>
          {(details.date || details.time) && (
            <>
              <span className="card-calligraphy-rule" aria-hidden="true" />
              <p className="baag-date card-calligraphy-date mt-4">
                {[details.date, details.time].filter(Boolean).join(" · ")}
              </p>
            </>
          )}
        </motion.div>
      </div>

      <a href={scrollTo} className="baag-scroll card-scroll-cue">
        Scroll
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </a>
    </section>
  );
}

/* ─────────────────────────── 3. Vows in Ink ─────────────────────────── */

export function SingleStrokeStage({ details, backgroundImage, scrollTo }: StageProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { revealed, gated } = useOpeningPhase();
  const copyVisible = !gated || revealed;
  const darkSurface = isDarkOpeningTheme(details.theme);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const thread = useTransform(scrollYProgress, [0, 1], [0.18, 1]);

  return (
    <section
      ref={ref}
      id="invitation-top"
      aria-label="Wedding invitation"
      className="ink-stage"
      data-theme={details.theme}
      data-reduced={reduced ? "true" : undefined}
    >
      <motion.span
        className="ink-thread"
        aria-hidden="true"
        style={reduced ? undefined : { scaleX: thread }}
      />
      <div className="ink-inner">
        <motion.div
          className={`ink-copy card-calligraphy-plate ${
            darkSurface ? "is-dark-art" : "is-light-art"
          }`}
          initial={gated && !reduced ? { opacity: 0, y: 28, scale: 0.92 } : false}
          animate={
            copyVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 28, scale: 0.92 }
          }
          transition={reduced ? { duration: 0 } : { duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="ink-names card-calligraphy-names">
            <span className="card-calligraphy-name">{details.groomName}</span>
            <em className="card-calligraphy-amp" aria-hidden="true">
              &amp;
            </em>
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
          <a href={scrollTo} className="ink-scroll card-scroll-cue mt-6">
            Scroll
            <span aria-hidden="true">↓</span>
          </a>
        </motion.div>

        <figure className="ink-art">
          <span className="ink-art-mat hero-media-lock">
            <HeroFollowUpLayer
              theme={details.theme}
              backgroundImage={backgroundImage}
              className="ink-art-frame"
            />
          </span>
          <span className="ink-seal" aria-hidden="true">
            <i />
          </span>
        </figure>
      </div>
    </section>
  );
}

/* ─────────────────────── Covers, simple calligraphy ─────────────────────── */

function coverDate(details: InvitationDetails) {
  const parts = shortDate(details.date);
  return {
    ...parts,
    line: parts.day ? `${parts.day} ${parts.month} ${parts.year}` : details.date,
  };
}

export function ChhatriDawnCover({ details }: { details: InvitationDetails }) {
  const date = coverDate(details);
  return (
    <div className="cover-inner dawn-cover">
      <span className="dawn-cover-jali" aria-hidden="true" />
      <h3 className="dawn-cover-names card-calligraphy-names">
        <span className="card-calligraphy-name">{details.groomName}</span>
        <span className="dawn-cover-weds card-calligraphy-amp">&amp;</span>
        <span className="card-calligraphy-name">{details.brideName}</span>
      </h3>
      <span className="card-calligraphy-rule" aria-hidden="true" />
      <p className="card-calligraphy-date mt-3">{date.line || details.date}</p>
      <span className="dawn-cover-sill" aria-hidden="true" />
    </div>
  );
}

export function BaagCover({ details }: { details: InvitationDetails }) {
  const date = coverDate(details);
  return (
    <div className="cover-inner baag-cover">
      <div className="baag-cover-garland" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => (
          <span className={`baag-bloom baag-bloom-${index % 5}`} key={index} />
        ))}
      </div>
      <h3 className="baag-cover-names card-calligraphy-names">
        <span className="card-calligraphy-name">{details.groomName}</span>
        <span className="card-calligraphy-amp" aria-hidden="true">
          &amp;
        </span>
        <span className="card-calligraphy-name">{details.brideName}</span>
      </h3>
      <span className="card-calligraphy-rule" aria-hidden="true" />
      <p className="baag-cover-date card-calligraphy-date mt-3">{date.line || details.date}</p>
    </div>
  );
}

export function InkCover({ details }: { details: InvitationDetails }) {
  const date = coverDate(details);
  return (
    <div className="cover-inner ink-cover">
      <span className="ink-cover-rule" aria-hidden="true" />
      <h3 className="ink-cover-names card-calligraphy-names">
        <span className="card-calligraphy-name">{details.groomName}</span>
        <em className="card-calligraphy-amp" aria-hidden="true">
          &amp;
        </em>
        <span className="card-calligraphy-name">{details.brideName}</span>
      </h3>
      <span className="card-calligraphy-rule" aria-hidden="true" />
      <p className="ink-cover-date card-calligraphy-date mt-3">{date.line || details.date}</p>
      <span className="ink-cover-seal" aria-hidden="true">
        <i />
      </span>
    </div>
  );
}

/* ───────────────────────────── Between the sections ───────────────────────────── */

export function LayoutInterlude({
  layout,
  details,
}: {
  layout: InvitationLayout;
  details: InvitationDetails;
}) {
  if (layout === "chhatri-dawn") {
    return (
      <div className="dawn-interlude" aria-hidden="true">
        <span className="dawn-interlude-arch" />
        <span className="dawn-interlude-arch" />
        <span className="dawn-interlude-arch" />
        <p>At first light</p>
      </div>
    );
  }
  if (layout === "baag") {
    return (
      <div className="baag-interlude" aria-hidden="true">
        <span className="baag-interlude-string">
          {Array.from({ length: 16 }, (_, index) => (
            <i className={`baag-bloom baag-bloom-${index % 5}`} key={index} />
          ))}
        </span>
        <p>Marigold &amp; laughter</p>
      </div>
    );
  }
  if (layout === "single-stroke") {
    return (
      <div className="ink-interlude" aria-hidden="true">
        <span />
        <p>One thread · {details.date || "a promise"}</p>
        <span />
      </div>
    );
  }
  return null;
}

/* ─────────────────────────── 4. Chand Bagh ─────────────────────────── */

export function ChandBaghStage({ details, backgroundImage, scrollTo }: StageProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { revealed, gated } = useOpeningPhase();
  const copyVisible = !gated || revealed;
  const darkSurface = isDarkOpeningTheme(details.theme);
  const mascot = mascotsForTheme(details.theme);

  return (
    <section
      ref={ref}
      id="invitation-top"
      aria-label="Wedding invitation"
      className="chand-stage"
      data-theme={details.theme}
      data-reduced={reduced ? "true" : undefined}
    >
      <div className="chand-sky hero-media-lock" aria-hidden="true">
        <HeroFollowUpLayer
          theme={details.theme}
          backgroundImage={backgroundImage}
          className="chand-art"
        />
        <span className="chand-veil" />
      </div>
      <LivingScene theme={details.theme} variant="hero" reduce={reduced ?? false} />
      <span className="chand-constellation" aria-hidden="true">
        {Array.from({ length: 14 }, (_, index) => (
          <i key={index} />
        ))}
      </span>
      <span className="chand-fireflies" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <i key={index} />
        ))}
      </span>

      <motion.div
        className={`chand-inner card-calligraphy-plate ${
          darkSurface ? "is-dark-art" : "is-light-art"
        }`}
        initial={gated && !reduced ? { opacity: 0, y: 28, scale: 0.92 } : false}
        animate={copyVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 28, scale: 0.92 }}
        transition={reduced ? { duration: 0 } : { duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      >
        <h1 className="chand-names card-calligraphy-names">
          <span className="card-calligraphy-name">{details.groomName}</span>
          <i className="card-calligraphy-amp" aria-hidden="true">
            &amp;
          </i>
          <span className="card-calligraphy-name">{details.brideName}</span>
        </h1>
        {(details.date || details.time) && (
          <>
            <span className="card-calligraphy-rule" aria-hidden="true" />
            <p className="chand-date card-calligraphy-date mt-4">
              {[details.date, details.time].filter(Boolean).join(" · ")}
            </p>
          </>
        )}
      </motion.div>

      <div className="chand-wall">
        <div className="chand-wall-cat" aria-hidden="true">
          <CatMascot className="chand-cat" />
          <SquirrelMascot className="chand-squirrel" />
        </div>
        <p className="chand-bubble">
          {mascot?.cat ?? "Noor"} the cat is expecting you. Tap the gold stars as you wander —{" "}
          {mascot?.squirrel ?? "Gul"} is counting them.
        </p>
        <a href={scrollTo} className="chand-scroll card-scroll-cue">
          Scroll
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

/* ─────────────────────────── 5. Mela Maidan ─────────────────────────── */

export function MelaMaidanStage({ details, backgroundImage, scrollTo }: StageProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { revealed, gated } = useOpeningPhase();
  const copyVisible = !gated || revealed;
  const darkSurface = isDarkOpeningTheme(details.theme);
  const date = shortDate(details.date);
  const mascot = mascotsForTheme(details.theme);

  return (
    <section
      ref={ref}
      id="invitation-top"
      aria-label="Wedding invitation"
      className="mela-stage"
      data-theme={details.theme}
      data-reduced={reduced ? "true" : undefined}
    >
      <div className="mela-sky hero-media-lock" aria-hidden="true">
        <HeroFollowUpLayer
          theme={details.theme}
          backgroundImage={backgroundImage}
          className="mela-art"
        />
        <span className="mela-veil" />
      </div>
      <LivingScene theme={details.theme} variant="hero" reduce={reduced ?? false} />

      <span className="mela-bunting" aria-hidden="true">
        {Array.from({ length: 16 }, (_, index) => (
          <i key={index} className={`bunting-flag flag-${index % 4}`} />
        ))}
      </span>
      <span className="mela-kites" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <i key={index} className={`mela-kite kite-${index}`} />
        ))}
      </span>

      <motion.div
        className="mela-inner"
        initial={gated && !reduced ? { opacity: 0, y: 28, scale: 0.92 } : false}
        animate={copyVisible ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 28, scale: 0.92 }}
        transition={reduced ? { duration: 0 } : { duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className={`mela-ticket card-calligraphy-plate ${
            darkSurface ? "is-dark-art" : "is-light-art"
          }`}
        >
          <span className="mela-ticket-stub" aria-hidden="true">
            <b>{date.day || "•"}</b>
            <i>{date.month.slice(0, 3) || "day"}</i>
          </span>
          <div className="mela-ticket-body">
            <h1 className="mela-names card-calligraphy-names">
              <span className="card-calligraphy-name">{details.groomName}</span>
              <i className="card-calligraphy-amp" aria-hidden="true">
                &amp;
              </i>
              <span className="card-calligraphy-name">{details.brideName}</span>
            </h1>
            {(details.date || details.time) && (
              <>
                <span className="card-calligraphy-rule" aria-hidden="true" />
                <p className="mela-ticket-meta card-calligraphy-date mt-3">
                  {[details.date, details.time].filter(Boolean).join(" · ")}
                </p>
              </>
            )}
          </div>
          <span className="mela-ticket-notch" aria-hidden="true" />
        </div>
      </motion.div>

      <div className="mela-drum-row">
        <div className="mela-drum" aria-hidden="true">
          <span className="mela-drum-head" />
          <span className="mela-drum-stat" />
        </div>
        <div className="mela-crew" aria-hidden="true">
          <SquirrelMascot className="mela-squirrel" />
          <CatMascot className="mela-cat" mood="day" />
        </div>
        <p className="mela-bubble">
          {mascot?.cat ?? "Mithai"} has your ticket, {mascot?.squirrel ?? "Chintu"} has the games.
          Nine stars are hiding between the sections.
        </p>
        <a href={scrollTo} className="mela-scroll card-scroll-cue">
          Scroll
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

/* ─────────────────── covers for the two worlds ─────────────────── */

export function ChandBaghCover({ details }: { details: InvitationDetails }) {
  const date = coverDate(details);
  return (
    <div className="cover-inner chand-cover">
      <span className="chand-cover-sky" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <i key={index} />
        ))}
      </span>
      <span className="chand-cover-moon" aria-hidden="true" />
      <h3 className="chand-cover-names card-calligraphy-names">
        <span className="card-calligraphy-name">{details.groomName}</span>
        <i className="card-calligraphy-amp" aria-hidden="true">
          &amp;
        </i>
        <span className="card-calligraphy-name">{details.brideName}</span>
      </h3>
      <span className="card-calligraphy-rule" aria-hidden="true" />
      <p className="chand-cover-date card-calligraphy-date mt-3">{date.line || details.date}</p>
      <CatMascot className="chand-cover-cat" />
    </div>
  );
}

export function MelaCover({ details }: { details: InvitationDetails }) {
  const date = coverDate(details);
  return (
    <div className="cover-inner mela-cover">
      <span className="mela-cover-bunting" aria-hidden="true">
        {Array.from({ length: 10 }, (_, index) => (
          <i key={index} className={`bunting-flag flag-${index % 4}`} />
        ))}
      </span>
      <h3 className="mela-cover-names card-calligraphy-names">
        <span className="card-calligraphy-name">{details.groomName}</span>
        <i className="card-calligraphy-amp" aria-hidden="true">
          &amp;
        </i>
        <span className="card-calligraphy-name">{details.brideName}</span>
      </h3>
      <span className="card-calligraphy-rule" aria-hidden="true" />
      <p className="mela-cover-date card-calligraphy-date mt-3">{date.line || details.date}</p>
      <span className="mela-cover-stamp" aria-hidden="true">
        <CatMascot className="mela-cover-cat" mood="day" />
      </span>
    </div>
  );
}

/* ─────────────── bands that carry each world past the hero ─────────────── */

export function WorldInterlude({
  layout,
  details,
}: {
  layout: InvitationLayout;
  details: InvitationDetails;
}) {
  if (layout === "chand-bagh") {
    return (
      <div className="chand-interlude" aria-hidden="true">
        <span className="chand-interlude-moons">
          {Array.from({ length: 8 }, (_, index) => (
            <i key={index} className={`moon-phase-${index}`} />
          ))}
        </span>
        <p>The garden keeps its own time</p>
        <SquirrelMascot className="chand-interlude-squirrel" />
      </div>
    );
  }
  if (layout === "mela-maidan") {
    return (
      <div className="mela-interlude" aria-hidden="true">
        <span className="mela-interlude-bunting">
          {Array.from({ length: 12 }, (_, index) => (
            <i key={index} className={`bunting-flag flag-${index % 4}`} />
          ))}
        </span>
        <p>Keep the ticket — {details.date || "see you at the mela"}</p>
      </div>
    );
  }
  return null;
}
