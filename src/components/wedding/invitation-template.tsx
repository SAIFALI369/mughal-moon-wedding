import { motion } from "framer-motion";
import { CalendarHeart, CalendarPlus, Heart, MapPin, Sparkles as SparklesIcon } from "lucide-react";

import eidSky from "@/assets/eid-sky.webp";
import { Countdown, Hero, Preloader } from "./sections";
import { Divider, Mandala, SectionTitle, fadeUp } from "./ornaments";
import {
  buildInvitationCalendarUrl,
  getInvitationCountdownDate,
  getInvitationDetails,
} from "./invitation-details";

function directionsUrl(venue: string, address: string): string | null {
  const location = [venue, address].filter(Boolean).join(", ");
  return location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`
    : null;
}

/** The same celestial cover in the dashboard, before and after publishing. */
export function InvitationCover({ content }: { content: unknown }) {
  const details = getInvitationDetails(content);
  return (
    <div
      data-theme={details.theme}
      className="personal-invite-cover relative isolate overflow-hidden text-center text-foreground"
    >
      <img
        src={eidSky}
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 h-full w-full object-cover object-right"
      />
      <div className="invite-cover-wash absolute inset-0 -z-10" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-3 rounded-[45%_45%_0.75rem_0.75rem/19%_19%_0.75rem_0.75rem] border border-gold/70"
        aria-hidden="true"
      />
      <div className="relative flex min-h-72 flex-col items-center justify-center px-7 py-8">
        <p dir="rtl" className="font-arabic text-xl text-gold">
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </p>
        <p className="mt-3 text-[9px] uppercase tracking-[0.28em] text-gold">
          Together with their families
        </p>
        <h3 className="mt-5 flex max-w-full flex-col items-center font-serif text-4xl leading-tight">
          <span className="max-w-full break-words">{details.groomName}</span>
          <span className="text-gold-shimmer font-script text-3xl">weds</span>
          <span className="max-w-full break-words">{details.brideName}</span>
        </h3>
        <div className="my-4 flex items-center gap-2 text-gold" aria-hidden="true">
          <span className="h-px w-10 bg-gold" />
          <span>✧</span>
          <span className="h-px w-10 bg-gold" />
        </div>
        <p className="max-w-full break-words text-[10px] uppercase tracking-[0.17em] text-foreground">
          {details.date || "Date to be announced"}
        </p>
        {details.venue && (
          <p className="mt-1 line-clamp-2 font-serif text-sm italic">{details.venue}</p>
        )}
      </div>
    </div>
  );
}

/** A full invitation for this card only — never renders the main couple's story, RSVP or photos. */
export function PersonalInvitation({
  title,
  content,
  showGate = true,
  preview = false,
}: {
  title: string;
  content: unknown;
  showGate?: boolean;
  preview?: boolean;
}) {
  const details = getInvitationDetails(content);
  const countdownDate = getInvitationCountdownDate(details);
  const calendarUrl = buildInvitationCalendarUrl(details);
  const mapUrl = directionsUrl(details.venue, details.address);
  const dateLine = [details.date, details.time].filter(Boolean).join(" · ");
  const gateDateLine = [details.date, details.venue].filter(Boolean).join(" · ");

  return (
    <div
      data-theme={details.theme}
      className="personal-invite min-h-screen overflow-x-hidden bg-background text-foreground"
    >
      {showGate && (
        <Preloader
          onDone={() => {}}
          groomName={details.groomName}
          brideName={details.brideName}
          dateLine={gateDateLine}
          enableMusic={false}
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
              className="min-w-0 truncate font-script text-2xl text-gold sm:text-3xl"
              aria-label={`${details.groomName} and ${details.brideName} — back to top`}
            >
              {details.groomName[0]} &amp; {details.brideName[0]}
            </a>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.15em] text-foreground sm:gap-6 sm:text-xs">
              <a href="#celebration" className="transition hover:text-gold">
                Celebration
              </a>
              <a href="#venue" className="transition hover:text-gold">
                Venue
              </a>
            </div>
          </nav>
        </header>
      )}

      <div id="invitation-top">
        <Hero
          groomName={details.groomName}
          brideName={details.brideName}
          dateLine={dateLine || "Together with our families, we invite you to celebrate with us"}
          entranceDelay={showGate ? 3 : 0}
          compactNames
          scrollTo={countdownDate ? "#countdown" : "#celebration"}
          actions={
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
          }
        />
      </div>

      {countdownDate && (
        <Countdown
          weddingDate={countdownDate}
          waitingText="Until We Celebrate Together"
          reachedText="Our Celebration Has Arrived"
        />
      )}

      <section id="message" className="relative overflow-hidden px-6 py-20 sm:py-28">
        <Mandala className="pointer-events-none absolute -right-24 top-1/2 h-96 w-96 -translate-y-1/2 text-gold opacity-[0.08]" />
        <SectionTitle eyebrow="With love">A Note From Us</SectionTitle>
        <motion.div
          {...fadeUp}
          className="glass-card gold-corners relative mx-auto max-w-3xl rounded-2xl px-8 py-12 text-center shadow-gold sm:px-16"
        >
          <Heart className="mx-auto mb-7 h-7 w-7 text-gold" aria-hidden="true" />
          <p className="whitespace-pre-wrap font-serif text-xl leading-relaxed text-foreground sm:text-3xl">
            {details.message || "Your presence would make our celebration even more special."}
          </p>
          <p className="mt-8 font-script text-3xl text-gold">
            {details.groomName} &amp; {details.brideName}
          </p>
        </motion.div>
      </section>

      <Divider className="bg-muted" />

      <section id="celebration" className="relative overflow-hidden bg-muted px-6 py-20 sm:py-28">
        <Mandala className="pointer-events-none absolute left-1/2 top-1/2 h-[650px] w-[650px] -translate-x-1/2 -translate-y-1/2 text-gold opacity-[0.07]" />
        <SectionTitle eyebrow="Join us">The Celebration</SectionTitle>
        <motion.div
          {...fadeUp}
          className="glass-card gold-corners relative mx-auto max-w-2xl rounded-2xl p-8 text-center shadow-gold sm:p-12"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold text-gold">
            <CalendarHeart className="h-7 w-7" aria-hidden="true" />
          </div>
          <h3 className="mt-6 break-words font-serif text-3xl text-burgundy sm:text-4xl">
            {title}
          </h3>
          <div className="mx-auto my-5 h-px w-20 bg-gold" />
          {details.date && <p className="font-serif text-2xl">{details.date}</p>}
          {details.time && <p className="mt-2 text-sm text-muted-foreground">{details.time}</p>}
          <p className="mt-6 font-serif text-2xl text-burgundy">
            {details.venue || "Venue to be announced"}
          </p>
          {details.address && (
            <p className="mt-2 text-sm text-muted-foreground">{details.address}</p>
          )}
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {mapUrl && (
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
        </motion.div>
      </section>

      <section id="venue" className="relative px-6 py-20 text-center sm:py-28">
        <SectionTitle eyebrow="Find us">Where We’ll Celebrate</SectionTitle>
        <motion.div
          {...fadeUp}
          className="glass-card mx-auto max-w-xl rounded-2xl border border-gold/40 p-9 shadow-gold sm:p-12"
        >
          <MapPin className="mx-auto h-10 w-10 text-gold" aria-hidden="true" />
          <h3 className="mt-5 break-words font-serif text-3xl text-burgundy">
            {details.venue || "Venue to be announced"}
          </h3>
          {details.address && (
            <p className="mt-3 text-sm text-muted-foreground">{details.address}</p>
          )}
          {mapUrl && (
            <a
              href={mapUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-7 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-gold underline underline-offset-4 hover:text-burgundy"
            >
              Open in Google Maps <MapPin className="h-3.5 w-3.5" />
            </a>
          )}
        </motion.div>
      </section>

      <footer className="bg-muted px-6 py-16 text-center">
        <p dir="rtl" className="font-arabic text-xl text-gold">
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </p>
        <p className="mt-5 break-words font-script text-4xl text-gold">
          {details.groomName} &amp; {details.brideName}
        </p>
        {details.date && (
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-muted-foreground">
            {details.date}
          </p>
        )}
        {!preview && (
          <a
            href="/dashboard"
            className="mt-8 inline-block text-xs uppercase tracking-[0.18em] text-gold underline underline-offset-4 hover:text-burgundy"
          >
            Create your own invitation
          </a>
        )}
      </footer>
    </div>
  );
}
