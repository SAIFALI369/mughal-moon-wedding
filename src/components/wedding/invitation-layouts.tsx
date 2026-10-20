import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import { parseInvitationDate } from "./invitation-details";
import type { InvitationLayout, InvitationTheme } from "./invitation-options";
import { FullArtFrame, LivingScene, riteBlessing } from "./invitation-rite";
import { CouplePortraits } from "./invitation-stage";

/**
 * Three signature structures. Each one changes what the opening *is* — a raised
 * balcony at dawn, a marigold courtyard collage, a single inked page — rather
 * than repainting the shared stage. `invitationLayoutFor` makes the theme's
 * layout win over the shared frameworks, so the three themes can never collapse
 * back into the same silhouette. Grand Curtain stays an explicit opt-in.
 */

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

function RiteLine({ theme, className }: { theme: InvitationTheme; className: string }) {
  const blessing = riteBlessing(theme);
  if (!blessing) return null;
  const arabic = blessing.script === "arabic";
  return (
    <p
      dir={arabic ? "rtl" : "ltr"}
      className={`${className} ${arabic ? "font-arabic" : "font-sanskrit"}`}
    >
      {blessing.text}
    </p>
  );
}

/* ─────────────────────────── 1. Jharokha Dawn ─────────────────────────── */

/**
 * A carved sandstone balcony: the artwork is the view, the names sit inside the
 * cusped window, and the sill closes the frame. Vertical, ceremonial, in rose
 * sandstone and brass — no dark sky, no scroll-stacked arch and no script glyph.
 */
export function ChhatriDawnStage({
  details,
  backgroundImage,
  actions,
  scrollTo,
  entranceDelay,
}: StageProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const artY = useTransform(scrollYProgress, [0, 1], ["0%", "12%"]);
  const windowLift = useTransform(scrollYProgress, [0, 0.6], [0, -26]);
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
      <motion.div className="dawn-sky" style={reduced ? undefined : { y: artY }} aria-hidden="true">
        <FullArtFrame src={backgroundImage} className="dawn-art" priority />
        <span className="dawn-wash" />
      </motion.div>
      <LivingScene theme={details.theme} variant="hero" reduce={reduced ?? false} />
      <span className="dawn-petals" aria-hidden="true">
        {Array.from({ length: 7 }, (_, index) => (
          <i key={index} />
        ))}
      </span>

      <motion.div
        className="dawn-frame"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.1, delay: entranceDelay }}
        style={reduced ? undefined : { y: windowLift }}
      >
        <span className="dawn-jali dawn-jali-left" aria-hidden="true" />
        <span className="dawn-jali dawn-jali-right" aria-hidden="true" />
        <div className="dawn-window">
          <span className="dawn-window-crest" aria-hidden="true" />
          <RiteLine theme={details.theme} className="dawn-blessing" />
          <p className="dawn-kicker">{details.hosts || "Together with their families"}</p>
          <h1 className="dawn-names">
            <span className="dawn-name">{details.groomName}</span>
            <span className="dawn-weds">weds</span>
            <span className="dawn-name">{details.brideName}</span>
          </h1>
          <p className="dawn-date">
            {date.day && (
              <span className="dawn-date-day">
                {date.day} <i>{date.month.slice(0, 3)}</i> {date.year}
              </span>
            )}
            {!date.day && (
              <span className="dawn-date-day">{details.date || "Date to be announced"}</span>
            )}
            {date.weekday && <span className="dawn-weekday">{date.weekday}</span>}
            {details.time && <span className="dawn-time">{details.time}</span>}
          </p>
          <p className="dawn-venue">
            {details.venue || "Venue to be announced"}
            {details.address && <span>{details.address}</span>}
          </p>
          <p className="dawn-event">{details.eventType || details.riteLine || "The wedding"}</p>
        </div>
        <span className="dawn-sill" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
      </motion.div>

      <div className="dawn-lower">
        <CouplePortraits details={details} compact />
        <div className="dawn-actions">{actions}</div>
        <a href={scrollTo} className="dawn-scroll">
          Enter the celebration
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}

/* ─────────────────────────── 2. Haldi Baag ─────────────────────────── */

/**
 * A courtyard collage: a taped, slightly tilted photograph on the left, a stack
 * of warm paper strips on the right, a marigold garland strung across the top.
 * Bold sans names, turmeric yellow and leaf green — a daytime celebration, not a
 * night-time palace.
 */
export function BaagStage({
  details,
  backgroundImage,
  actions,
  scrollTo,
  entranceDelay,
}: StageProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const artScale = useTransform(scrollYProgress, [0, 1], [1.02, 1.12]);
  const date = shortDate(details.date);

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
        <motion.figure
          className="baag-frame"
          initial={{ opacity: 0, rotate: -3, y: 26 }}
          animate={{ opacity: 1, rotate: -1.4, y: 0 }}
          transition={{ duration: 1, delay: entranceDelay }}
        >
          <span className="baag-photo">
            <motion.div
              className="baag-photo-inner"
              style={reduced ? undefined : { scale: artScale }}
              aria-hidden="true"
            >
              <FullArtFrame src={backgroundImage} className="baag-art" priority />
            </motion.div>
          </span>
          <span className="baag-tape baag-tape-left" aria-hidden="true" />
          <span className="baag-tape baag-tape-right" aria-hidden="true" />
          <figcaption className="baag-tag">
            {details.eventType || "Haldi"}
            <span>
              {[date.day && `${date.day} ${date.month}`, details.time].filter(Boolean).join(" · ")}
            </span>
          </figcaption>
        </motion.figure>

        <motion.div
          className="baag-copy"
          initial={{ opacity: 0, x: 28 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.1, delay: entranceDelay + 0.15 }}
        >
          <p className="baag-eyebrow">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {details.hosts || "Together with their families"}
          </p>
          <RiteLine theme={details.theme} className="baag-blessing" />
          <h1 className="baag-names">
            <span>{details.groomName}</span>
            <span className="baag-plus" aria-hidden="true">
              +
            </span>
            <span>{details.brideName}</span>
          </h1>
          <p className="baag-date">
            {details.date || "Date to be announced"}
            {details.time && <span>{details.time}</span>}
          </p>
          <p className="baag-venue">
            {details.venue || "Venue to be announced"}
            {details.address && <span>{details.address}</span>}
          </p>
          <CouplePortraits details={details} compact />
          <div className="baag-strips">
            <span>
              <i>When</i>
              {date.weekday || "The celebration"}
            </span>
            <span>
              <i>Where</i>
              {details.venue || "To be announced"}
            </span>
            <span>
              <i>Wear</i>
              {details.dressCode || "Something yellow"}
            </span>
          </div>
          <div className="baag-actions">{actions}</div>
        </motion.div>
      </div>

      <a href={scrollTo} className="baag-scroll">
        Walk into the baag
        <ChevronDown className="h-4 w-4" aria-hidden="true" />
      </a>
    </section>
  );
}

