import { useRef, type PointerEvent, type ReactNode } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { ChevronDown, Sparkles } from "lucide-react";
import type { InvitationDetails } from "./invitation-details";
import { FullArtFrame, LivingScene, riteBlessing } from "./invitation-rite";

export function CouplePortraits({
  details,
  compact = false,
}: {
  details: InvitationDetails;
  compact?: boolean;
}) {
  if (!details.elements.portraits || (!details.groomPhoto && !details.bridePhoto)) return null;
  return (
    <div className={`invite-portraits ${compact ? "invite-portraits-compact" : ""}`}>
      {details.groomPhoto && (
        <figure>
          <img src={details.groomPhoto} alt={`Portrait of ${details.groomName}`} loading="lazy" />
          {!compact && <figcaption>{details.groomName}</figcaption>}
        </figure>
      )}
      {details.bridePhoto && (
        <figure>
          <img src={details.bridePhoto} alt={`Portrait of ${details.brideName}`} loading="lazy" />
          {!compact && <figcaption>{details.brideName}</figcaption>}
        </figure>
      )}
    </div>
  );
}

/** Three new visual frameworks share one data model but have independent layout and depth. */
export function InvitationStage({
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
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const parallax = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);

  function move(event: PointerEvent<HTMLElement>) {
    if (
      details.framework !== "cinematic-stage" ||
      event.pointerType !== "mouse" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const box = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty(
      "--stage-x",
      `${((event.clientX - box.left) / box.width - 0.5) * 12}deg`,
    );
    event.currentTarget.style.setProperty(
      "--stage-y",
      `${((event.clientY - box.top) / box.height - 0.5) * -10}deg`,
    );
  }

  function reset(event: PointerEvent<HTMLElement>) {
    event.currentTarget.style.setProperty("--stage-x", "0deg");
    event.currentTarget.style.setProperty("--stage-y", "0deg");
  }

  return (
    <section
      ref={ref}
      id="invitation-top"
      aria-label="Wedding invitation"
      className="invitation-stage relative isolate flex min-h-[min(920px,100svh)] items-center justify-center overflow-hidden px-6 py-28 text-foreground"
      onPointerMove={move}
      onPointerLeave={reset}
    >
      <motion.div
        style={{ y: parallax }}
        className="stage-background absolute inset-0 -z-30 h-[115%] w-full"
      >
        <FullArtFrame src={backgroundImage} priority />
      </motion.div>
      <div className="stage-shade absolute inset-0 -z-20" aria-hidden="true" />
      <LivingScene theme={details.theme} variant="stage" />
      <div className="stage-orbit stage-orbit-one" aria-hidden="true" />
      <div className="stage-orbit stage-orbit-two" aria-hidden="true" />
      <div className="stage-light stage-light-one" aria-hidden="true" />
      <div className="stage-light stage-light-two" aria-hidden="true" />
      <div
        className="stage-frame pointer-events-none absolute inset-6 border border-gold/50"
        aria-hidden="true"
      />

      <motion.div
        initial={{ opacity: 0, y: 36, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 1.2, delay: entranceDelay }}
        className="stage-content relative z-10 mx-auto w-full max-w-6xl"
      >
        <div className="stage-copy">
          {riteBlessing(details.theme) && (
            <p
              dir={riteBlessing(details.theme)?.script === "arabic" ? "rtl" : "ltr"}
              className={`stage-shloka mb-4 ${
                riteBlessing(details.theme)?.script === "arabic" ? "font-arabic" : "font-sanskrit"
              } text-lg sm:text-xl`}
            >
              {riteBlessing(details.theme)?.text}
            </p>
          )}
          <p className="stage-kicker text-xs font-medium uppercase tracking-[0.36em] text-gold">
            <Sparkles aria-hidden="true" className="mr-2 inline h-4 w-4" />
            {details.hosts || "Together with their families"}
          </p>
          <p className="stage-overline mt-5 font-serif text-lg italic text-foreground">
            A celebration of two hearts
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
        {details.framework === "royal-folio" && (
          <aside className="stage-aside" aria-label="Celebration details">
            <span className="stage-aside-number font-script">01 / Forever</span>
            <span className="stage-aside-line" />
            <span className="font-serif text-3xl">{details.eventType}</span>
            <span className="mt-6 uppercase tracking-[0.2em]">{details.date}</span>
            <span className="mt-2">{details.time}</span>
            <span className="mt-6 font-serif text-xl">{details.venue}</span>
            {details.address && <span className="mt-2 text-sm">{details.address}</span>}
          </aside>
        )}
        {details.framework === "modern-mosaic" && (
          <div className="stage-mosaic-details" aria-label="Celebration details">
            <span className="stage-mosaic-number">
              01 <span>/</span> 03
            </span>
            <p className="font-serif text-2xl">{details.eventType}</p>
            <p className="mt-5 text-sm">{details.date}</p>
            <p className="text-sm">{details.time}</p>
            <p className="mt-5 text-sm">{details.venue}</p>
          </div>
        )}
      </motion.div>
      <a
        href={scrollTo}
        className="stage-scroll absolute bottom-7 left-1/2 z-10 -translate-x-1/2 text-center text-[10px] uppercase tracking-[0.3em] text-gold"
      >
        Explore <ChevronDown className="mx-auto mt-1 h-5 w-5" aria-hidden="true" />
      </a>
    </section>
  );
}
