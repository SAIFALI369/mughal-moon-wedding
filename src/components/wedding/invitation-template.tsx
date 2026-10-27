import { CinematicHero } from "./cinematic-hero";
import { isStorybook, StorybookEntry, StorybookHero } from "./storybook";
import { motion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";
import {
  CalendarDays,
  CalendarHeart,
  CalendarPlus,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  Gift,
  Heart,
  MapPin,
  Music2,
  Phone,
  Quote,
  Share2,
  Sparkles as SparklesIcon,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Countdown, Hero, Preloader } from "./sections";
import { fadeUp } from "./ornaments";
import {
  buildInvitationCalendarUrl,
  buildInvitationEventCalendarUrl,
  getInvitationCountdownDate,
  getInvitationAssistantName,
  getInvitationDetails,
  getInvitationMonogram,
  invitationMapEmbedUrl,
  parseInvitationDate,
  type InvitationDetails,
} from "./invitation-details";
import { ThemeLoop } from "./theme-loop";
import { invitationArt } from "./invitation-art";
import { CouplePortraits, InvitationStage } from "./invitation-stage";
import { CurtainStage } from "./invitation-curtain";
import { MughalMoonFilm } from "./invitation-film-player";
import { LiveReelHero, ReelInterlude } from "./invitation-reel";
import { LivingScene, MandapStage, riteBlessing } from "./invitation-rite";
import { InvitationRsvp } from "./invitation-rsvp";
import {
  invitationFrameworks,
  invitationLayoutFor,
  invitationThemes,
  type InvitationTheme,
} from "./invitation-options";
import {
  BaagCover,
  BaagStage,
  ChandBaghCover,
  ChandBaghStage,
  ChhatriDawnCover,
  ChhatriDawnStage,
  InkCover,
  LayoutInterlude,
  MelaCover,
  MelaMaidanStage,
  SingleStrokeStage,
  WorldInterlude,
} from "./invitation-layouts";
import { CardWorld, PlayTheCard, WorldProvider, WorldSparkle } from "./invitation-world";
import { isInteractiveLayout, mascotsForTheme, playfulCopy } from "./invitation-options";
import { useInvitedGuestName } from "@/hooks/use-invited-guest";
import { CatMascot, SquirrelMascot } from "./invitation-world";
import {
  ArchOutline,
  InvitationCorners,
  InviteCrest,
  InviteMonogram,
  SuiteHeading,
} from "./invitation-ornaments";
import { PersonalConcierge } from "./personal-concierge";
import { InvitationMusicPlayer } from "./invitation-music-player";
import { sendInvitationMusicCommand } from "./invitation-music";
import { InvitationGallery } from "./invitation-gallery";
import { InvitationWishes } from "./invitation-wishes";

function directionsUrl(venue: string, address: string): string | null {
  const location = [venue, address].filter(Boolean).join(", ");
  return location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    : null;
}

function datePlate(value: string) {
  const parts = parseInvitationDate(value);
  if (!parts) return null;
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

/** Cover thumbnails are a preview of the actual card, not generic dashboard art. */
export function InvitationCover({ content }: { content: unknown }) {
  const details = getInvitationDetails(content);
  const framework = invitationFrameworks.find((value) => value.id === details.framework);
  const theme = invitationThemes.find((value) => value.id === details.theme);
  const layout = invitationLayoutFor(details.theme, details.framework);
  const monogram = getInvitationMonogram(details);
  const plate = datePlate(details.date);
  const blessing = details.theme === "mecca_madinah" || details.framework === "moonlit";

  return (
    <div
      data-theme={details.theme}
      data-framework={details.framework}
      data-layout={layout}
      className="personal-invite-cover relative isolate overflow-hidden text-center text-foreground"
    >
      <img
        src={invitationArt[details.theme]}
        alt=""
        aria-hidden="true"
        className="cover-art absolute inset-0 -z-30 h-full w-full object-cover"
      />
      <ThemeLoop theme={details.theme} className="cover-art -z-30 object-cover" />
      <div className="invite-cover-wash absolute inset-0 -z-20" aria-hidden="true" />
      <div className="cover-glow absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="cover-outline pointer-events-none absolute inset-3 rounded-[45%_45%_0.75rem_0.75rem/19%_19%_0.75rem_0.75rem] border border-gold/70"
        aria-hidden="true"
      />
      <div
        className="cover-outline-inner pointer-events-none absolute inset-[18px] rounded-[46%_46%_0.5rem_0.5rem/20%_20%_0.5rem_0.5rem] border border-gold/25"
        aria-hidden="true"
      />
      <InvitationCorners />
      {layout === "chhatri-dawn" ? (
        <ChhatriDawnCover details={details} />
      ) : layout === "baag" ? (
        <BaagCover details={details} />
      ) : layout === "single-stroke" ? (
        <InkCover details={details} />
      ) : layout === "chand-bagh" ? (
        <ChandBaghCover details={details} />
      ) : layout === "mela-maidan" ? (
        <MelaCover details={details} />
      ) : (
        <div className="cover-inner relative flex min-h-[23rem] flex-col items-center justify-center px-7 py-9">
          <div className="cover-blessing flex w-full items-center justify-center gap-2 text-gold">
            <span className="cover-hairline" aria-hidden="true" />
            {riteBlessing(details.theme) ? (
              <p
                dir={riteBlessing(details.theme)?.script === "arabic" ? "rtl" : "ltr"}
                className={`${
                  riteBlessing(details.theme)?.script === "arabic" ? "font-arabic" : "font-sanskrit"
                } text-lg leading-none text-gold`}
              >
                {riteBlessing(details.theme)?.text}
              </p>
            ) : blessing ? (
              <p dir="rtl" className="font-arabic text-lg leading-none text-gold">
                بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
              </p>
            ) : (
              <p className="cover-emblem text-lg leading-none" aria-hidden="true">
                ✧
              </p>
            )}
            <span className="cover-hairline" aria-hidden="true" />
          </div>
          <p className="cover-kicker mt-4 text-[9px] uppercase tracking-[0.26em] text-gold">
            {details.hosts || "Together with their families"}
          </p>

          <InviteMonogram
            left={monogram.left}
            right={monogram.right}
            size="sm"
            className="cover-monogram mt-4"
          />

          <h3 className="cover-names mt-4 flex max-w-full flex-col items-center font-serif leading-tight">
            <span className="max-w-full break-words text-3xl sm:text-4xl">{details.groomName}</span>
            <span className="cover-amp text-gold-shimmer font-script text-2xl">
              {details.framework === "moonlit" ? "weds" : "&"}
            </span>
            <span className="max-w-full break-words text-3xl sm:text-4xl">{details.brideName}</span>
          </h3>

          <CouplePortraits details={details} compact />

          <div className="cover-date-plate mt-4">
            {plate ? (
              <>
                <span className="cover-date-day">{plate.day}</span>
                <span className="cover-date-divider" aria-hidden="true" />
                <span className="cover-date-copy">
                  <span className="cover-date-month">
                    {plate.month} {plate.year}
                  </span>
                  {details.time && <span className="cover-date-time">{details.time}</span>}
                </span>
              </>
            ) : (
              <span className="cover-date-fallback">{details.date || "Date to be announced"}</span>
            )}
          </div>
          {plate && <span className="sr-only">{details.date}</span>}

          {details.venue && (
            <p className="cover-venue mt-3 flex items-center gap-1.5 font-serif text-sm italic">
              <MapPin className="h-3 w-3 text-gold" aria-hidden="true" />
              <span className="line-clamp-2">{details.venue}</span>
            </p>
          )}

          <span className="cover-label mt-5 text-[9px] uppercase tracking-[0.2em] text-gold">
            {theme?.label} · {framework?.label}
          </span>
        </div>
      )}
      <span className="cover-sheen" aria-hidden="true" />
    </div>
  );
}

/**
 * Keeps the chosen theme present from the hero to the footer: the artwork sits
 * behind the whole card as a soft, blurred wash, and the theme's own motif
 * repeats down the page so nothing turns into a plain white scroll.
 */
function ThemeBackdrop({ theme, art }: { theme: InvitationTheme; art: string }) {
  const immersive = invitationThemes.find((value) => value.id === theme)?.immersive;
  if (!immersive) return null;
  return (
    <div className="invite-backdrop" aria-hidden="true" data-theme={theme}>
      <img src={art} alt="" className="invite-backdrop-art" />
      <span className="invite-backdrop-veil" />
      <span className="invite-backdrop-motif" />
      <LivingScene theme={theme} variant="page" />
    </div>
  );
}

function InvitationExtras({
  details,
  inline = false,
  slug,
  preview = false,
}: {
  details: ReturnType<typeof getInvitationDetails>;
  inline?: boolean;
  slug?: string;
  preview?: boolean;
}) {
  const assistantName = getInvitationAssistantName(details);
  const showSoundtrackPlayer = details.songs.length > 0;
  if (inline) {
    return (
      <section id="assistant" className="invite-section invite-extras px-6 py-20 sm:py-24">
        <SuiteHeading eyebrow="At your service">
          Meet {assistantName}, your host assistant
        </SuiteHeading>
        <p className="mx-auto -mt-8 mb-10 max-w-2xl text-center text-sm text-muted-foreground">
          Every invitation has its own AI guide, named after its host. Ask about the date, venue,
          dress code, the soundtrack or RSVP — answers come from this card only.
        </p>
        <div
          className={`mx-auto grid max-w-5xl gap-6 ${showSoundtrackPlayer ? "lg:grid-cols-[1.15fr_0.85fr]" : "max-w-2xl"}`}
        >
          <PersonalConcierge details={details} slug={slug} preview={preview} inline />
          {showSoundtrackPlayer && <InvitationMusicPlayer details={details} inline />}
        </div>
      </section>
    );
  }
  return (
    <>
      <PersonalConcierge details={details} slug={slug} preview={preview} />
      {showSoundtrackPlayer && <InvitationMusicPlayer details={details} />}
    </>
  );
}

/**
 * Section titles speak plainly everywhere, and like a game in the two
 * interactive worlds. The fallback is exactly the copy every other theme uses.
 */
function SectionHeading({
  layout,
  section,
  eyebrow,
  children,
}: {
  layout: ReturnType<typeof invitationLayoutFor>;
  section: Parameters<typeof playfulCopy>[1];
  eyebrow: string;
  children: ReactNode;
}) {
  const copy = playfulCopy(layout, section);
  return <SuiteHeading eyebrow={copy?.eyebrow ?? eyebrow}>{copy?.title ?? children}</SuiteHeading>;
}

/** A collectible star, only in the interactive worlds. */
function Sparkle({
  layout,
  index,
}: {
  layout: ReturnType<typeof invitationLayoutFor>;
  index: number;
}) {
  if (!isInteractiveLayout(layout)) return null;
  return <WorldSparkle index={index} />;
}

/** Entire invitation is driven by its own card; never borrows the homepage's photos, story or RSVP. */
export function PersonalInvitation({
  title,
  content,
  cardId,
  slug,
  showGate = true,
  preview = false,
  demoPhotos,
}: {
  title: string;
  content: unknown;
  cardId?: string;
  slug?: string;
  showGate?: boolean;
  preview?: boolean;
  /**
   * Theme demos carry bundled artwork (a portrait pair plus gallery frames)
   * instead of the base64 uploads a real card stores, so the demo can show a
   * complete card — portraits, gallery and all — without asking anyone to
   * upload eight photos.
   */
  demoPhotos?: { groom?: string; bride?: string; gallery?: { src: string; caption: string }[] };
}) {
  const base = getInvitationDetails(content);
  const details = demoPhotos
    ? {
        ...base,
        groomPhoto: demoPhotos.groom ?? base.groomPhoto,
        bridePhoto: demoPhotos.bride ?? base.bridePhoto,
      }
    : base;
  const countdownDate = getInvitationCountdownDate(details);
  const calendarUrl = buildInvitationCalendarUrl(details);
  const mapUrl = details.mapUrl || directionsUrl(details.venue, details.address);
  const dateLine = [details.date, details.time].filter(Boolean).join(" · ");
  const gateDateLine = [details.date, details.venue].filter(Boolean).join(" · ");
  const art = invitationArt[details.theme];
  const layout = invitationLayoutFor(details.theme, details.framework);
  const interactive = isInteractiveLayout(layout);
  const storybook = isStorybook(details.theme);
  const hasSongs = details.songs.length > 0;
  const gateActive = !preview && showGate && details.elements.gate;

  useEffect(() => {
    if (preview || !hasSongs || gateActive) return;
    let started = false;
    const trigger = (event: Event) => {
      if (started) return;
      started = true;
      window.removeEventListener("pointerdown", trigger, true);
      window.removeEventListener("keydown", trigger, true);
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest(".invite-music-toggle, .invite-music-panel")) return;
      sendInvitationMusicCommand({ action: "play", index: 0 });
    };
    window.addEventListener("pointerdown", trigger, { capture: true, once: true });
    window.addEventListener("keydown", trigger, { capture: true, once: true });
    return () => {
      window.removeEventListener("pointerdown", trigger, true);
      window.removeEventListener("keydown", trigger, true);
    };
  }, [preview, hasSongs, gateActive]);

  const guestName = useInvitedGuestName();
  // The film theme has no gate and no poster: the hero itself is the film,
  // already running. "Watch the film" opens the full cut with sound on top.
  const isFilmTheme = details.theme === "mughal-moon-film";
  const [filmOpen, setFilmOpen] = useState(false);
  const openFilm = () => {
    setFilmOpen(true);
    window.dispatchEvent(new CustomEvent("invite:close-music"));
  };
  const closeFilm = () => setFilmOpen(false);
  const mascots = mascotsForTheme(details.theme);
  const play = (section: Parameters<typeof playfulCopy>[1]) => playfulCopy(layout, section);
  const monogram = getInvitationMonogram(details);
  const assistantName = getInvitationAssistantName(details);
  const plate = datePlate(details.date);
  const hostLine =
    details.hostName ||
    details.contactName ||
    (/^together with/i.test(details.hosts) ? "" : details.hosts) ||
    `${details.groomName} & ${details.brideName}`;
  const scrollTo =
    countdownDate && details.elements.countdown
      ? "#countdown"
      : details.elements.message
        ? "#message"
        : "#celebration";
  const actions = (
    <>
      {calendarUrl && (
        <a
          href={calendarUrl}
          target="_blank"
          rel="noreferrer"
          className="btn-shimmer inline-flex items-center gap-2 rounded-full border border-gold px-7 py-3 text-xs uppercase tracking-[0.2em] text-gold-light transition hover:scale-105 hover:bg-gold/10"
        >
          <CalendarHeart className="h-4 w-4" /> Save the Date
        </a>
      )}
      <a
        href="#celebration"
        className="btn-shimmer bg-gold-gradient inline-flex items-center gap-2 rounded-full px-7 py-3 text-xs font-medium uppercase tracking-[0.2em] text-burgundy-deep transition hover:scale-105 hover:shadow-gold"
      >
        <SparklesIcon className="h-4 w-4" /> See the celebration
      </a>
    </>
  );

  const page = (
    <div
      data-theme={details.theme}
      data-framework={details.framework}
      data-layout={layout}
      data-interactive={interactive ? "true" : undefined}
      className="personal-invite min-h-screen overflow-x-clip bg-background text-foreground"
    >
      {!storybook && <ThemeBackdrop theme={details.theme} art={art} />}
      {storybook && (
        <StorybookEntry
          details={details}
          enabled={showGate && details.elements.gate}
          onEnter={
            !preview && hasSongs
              ? () => sendInvitationMusicCommand({ action: "play", index: 0 })
              : undefined
          }
        />
      )}
      {interactive && (
        <CardWorld
          layout={layout}
          details={details}
          cardKey={cardId || slug || `preview-${details.theme}`}
          guestName={guestName}
        />
      )}
      {isFilmTheme && filmOpen && (
        <MughalMoonFilm details={details} preview={preview} autoStart onEnter={closeFilm} />
      )}
      {!storybook && !isFilmTheme && showGate && !preview && details.elements.gate && (
        <Preloader
          onDone={() => window.dispatchEvent(new Event("wedding:revealed"))}
          onEnter={
            hasSongs ? () => sendInvitationMusicCommand({ action: "play", index: 0 }) : undefined
          }
          groomName={details.groomName}
          brideName={details.brideName}
          dateLine={gateDateLine}
          enableMusic={false}
          backgroundImage={art}
          curtain={details.framework === "curtain-call"}
          theme={details.theme}
        />
      )}
      {!preview && (
        <header className="wedding-header sticky inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6">
          <nav
            aria-label="Invitation sections"
            className="wedding-nav glass-card mx-auto flex max-w-6xl items-center justify-between gap-3 rounded-full px-4 py-2.5 shadow-gold sm:px-6"
          >
            <a
              href="#invitation-top"
              className="invite-nav-brand min-w-0"
              aria-label={`${details.groomName} and ${details.brideName} — back to top`}
            >
              <InviteMonogram left={monogram.left} right={monogram.right} size="sm" />
              <span className="min-w-0 truncate">
                <span className="block font-script text-xl leading-none text-gold sm:text-2xl">
                  {details.groomName[0]} &amp; {details.brideName[0]}
                </span>
                <span className="hidden text-[8px] uppercase tracking-[0.2em] text-muted-foreground sm:block">
                  {details.date}
                </span>
              </span>
            </a>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.15em] text-foreground sm:gap-6 sm:text-xs">
              <a href="#celebration" className="transition hover:text-gold">
                Celebration
              </a>
              {details.elements.gallery && (
                <a href="#gallery" className="hidden transition hover:text-gold sm:inline">
                  Gallery
                </a>
              )}
              {details.elements.venueMap && (
                <a href="#venue" className="transition hover:text-gold">
                  Venue
                </a>
              )}
              {details.elements.rsvp && (
                <a href="#rsvp" className="transition hover:text-gold">
                  RSVP
                </a>
              )}
              <button
                type="button"
                className="hidden items-center gap-1.5 rounded-full border border-gold/40 px-3 py-1 text-gold transition hover:bg-gold/10 sm:inline-flex"
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("invite:close-music"));
                  window.dispatchEvent(new CustomEvent("invite:open-concierge"));
                }}
                title={`Ask ${assistantName}`}
              >
                <SparklesIcon className="h-3 w-3" aria-hidden="true" /> Ask {assistantName}
              </button>
            </div>
          </nav>
        </header>
      )}

      <CinematicHero
        theme={details.theme}
        waitingForGate={
          !isFilmTheme && showGate && details.elements.gate && (storybook || !preview)
        }
      >
        {storybook ? (
          <StorybookHero details={details} actions={actions} motion={details.elements.gate} />
        ) : layout === "reel" ? (
          <LiveReelHero
            details={details}
            actions={actions}
            scrollTo={scrollTo}
            autoPlay={details.elements.gate}
            onWatchFilm={openFilm}
          />
        ) : layout === "chhatri-dawn" ? (
          <ChhatriDawnStage
            details={details}
            backgroundImage={art}
            actions={actions}
            scrollTo={scrollTo}
            entranceDelay={showGate && details.elements.gate && !preview ? 2.7 : 0}
          />
        ) : layout === "baag" ? (
          <BaagStage
            details={details}
            backgroundImage={art}
            actions={actions}
            scrollTo={scrollTo}
            entranceDelay={showGate && details.elements.gate && !preview ? 2.7 : 0}
          />
        ) : layout === "single-stroke" ? (
          <SingleStrokeStage
            details={details}
            backgroundImage={art}
            actions={actions}
            scrollTo={scrollTo}
            entranceDelay={showGate && details.elements.gate && !preview ? 2.7 : 0}
          />
        ) : layout === "chand-bagh" ? (
          <ChandBaghStage
            details={details}
            backgroundImage={art}
            actions={actions}
            scrollTo={scrollTo}
            entranceDelay={showGate && details.elements.gate && !preview ? 2.7 : 0}
          />
        ) : layout === "mela-maidan" ? (
          <MelaMaidanStage
            details={details}
            backgroundImage={art}
            actions={actions}
            scrollTo={scrollTo}
            entranceDelay={showGate && details.elements.gate && !preview ? 2.7 : 0}
          />
        ) : layout === "moonlit" ? (
          <div id="invitation-top" className="invite-hero-wrap">
            <Hero
              theme={details.theme}
              groomName={details.groomName}
              brideName={details.brideName}
              dateLine={
                dateLine || "Together with our families, we invite you to celebrate with us"
              }
              entranceDelay={showGate && details.elements.gate && !preview ? 3 : 0}
              compactNames
              scrollTo={scrollTo}
              actions={actions}
              backgroundImage={art}
              portraits={<CouplePortraits details={details} />}
            />
            <div className="invite-hero-frame" aria-hidden="true">
              <span className="invite-hero-arch" />
              <span className="invite-hero-star invite-hero-star-left">✦</span>
              <span className="invite-hero-star invite-hero-star-right">✦</span>
            </div>
          </div>
        ) : layout === "curtain-call" ? (
          <CurtainStage
            details={details}
            backgroundImage={art}
            actions={actions}
            scrollTo={scrollTo}
            entranceDelay={showGate && details.elements.gate && !preview ? 2.7 : 0}
          />
        ) : layout === "mandap" ? (
          <MandapStage
            details={details}
            backgroundImage={art}
            actions={actions}
            scrollTo={scrollTo}
            entranceDelay={showGate && details.elements.gate && !preview ? 2.7 : 0}
          />
        ) : (
          <InvitationStage
            details={details}
            backgroundImage={art}
            actions={actions}
            scrollTo={scrollTo}
            entranceDelay={showGate && details.elements.gate && !preview ? 2.7 : 0}
          />
        )}
      </CinematicHero>
      {interactive && (
        <div className="invite-guest-ribbon">
          <span>
            {guestName ? (
              <>
                Dear <strong>{guestName}</strong>, the{" "}
                {layout === "mela-maidan" ? "mela" : "garden"} has been waiting for you.
              </>
            ) : (
              <>
                Dear friend, {mascots?.cat ?? "Noor"} and {mascots?.squirrel ?? "Gul"} saved you a
                place.
              </>
            )}
          </span>
          <a href="#play">Play the card</a>
        </div>
      )}

      {countdownDate && details.elements.countdown && (
        <div className="invite-countdown-wrap">
          <Countdown
            weddingDate={countdownDate}
            waitingText="Until We Celebrate Together"
            reachedText="Our Celebration Has Arrived"
            eyebrow="The countdown"
            title="Counting Down to Forever"
          />
        </div>
      )}

      {layout === "reel" ? (
        <ReelInterlude details={details} />
      ) : (
        <LayoutInterlude layout={layout} details={details} />
      )}
      <WorldInterlude layout={layout} details={details} />

      {details.elements.message && (
        <section
          id="message"
          className="invite-section invite-suite invite-suite-note relative overflow-hidden px-6 py-20 sm:py-28"
        >
          <Sparkle layout={layout} index={0} />
          <SectionHeading layout={layout} section="message" eyebrow="With love">
            A Note From Us
          </SectionHeading>
          <motion.div {...fadeUp} className="invite-note-card mx-auto max-w-3xl">
            <InvitationCorners />
            <span className="invite-note-seal">
              <InviteMonogram left={monogram.left} right={monogram.right} size="md" />
            </span>
            <Heart className="invite-note-heart h-5 w-5" aria-hidden="true" />
            <p className="invite-note-text whitespace-pre-wrap">
              {details.message || "Your presence would make our celebration even more special."}
            </p>
            <p className="invite-note-signature">
              With love,
              <span className="font-script">
                {details.groomName} &amp; {details.brideName}
              </span>
            </p>
          </motion.div>
        </section>
      )}

      {details.elements.story && details.story && (
        <section
          id="story"
          className="invite-section invite-suite invite-suite-story relative overflow-hidden px-6 py-20 sm:py-28"
        >
          <Sparkle layout={layout} index={1} />
          <SectionHeading layout={layout} section="story" eyebrow="Our journey">
            The Story So Far
          </SectionHeading>
          <motion.div {...fadeUp} className="invite-story-panel mx-auto max-w-4xl">
            <Quote className="invite-story-quote h-10 w-10" aria-hidden="true" />
            <p className="invite-story-text whitespace-pre-wrap">{details.story}</p>
            <div className="invite-story-signoff">
              <span className="invite-story-rule" aria-hidden="true" />
              <span>
                {details.groomName} &amp; {details.brideName}
              </span>
              <span className="invite-story-rule" aria-hidden="true" />
            </div>
          </motion.div>
        </section>
      )}

      {details.elements.gallery && (
        <div className="invite-sparkle-host">
          <Sparkle layout={layout} index={6} />
          <InvitationGallery
            cardId={cardId}
            details={details}
            preview={preview}
            heading={play("gallery") ?? undefined}
            demoPhotos={demoPhotos?.gallery}
          />
        </div>
      )}

      {interactive && <PlayTheCard layout={layout} details={details} guestName={guestName} />}

      <section
        id="celebration"
        className="invite-section invite-suite invite-suite-celebration relative overflow-hidden px-6 py-20 sm:py-28"
      >
        <Sparkle layout={layout} index={2} />
        <SectionHeading layout={layout} section="celebration" eyebrow="Join us">
          The Celebration
        </SectionHeading>
        <motion.div {...fadeUp} className="invite-celebration mx-auto max-w-5xl">
          <div className="invite-date-plate">
            <ArchOutline className="invite-date-arch" />
            <span className="invite-date-overline">Save the date</span>
            {plate ? (
              <>
                <span className="invite-date-day">{plate.day}</span>
                <span className="invite-date-month">{plate.month}</span>
                <span className="invite-date-year">{plate.year}</span>
                {details.time && (
                  <span className="invite-date-time">
                    <Clock3 className="h-3.5 w-3.5" aria-hidden="true" /> {details.time}
                  </span>
                )}
                <span className="invite-date-weekday">{plate.weekday}</span>
              </>
            ) : (
              <span className="invite-date-fallback">{details.date || "Date to be announced"}</span>
            )}
            <span className="invite-date-star" aria-hidden="true">
              ✦
            </span>
          </div>

          <div className="invite-celebration-details">
            <p className="invite-mini-eyebrow">{details.eventType || title}</p>
            <h3 className="invite-celebration-names">
              {details.groomName} <span className="font-script text-gold">&amp;</span>{" "}
              {details.brideName}
            </h3>
            <p className="invite-celebration-intro">
              {details.hosts || "Together with their families"}
            </p>
            <div className="invite-rule" aria-hidden="true" />
            <dl className="invite-facts">
              <div className="invite-fact">
                <dt>
                  <CalendarDays className="h-4 w-4" aria-hidden="true" /> When
                </dt>
                <dd>
                  {details.date || "To be announced"}
                  {details.time ? ` · ${details.time}` : ""}
                </dd>
              </div>
              <div className="invite-fact">
                <dt>
                  <MapPin className="h-4 w-4" aria-hidden="true" /> Where
                </dt>
                <dd>
                  {details.venue || "Venue to be announced"}
                  {details.address && <span>{details.address}</span>}
                </dd>
              </div>
              {details.dressCode && (
                <div className="invite-fact">
                  <dt>
                    <SparklesIcon className="h-4 w-4" aria-hidden="true" /> Attire
                  </dt>
                  <dd>{details.dressCode}</dd>
                </div>
              )}
              {details.songs.length > 0 && (
                <div className="invite-fact">
                  <dt>
                    <Music2 className="h-4 w-4" aria-hidden="true" /> Soundtrack
                  </dt>
                  <dd>
                    {details.songs
                      .slice(0, 3)
                      .map((song) => song.title)
                      .join(" · ")}
                    {details.songs.length > 3 ? ` · +${details.songs.length - 3} more` : ""}
                  </dd>
                </div>
              )}
            </dl>
            <div className="invite-celebration-actions">
              {mapUrl && details.elements.venueMap && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-shimmer bg-gold-gradient inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs uppercase tracking-[0.18em] text-burgundy-deep transition hover:scale-105"
                >
                  <MapPin className="h-4 w-4" /> Get Directions
                </a>
              )}
              {calendarUrl && (
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-gold px-6 py-3 text-xs uppercase tracking-[0.18em] text-gold transition hover:bg-gold/10"
                >
                  <CalendarPlus className="h-4 w-4" /> Add to Calendar
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </section>

      {details.elements.schedule && details.additionalEvents.length > 0 && (
        <section
          id="schedule"
          className="invite-section invite-suite invite-suite-schedule relative overflow-hidden px-6 py-20 sm:py-28"
        >
          <Sparkle layout={layout} index={3} />
          <SectionHeading layout={layout} section="schedule" eyebrow="All our moments">
            The Wedding Events
          </SectionHeading>
          <div className="invite-timeline mx-auto max-w-3xl">
            <article className="invite-timeline-item">
              <span className="invite-timeline-marker">01</span>
              <div className="invite-timeline-card">
                <p className="invite-mini-eyebrow">Main celebration</p>
                <h3>{details.eventType || title}</h3>
                <p className="invite-timeline-meta">
                  {details.date}
                  {details.time ? ` · ${details.time}` : ""}
                </p>
                <p className="invite-timeline-venue">
                  {details.venue}
                  {details.address ? `, ${details.address}` : ""}
                </p>
                {calendarUrl && (
                  <a
                    href={calendarUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="invite-text-link"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" /> Add to calendar
                  </a>
                )}
              </div>
            </article>
            {details.additionalEvents.map((event, index) => (
              <motion.article
                {...fadeUp}
                key={`${index}-${event.title}`}
                className="invite-timeline-item"
              >
                <span className="invite-timeline-marker">0{index + 2}</span>
                <div className="invite-timeline-card">
                  <h3>{event.title}</h3>
                  <p className="invite-timeline-meta">
                    {event.date} · {event.time}
                  </p>
                  <p className="invite-timeline-venue">
                    {event.venue}
                    {event.address ? `, ${event.address}` : ""}
                  </p>
                  <div className="invite-timeline-links">
                    {details.elements.venueMap && (
                      <a
                        href={directionsUrl(event.venue, event.address) || "#celebration"}
                        target="_blank"
                        rel="noreferrer"
                        className="invite-text-link"
                      >
                        <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Directions
                      </a>
                    )}
                    {(() => {
                      const eventCalendar = buildInvitationEventCalendarUrl(details, event);
                      return (
                        eventCalendar && (
                          <a
                            href={eventCalendar}
                            target="_blank"
                            rel="noreferrer"
                            className="invite-text-link"
                          >
                            <CalendarPlus className="h-3.5 w-3.5" aria-hidden="true" /> Add to
                            calendar
                          </a>
                        )
                      );
                    })()}
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </section>
      )}

      {details.elements.venueMap && (
        <section
          id="venue"
          className="invite-section invite-suite invite-suite-venue relative overflow-hidden px-6 py-20 sm:py-28"
        >
          <Sparkle layout={layout} index={4} />
          <SectionHeading layout={layout} section="venue" eyebrow="Find us">
            Where We’ll Celebrate
          </SectionHeading>
          <motion.div {...fadeUp} className="invite-venue-card mx-auto max-w-3xl">
            <InvitationCorners />
            <span className="invite-venue-lamp" aria-hidden="true">
              <HangingLampMini />
            </span>
            <div className="invite-venue-copy">
              <p className="invite-mini-eyebrow">The venue</p>
              <h3>{details.venue || "Venue to be announced"}</h3>
              {details.address && <p className="invite-venue-address">{details.address}</p>}
              {details.arrivalNotes && (
                <p className="invite-venue-notes whitespace-pre-wrap">{details.arrivalNotes}</p>
              )}
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-shimmer bg-gold-gradient mt-7 inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs uppercase tracking-[0.18em] text-burgundy-deep transition hover:scale-105"
                >
                  <MapPin className="h-4 w-4" /> Open in Google Maps
                </a>
              )}
            </div>
          </motion.div>
          <InvitationVenueMap details={details} />
        </section>
      )}

      {details.elements.dressCode && details.dressCode && (
        <section
          id="dress-code"
          className="invite-section invite-suite invite-suite-dress relative overflow-hidden px-6 py-20 sm:py-24"
        >
          <Sparkle layout={layout} index={5} />
          <SectionHeading layout={layout} section="dressCode" eyebrow="What to wear">
            Dress Code
          </SectionHeading>
          <motion.div {...fadeUp} className="invite-dress-card mx-auto max-w-2xl">
            <span className="invite-dress-swatch invite-dress-swatch-one" aria-hidden="true" />
            <span className="invite-dress-swatch invite-dress-swatch-two" aria-hidden="true" />
            <span className="invite-dress-swatch invite-dress-swatch-three" aria-hidden="true" />
            <p className="invite-dress-text">{details.dressCode}</p>
            <p className="invite-dress-note">
              Wear what makes you feel celebratory — these colours simply echo the day.
            </p>
          </motion.div>
        </section>
      )}

      {details.elements.gifts && details.giftsNote && (
        <section
          id="gifts"
          className="invite-section invite-suite invite-suite-gifts relative overflow-hidden px-6 py-20 sm:py-24"
        >
          <SectionHeading layout={layout} section="gifts" eyebrow="With gratitude">
            Gifts &amp; Blessings
          </SectionHeading>
          <motion.div {...fadeUp} className="invite-gift-card mx-auto max-w-2xl">
            <InvitationCorners />
            <Gift className="invite-gift-icon h-6 w-6" aria-hidden="true" />
            <p className="invite-gift-text whitespace-pre-wrap">{details.giftsNote}</p>
            <p className="invite-gift-signoff">
              {details.groomName} &amp; {details.brideName}
            </p>
          </motion.div>
        </section>
      )}

      {details.elements.livestream && details.livestreamUrl && (
        <section
          id="livestream"
          className="invite-section invite-suite invite-suite-live relative overflow-hidden px-6 py-20 text-center sm:py-24"
        >
          <SectionHeading layout={layout} section="livestream" eyebrow="From anywhere">
            Join the Live Stream
          </SectionHeading>
          <motion.div {...fadeUp} className="invite-live-card mx-auto max-w-lg">
            <span className="invite-live-dot" aria-hidden="true" />
            <p className="invite-live-title">The ceremony, live</p>
            <p className="invite-live-copy">
              For family who cannot travel, the celebration will be streamed here. The link opens
              the host&rsquo;s own room — nothing is recorded by us.
            </p>
            <a
              href={details.livestreamUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-shimmer bg-gold-gradient mt-6 inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs uppercase tracking-[0.18em] text-burgundy-deep transition hover:scale-105"
            >
              <Video className="h-4 w-4" aria-hidden="true" /> Join the live stream
            </a>
          </motion.div>
        </section>
      )}

      {details.elements.contact && (details.contactName || details.contactPhone) && (
        <section
          id="contact"
          className="invite-section invite-suite invite-suite-contact px-6 py-20 text-center sm:py-24"
        >
          <SectionHeading layout={layout} section="contact" eyebrow="Need anything?">
            Contact the Host
          </SectionHeading>
          <div className="invite-contact-card mx-auto max-w-lg">
            <p className="font-serif text-2xl">{details.contactName || details.hostName}</p>
            {details.contactPhone && (
              <a
                href={`tel:${details.contactPhone.replace(/[^+0-9]/g, "")}`}
                className="invite-contact-phone"
              >
                <Phone className="h-4 w-4" aria-hidden="true" /> {details.contactPhone}
              </a>
            )}
            <p className="invite-contact-assistant">
              Or ask <strong>{assistantName}</strong>, this invitation’s AI host assistant.
            </p>
          </div>
        </section>
      )}

      {details.elements.rsvp && (
        <div className="invite-rsvp-shell invite-sparkle-host">
          <Sparkle layout={layout} index={7} />
          <InvitationRsvp
            cardId={cardId}
            deadline={details.rsvpDeadline}
            theme={details.theme}
            preview={preview}
            heading={play("rsvp") ?? undefined}
          />
        </div>
      )}

      {details.elements.wishes && (
        <div className="invite-sparkle-host">
          <Sparkle layout={layout} index={8} />
          <InvitationWishes
            cardId={cardId}
            details={details}
            preview={preview}
            heading={play("wishes") ?? undefined}
          />
        </div>
      )}

      {!preview && slug && <InvitationShare details={details} slug={slug} layout={layout} />}

      {preview ? (
        <InvitationExtras details={details} inline preview={preview} />
      ) : (
        <InvitationExtras details={details} slug={slug} preview={preview} />
      )}

      <footer className="invite-footer relative overflow-hidden px-6 py-20 text-center">
        <div className="invite-footer-ornament" aria-hidden="true">
          <ArchOutline />
        </div>
        <InviteCrest className="invite-footer-crest" />
        <InviteMonogram left={monogram.left} right={monogram.right} size="lg" className="mt-4" />
        <p className="invite-footer-names mt-6 break-words font-script text-4xl sm:text-5xl">
          {details.groomName} &amp; {details.brideName}
        </p>
        {details.date && <p className="invite-footer-date">{details.date}</p>}
        {hostLine && (
          <p className="invite-footer-host">
            Hosted with love by <span>{hostLine}</span>
          </p>
        )}
        {details.hashtag && (
          <p className="invite-footer-hashtag" aria-label="Wedding hashtag">
            {details.hashtag}
          </p>
        )}
        <div className="invite-footer-rule" aria-hidden="true">
          <span />
          <span className="invite-footer-diamond" />
          <span />
        </div>
        {!preview && (
          <a href="/dashboard" className="invite-footer-link">
            Create your own invitation
          </a>
        )}
      </footer>
    </div>
  );

  return interactive ? (
    <WorldProvider cardKey={cardId || slug || `preview-${details.theme}`}>{page}</WorldProvider>
  ) : (
    page
  );
}

/**
 * Same interactive behaviour as the main invitation's venue section: one tab per
 * celebration, an embedded map, and a link out — built from this card's venues only.
 */
function InvitationVenueMap({ details }: { details: InvitationDetails }) {
  const locations = [
    {
      label: details.eventType || "Main celebration",
      date: details.date,
      time: details.time,
      venue: details.venue,
      address: details.address,
      mapUrl: details.mapUrl,
    },
    ...details.additionalEvents.map((event) => ({
      label: event.title,
      date: event.date,
      time: event.time,
      venue: event.venue,
      address: event.address,
      mapUrl: "",
    })),
  ].filter((location) => location.venue.trim().length > 0);
  const [active, setActive] = useState(0);

  if (locations.length === 0) return null;
  const current = locations[Math.min(active, locations.length - 1)];
  const embed = invitationMapEmbedUrl([current.venue, current.address].filter(Boolean).join(", "));
  const external = current.mapUrl || directionsUrl(current.venue, current.address);

  return (
    <motion.div {...fadeUp} className="invite-venue-map mx-auto mt-10 max-w-3xl">
      {locations.length > 1 && (
        <div role="tablist" aria-label="Celebration venues" className="invite-map-tabs">
          {locations.map((location, index) => (
            <button
              key={`${index}-${location.label}`}
              type="button"
              role="tab"
              aria-selected={index === Math.min(active, locations.length - 1)}
              className={`invite-map-tab ${index === Math.min(active, locations.length - 1) ? "is-active" : ""}`}
              onClick={() => setActive(index)}
            >
              {location.label}
            </button>
          ))}
        </div>
      )}
      {embed && (
        <div className="invite-map-frame">
          <iframe
            key={`${current.venue}-${current.address}`}
            title={`Map of ${current.venue}`}
            src={embed}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      )}
      <div className="invite-map-meta">
        <p className="invite-map-venue">
          {current.label} · {current.venue}
        </p>
        <p className="invite-map-when">
          {[current.date, current.time].filter(Boolean).join(" · ") || "Details to be announced"}
        </p>
        {external && (
          <a href={external} target="_blank" rel="noreferrer" className="invite-text-link">
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" /> Open in Google Maps
          </a>
        )}
      </div>
    </motion.div>
  );
}

/**
 * Share panel: a personalised link per guest, copy, and WhatsApp — the same
 * convenience the main invitation's footer offers, driven by this card's slug.
 */
function InvitationShare({
  details,
  slug,
  layout,
}: {
  details: InvitationDetails;
  slug: string;
  layout: ReturnType<typeof invitationLayoutFor>;
}) {
  const [guest, setGuest] = useState("");
  const [copied, setCopied] = useState(false);

  function buildLink(): string {
    const origin = typeof window === "undefined" ? "" : window.location.origin;
    const name = guest.trim();
    return `${origin}/invite/${slug}${name ? `?guest=${encodeURIComponent(name)}` : ""}`;
  }

  async function copy() {
    const link = buildLink();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Personalised invitation link copied");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast("Copy this link: " + link);
    }
  }

  function whatsapp() {
    const name = guest.trim();
    const greeting = name ? `Dear ${name}, ` : "";
    const message = `${greeting}you are warmly invited to celebrate with ${details.groomName} & ${details.brideName}${details.date ? ` on ${details.date}` : ""}${details.venue ? ` at ${details.venue}` : ""}. View the invitation and reply here: ${buildLink()}${details.hashtag ? ` ${details.hashtag}` : ""}`;
    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  }

  return (
    <section
      id="share"
      className="invite-section invite-suite invite-suite-share relative overflow-hidden px-6 py-20 text-center sm:py-24"
    >
      <SectionHeading layout={layout} section="share" eyebrow="Pass it on">
        Share the Invitation
      </SectionHeading>
      <motion.div {...fadeUp} className="invite-share-card mx-auto max-w-2xl">
        <p className="invite-share-copy">
          Add a guest or family name to create a personalised link — the greeting follows them to
          the card, and their RSVP is still private.
        </p>
        <div className="invite-share-controls">
          <label className="invite-share-field">
            <span className="sr-only">Guest or family name</span>
            <input
              value={guest}
              onChange={(event) => setGuest(event.target.value)}
              maxLength={80}
              placeholder="e.g. Uncle Ahmed & Family"
            />
          </label>
          <button type="button" className="invite-share-secondary" onClick={() => void copy()}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copied" : "Copy link"}
          </button>
          <button type="button" className="invite-share-primary" onClick={whatsapp}>
            <Share2 className="h-4 w-4" /> WhatsApp
          </button>
        </div>
        <p className="invite-share-hint">
          Shares <span>/invite/{slug}</span> — this couple&rsquo;s own invitation.
        </p>
      </motion.div>
    </section>
  );
}

/* A small inline lamp keeps the venue card self-contained. */
function HangingLampMini() {
  return (
    <svg viewBox="0 0 70 120" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1">
      <path d="M35 0v26" opacity=".5" />
      <path d="M35 26c-11 0-19 9-19 19h38c0-10-8-19-19-19Z" />
      <path d="M18 45h34l-4 23H22Z" opacity=".8" />
      <path d="M30 68c0 6 10 6 10 0M35 68v16" opacity=".6" />
      <path d="M28 84h14l-2 8H30Z" />
      <path d="M35 92v16" opacity=".4" />
      <path
        d="M35 108l2.5 5 5 2.5-5 2.5-2.5 5-2.5-5-5-2.5 5-2.5Z"
        fill="currentColor"
        stroke="none"
        opacity=".8"
      />
    </svg>
  );
}