/* ─────────────────────────── 3. Vows in Ink ─────────────────────────── */

/**
 * A single printed page: hairline rules, a thin vermilion thread, small caps
 * metadata and a lot of paper. The artwork is a framed print, not a backdrop.
 */
export function SingleStrokeStage({
  details,
  backgroundImage,
  actions,
  scrollTo,
  entranceDelay,
}: StageProps) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const thread = useTransform(scrollYProgress, [0, 1], [0.18, 1]);
  const date = shortDate(details.date);

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
          className="ink-copy"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: entranceDelay }}
        >
          <p className="ink-overline">
            <span>Nº 01</span> The wedding of
          </p>
          <RiteLine theme={details.theme} className="ink-blessing" />
          <h1 className="ink-names">
            <span>{details.groomName}</span>
            <em aria-hidden="true">&amp;</em>
            <span>{details.brideName}</span>
          </h1>
          <dl className="ink-facts">
            <div>
              <dt>When</dt>
              <dd>
                {details.date || "To be announced"}
                {details.time && <span>{details.time}</span>}
              </dd>
            </div>
            <div>
              <dt>Where</dt>
              <dd>
                {details.venue || "To be announced"}
                {details.address && <span>{details.address}</span>}
              </dd>
            </div>
            <div>
              <dt>Occasion</dt>
              <dd>{details.eventType || "The wedding"}</dd>
            </div>
          </dl>
          <CouplePortraits details={details} compact />
          <div className="ink-actions">{actions}</div>
          <a href={scrollTo} className="ink-scroll">
            Read on
            <span aria-hidden="true">↓</span>
          </a>
        </motion.div>

        <motion.figure
          className="ink-art"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: entranceDelay + 0.2 }}
        >
          <span className="ink-art-mat">
            <FullArtFrame src={backgroundImage} className="ink-art-frame" priority />
          </span>
          <figcaption>
            <span>Handmade paper, one stroke</span>
            <i aria-hidden="true" />
          </figcaption>
          <span className="ink-seal" aria-hidden="true">
            <i />
          </span>
        </motion.figure>
      </div>
      <span className="ink-folio" aria-hidden="true">
        {date.year || "—"} · {details.venue || "The celebration"}
      </span>
    </section>
  );
}

/* ─────────────────────── Covers, in the same three tongues ─────────────────────── */

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
      <RiteLine theme={details.theme} className="dawn-cover-blessing" />
      <p className="dawn-cover-kicker">{details.hosts || "Together with their families"}</p>
      <h3 className="dawn-cover-names">
        <span>{details.groomName}</span>
        <span className="dawn-cover-weds">weds</span>
        <span>{details.brideName}</span>
      </h3>
      <div className="dawn-cover-plate">
        <span className="dawn-cover-day">{date.day || "—"}</span>
        <span className="dawn-cover-copy">
          <b>
            {date.month || "Date"} {date.year}
          </b>
          {details.time && <i>{details.time}</i>}
          {!date.day && <i>{details.date || "To be announced"}</i>}
        </span>
      </div>
      {details.venue && <p className="dawn-cover-venue">{details.venue}</p>}
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
      <p className="baag-cover-kicker">{details.hosts || "Together with their families"}</p>
      <h3 className="baag-cover-names">
        <span>{details.groomName}</span>
        <span aria-hidden="true">+</span>
        <span>{details.brideName}</span>
      </h3>
      <p className="baag-cover-date">
        {date.line || "Date to be announced"}
        {details.time && <span>{details.time}</span>}
      </p>
      {details.venue && <p className="baag-cover-venue">{details.venue}</p>}
      <span className="baag-cover-tag">{details.eventType || "Haldi"}</span>
    </div>
  );
}

export function InkCover({ details }: { details: InvitationDetails }) {
  const date = coverDate(details);
  return (
    <div className="cover-inner ink-cover">
      <span className="ink-cover-rule" aria-hidden="true" />
      <p className="ink-cover-overline">The wedding of</p>
      <h3 className="ink-cover-names">
        <span>{details.groomName}</span>
        <em aria-hidden="true">&amp;</em>
        <span>{details.brideName}</span>
      </h3>
      <p className="ink-cover-date">{date.line || "Date to be announced"}</p>
      {details.venue && <p className="ink-cover-venue">{details.venue}</p>}
      <span className="ink-cover-seal" aria-hidden="true">
        <i />
      </span>
    </div>
  );
}

/* ───────────────────────────── Between the sections ───────────────────────────── */

/**
 * One structural band carries each signature past the hero, so the page never
 * relaxes into the same stacked-section scroll.
 */
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
