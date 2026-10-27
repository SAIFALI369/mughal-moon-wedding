import { getInstantSmallTalk } from "./concierge-smalltalk";
import { CinematicHero } from "./cinematic-hero";
import { GuestGallery } from "./guest-gallery";
import { applyMusicReply, getInstantMusicReply } from "./music-control";
import {
  ConciergeAvatar,
  ConciergeControls,
  ConciergeThinking,
  ConciergeMessage,
} from "./concierge-ui";
import { getInstantConciergeReply, requestConcierge } from "./concierge-client";
import { getAiVisitorId } from "@/lib/ai-visitor";
import { FullArtFrame, LivingScene, riteBlessing } from "./invitation-rite";
import type { InvitationTheme } from "./invitation-options";
import { AnimatePresence, motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { askSimranServer } from "./concierge.functions";
import { normalizeGuestName, rsvpSchema } from "./rsvp-schema";
import { wishesQuery } from "./wishes-query";
import eidSky from "@/assets/eid-sky.webp";
import {
  CalendarHeart,
  CalendarPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  Diamond,
  ExternalLink,
  Gem,
  Heart,
  Instagram,
  Landmark,
  MapPin,
  Menu,
  MessageCircle,
  Moon,
  Send,
  Share2,
  Sparkles as SparklesIcon,
  Sun,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  Divider,
  GlimmeringButterflies,
  Mandala,
  SectionTitle,
  Sparkles,
  fadeUp,
} from "./ornaments";
import {
  EVENTS,
  WEDDING_DATE,
  WEDDING_HASHTAG,
  buildGoogleCalendarUrl,
  downloadIcs,
  getInstagramUrl,
  getWhatsAppUrl,
  type WeddingEventKey,
} from "./config";
import { COUPLE_PROFILES, GALLERY_ITEMS } from "./photos";

/* ───────── Sticky Top Navbar + Theme Toggle ───────── */
const NAV_LINKS = [
  { href: "#story", label: "Our Story" },
  { href: "#events", label: "Events" },
  { href: "#gallery", label: "Gallery" },
  { href: "#dress-code", label: "Attire" },
  { href: "#rsvp", label: "RSVP" },
  { href: "#venue", label: "Venues" },
  { href: "#wishes", label: "Wishes" },
];

export function Navbar({ onOpenSimran }: { onOpenSimran?: () => void }) {
  const [dark, setDark] = useState(false);
  // Auth nav is rendered via lightweight check to avoid circular import; see separate AuthNav component if needed
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("wedding-theme");
    const isDark = saved === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    const applyTheme = () => {
      document.documentElement.classList.toggle("dark", next);
      window.dispatchEvent(new Event("wedding:theme"));
    };
    if (
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches &&
      typeof document.startViewTransition === "function"
    ) {
      document.startViewTransition(applyTheme);
    } else applyTheme();
    localStorage.setItem("wedding-theme", next ? "dark" : "light");
    toast(next ? "Royal Mughal Night theme enabled 🌙" : "Luminous Eid Sky theme enabled ☀️");
  };

  return (
    <header className="wedding-header fixed inset-x-0 top-0 z-40 px-3 pt-3 sm:px-6">
      <nav
        aria-label="Wedding sections"
        className="wedding-nav glass-card mx-auto flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 shadow-gold sm:px-6"
      >
        <a
          href="#"
          aria-label="Mohsin and Simran — back to top"
          className="wedding-brand font-script text-2xl text-gold transition hover:scale-105 sm:text-3xl"
        >
          <span>M &amp; S</span>
          <span className="wedding-brand-date">22–23 NOV · 2026</span>
        </a>

        <div className="hidden items-center gap-5 lg:flex">
          {NAV_LINKS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-xs uppercase tracking-[0.2em] text-foreground/80 transition hover:text-gold"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/dashboard"
            className="hidden items-center gap-1 rounded-full border border-gold/40 px-3 py-2 text-[11px] uppercase tracking-[0.15em] text-foreground hover:bg-gold/10 sm:inline-flex"
            title="Create & manage your private invitations (up to 3)"
          >
            My Invites
          </a>
          <a
            href="/sign-in"
            className="hidden items-center gap-1 rounded-full bg-burgundy px-3 py-2 text-[11px] uppercase tracking-[0.15em] text-ivory hover:bg-burgundy/90 sm:inline-flex"
          >
            Sign in
          </a>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={dark ? "Switch to light Eid theme" : "Switch to Royal Mughal Night theme"}
            title={dark ? "Switch to Luminous Eid Day" : "Switch to Royal Mughal Night"}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/50 bg-background/70 text-gold transition hover:scale-105 hover:bg-gold/15"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>

          {onOpenSimran ? (
            <button
              type="button"
              onClick={onOpenSimran}
              className="nav-concierge simran-action inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-burgundy-deep transition hover:scale-105 hover:shadow-gold"
            >
              <SparklesIcon className="h-3.5 w-3.5" /> Ask Simran
            </button>
          ) : (
            <a
              href="/ai-concierge"
              className="nav-concierge simran-action inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-burgundy-deep transition hover:scale-105 hover:shadow-gold"
            >
              <SparklesIcon className="h-3.5 w-3.5" /> Ask Simran
            </a>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label="Toggle navigation menu"
            aria-expanded={mobileOpen}
            aria-controls="wedding-mobile-menu"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-gold/50 bg-background/70 text-gold lg:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            id="wedding-mobile-menu"
            className="wedding-mobile-menu glass-card mx-auto mt-2 flex max-w-md flex-wrap justify-center gap-2 rounded-2xl p-3 shadow-gold lg:hidden"
          >
            {NAV_LINKS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-full border border-gold/30 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-foreground transition hover:bg-gold/15"
              >
                {item.label}
              </a>
            ))}
            <a
              href="/dashboard"
              onClick={() => setMobileOpen(false)}
              className="rounded-full border border-burgundy/30 bg-burgundy/10 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-burgundy"
            >
              My Invites (≤3)
            </a>
            <a
              href="/sign-in"
              onClick={() => setMobileOpen(false)}
              className="rounded-full border border-gold/30 px-3 py-1.5 text-xs uppercase tracking-[0.18em]"
            >
              Sign in
            </a>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

/* ───────── Preloader ───────── */
export function Preloader({
  onDone,
  onEnter,
  groomName = "Mohsin",
  brideName = "Simran",
  dateLine = "22–23 November 2026 · New Delhi",
  enableMusic = true,
  backgroundImage = eidSky,
  curtain = false,
  theme,
}: {
  onDone: () => void;
  onEnter?: () => void;
  groomName?: string;
  brideName?: string;
  dateLine?: string;
  enableMusic?: boolean;
  backgroundImage?: string;
  /** Grand Curtain hosts open onto velvet drapes instead of lacquered doors. */
  curtain?: boolean;
  /** Drives the tradition's blessing and the living fire/firework layer. */
  theme?: InvitationTheme;
}) {
  const [opening, setOpening] = useState(false);
  const [show, setShow] = useState(true);
  const enterButton = useRef<HTMLButtonElement>(null);
  const gateBlessing = theme
    ? (riteBlessing(theme) ?? (enableMusic ? null : riteBlessing("eid")))
    : riteBlessing("eid");
  const gateReduced =
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  useEffect(() => {
    if (!show) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    enterButton.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [show]);

  useEffect(() => {
    if (!opening) return;
    const timer = setTimeout(
      () => setShow(false),
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 100 : 1900,
    );
    return () => clearTimeout(timer);
  }, [opening]);

  function enter(withMusic: boolean) {
    if (opening) return;
    onEnter?.();
    if (enableMusic) {
      window.dispatchEvent(new Event(withMusic ? "wedding:enter" : "wedding:enter-silent"));
    }
    setOpening(true);
  }

  return (
    <AnimatePresence
      onExitComplete={() => {
        window.dispatchEvent(new Event("wedding:revealed"));
        onDone();
      }}
    >
      {show && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gate-title"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className={`heavenly-entrance fixed inset-0 z-[100] overflow-hidden ${opening ? "is-opening" : ""} ${curtain ? "is-curtain" : ""}`}
        >
          <FullArtFrame
            src={backgroundImage}
            theme={theme}
            className="gate-sky"
            priority
            motion={!gateReduced}
          />
          <div className="gate-radiance" aria-hidden="true" />
          {theme && <LivingScene theme={theme} variant="gate" reduce={gateReduced} />}
          <div className="heavenly-gate gate-left" aria-hidden="true">
            <div className="gate-arch" />
          </div>
          <div className="heavenly-gate gate-right" aria-hidden="true">
            <div className="gate-arch" />
          </div>
          <Sparkles count={45} />
          <div className="gate-welcome relative z-10 flex h-full flex-col items-center justify-center overflow-y-auto px-6 py-10 text-center text-foreground">
            {gateBlessing && (
              <p
                dir={gateBlessing.script === "arabic" ? "rtl" : "ltr"}
                className={`${
                  gateBlessing.script === "arabic" ? "font-arabic" : "font-sanskrit"
                } text-2xl text-gold-light sm:text-3xl`}
              >
                {gateBlessing.text}
              </p>
            )}
            <p className="mt-6 text-[10px] uppercase tracking-[0.3em] text-gold sm:tracking-[0.5em]">
              Together with their families
            </p>
            <h1
              id="gate-title"
              className={`mt-6 flex max-w-full flex-col items-center gap-2 font-serif font-medium ${enableMusic ? "text-6xl sm:flex-row sm:gap-6 sm:text-7xl lg:text-8xl" : "text-[clamp(2.75rem,6vw,6rem)] lg:flex-row lg:gap-6"}`}
            >
              <span className={`max-w-full break-words ${enableMusic ? "" : "lg:max-w-[38vw]"}`}>
                {groomName}
              </span>
              <span className="text-gold-shimmer shrink-0 font-script text-5xl font-normal sm:text-6xl">
                weds
              </span>
              <span className={`max-w-full break-words ${enableMusic ? "" : "lg:max-w-[38vw]"}`}>
                {brideName}
              </span>
            </h1>
            <p className="mt-6 font-serif text-xl italic text-foreground sm:text-2xl">
              Two hearts. One beautiful beginning.
            </p>
            <p className="mt-4 max-w-xl text-[10px] uppercase tracking-[0.25em] text-gold">
              {dateLine}
            </p>
            <button
              ref={enterButton}
              type="button"
              disabled={opening}
              onClick={() => enter(enableMusic)}
              className="btn-shimmer bg-gold-gradient mt-8 inline-flex min-h-12 items-center gap-3 rounded-full px-8 py-3 text-xs font-medium uppercase tracking-[0.2em] text-burgundy-deep shadow-gold transition hover:scale-105 disabled:cursor-wait focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
              <SparklesIcon className="h-4 w-4" /> {opening ? "Welcome inside" : "Open the gates"}
            </button>
            {enableMusic && (
              <>
                <p className="mt-4 text-xs text-muted-foreground">Enter with music · sound on</p>
                <button
                  type="button"
                  disabled={opening}
                  onClick={() => enter(false)}
                  className="mt-2 min-h-11 px-4 text-xs text-foreground underline decoration-gold/50 underline-offset-4 transition hover:text-gold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
                >
                  Enter quietly
                </button>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────── Hero ───────── */
export function Hero({
  guestName = "",
  groomName = "Mohsin",
  brideName = "Simran",
  dateLine = "Sunday, the Twenty-Second of November, Two Thousand Twenty-Six",
  actions,
  scrollTo = "#countdown",
  entranceDelay = 3,
  compactNames = false,
  backgroundImage = eidSky,
  portraits,
  theme,
}: {
  guestName?: string;
  groomName?: string;
  brideName?: string;
  dateLine?: string;
  actions?: ReactNode;
  scrollTo?: string;
  entranceDelay?: number;
  compactNames?: boolean;
  backgroundImage?: string;
  portraits?: ReactNode;
  /** Adds the theme's living fire / firework layer above the hero art. */
  theme?: InvitationTheme;
}) {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const [demoTheme, setDemoTheme] = useState<InvitationTheme>("eid");
  useEffect(() => {
    if (theme) return;
    const sync = () =>
      setDemoTheme("eid");
    sync();
    window.addEventListener("wedding:theme", sync);
    return () => window.removeEventListener("wedding:theme", sync);
  }, [theme]);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  const hero = (
    <section
      ref={ref}
      className="eid-hero relative flex min-h-[88svh] items-center justify-center overflow-hidden text-foreground"
    >
      <motion.div style={reduced ? undefined : { y }} className="absolute inset-0">
        <FullArtFrame
          src={backgroundImage}
          theme={theme ?? demoTheme}
          className="eid-hero-art"
          priority
          alt={
            backgroundImage === eidSky
              ? "Golden crescent moon and stars above luminous Eid clouds"
              : "Decorative wedding scene"
          }
        />
      </motion.div>
      {theme && (
        <LivingScene
          theme={theme}
          variant="hero"
          reduce={
            typeof window !== "undefined" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches
          }
        />
      )}
      <motion.div
        style={reduced ? undefined : { opacity: fade }}
        className="cinema-moon-copy relative z-10 px-6 pt-12 text-center"
      >
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: entranceDelay + 0.2, duration: 1 }}
          dir="rtl"
          className="font-arabic text-2xl text-gold-light md:text-4xl"
        >
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </motion.p>

        {guestName && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: entranceDelay + 0.4, duration: 0.8 }}
            className="glass-card mx-auto mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2 text-xs uppercase tracking-[0.28em] text-gold shadow-gold"
          >
            <span>✦</span> Cordially Inviting {guestName} <span>✦</span>
          </motion.div>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: entranceDelay + 0.6 }}
          className="mt-8 text-xs uppercase tracking-[0.5em] text-gold md:text-sm"
        >
          Together with their families
        </motion.p>
        <div
          className={`mt-8 flex flex-col items-center gap-2 ${compactNames ? "lg:flex-row lg:gap-8" : "md:flex-row md:gap-10"}`}
        >
          <motion.h1
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: entranceDelay + 0.8, duration: 1.2 }}
            className={`font-serif font-medium ${compactNames ? "max-w-full break-words text-[clamp(3.5rem,7vw,7rem)] lg:max-w-[35vw]" : "text-6xl sm:text-7xl md:text-9xl"}`}
          >
            {groomName}
          </motion.h1>
          <motion.span
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: entranceDelay + 1.3, duration: 1 }}
            className="text-gold-shimmer font-script text-6xl md:text-8xl"
          >
            weds
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: entranceDelay + 0.8, duration: 1.2 }}
            className={`font-serif font-medium ${compactNames ? "max-w-full break-words text-[clamp(3.5rem,7vw,7rem)] lg:max-w-[35vw]" : "text-6xl sm:text-7xl md:text-9xl"}`}
          >
            {brideName}
          </motion.h1>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: entranceDelay + 1.8, duration: 1 }}
          className="mx-auto mt-10 max-w-xl font-serif text-lg italic text-foreground md:text-2xl"
        >
          {dateLine}
        </motion.p>
        {portraits}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: entranceDelay + 2.2 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
          {actions === undefined ? (
            <>
              <button
                onClick={downloadIcs}
                className="btn-shimmer inline-flex items-center gap-2 rounded-full border border-gold px-7 py-3 text-xs uppercase tracking-[0.25em] text-gold-light transition hover:scale-105 hover:bg-gold/10"
              >
                <CalendarHeart className="h-4 w-4" /> Save the Date
              </button>
              <a
                href="/ai-concierge"
                className="btn-shimmer bg-gold-gradient inline-flex items-center gap-2 rounded-full px-7 py-3 text-xs font-medium uppercase tracking-[0.25em] text-burgundy-deep transition hover:scale-105 hover:shadow-gold"
              >
                <MessageCircle className="h-4 w-4" /> Ask Simran
              </a>
            </>
          ) : (
            actions
          )}
        </motion.div>
      </motion.div>
      <motion.a
        href={scrollTo}
        animate={reduced ? { y: 0 } : { y: [0, 6, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-center text-[10px] uppercase tracking-[0.4em] text-gold"
      >
        Scroll
        <ChevronDown className="mx-auto mt-1 h-5 w-5" />
      </motion.a>
    </section>
  );
  return theme ? (
    hero
  ) : (
    <CinematicHero theme={demoTheme} waitingForGate>
      {hero}
    </CinematicHero>
  );
}

/* ───────── Countdown ───────── */
function FlipCard({ value, label }: { value: number; label: string }) {
  const v = String(value).padStart(2, "0");
  return (
    <div className="text-center">
      <div className="relative h-28 overflow-hidden rounded-lg border border-gold/70 bg-card shadow-gold [perspective:600px] md:h-36">
        <span className="absolute inset-x-0 top-1/2 z-10 h-px bg-gold/30" />
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={v}
            initial={{ rotateX: -90, opacity: 0 }}
            animate={{ rotateX: 0, opacity: 1 }}
            exit={{ rotateX: 90, opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 flex items-center justify-center font-serif text-5xl text-foreground md:text-7xl"
          >
            {v}
          </motion.span>
        </AnimatePresence>
      </div>
      <p className="mt-3 text-xs uppercase tracking-[0.35em] text-gold">{label}</p>
    </div>
  );
}

export function Countdown({
  weddingDate = WEDDING_DATE,
  waitingText = "Until We Say Qubool Hai",
  reachedText = "Alhamdulillah — We Said Qubool Hai",
  eyebrow = "The countdown",
  title = "Counting Every Moment",
}: {
  weddingDate?: Date;
  waitingText?: string;
  reachedText?: string;
  eyebrow?: string;
  title?: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = Math.max(0, weddingDate.getTime() - (now ?? weddingDate.getTime()));
  const s = Math.floor(diff / 1000);
  const parts = [
    { l: "Days", v: Math.floor(s / 86400) },
    { l: "Hours", v: Math.floor((s % 86400) / 3600) },
    { l: "Minutes", v: Math.floor((s % 3600) / 60) },
    { l: "Seconds", v: s % 60 },
  ];
  const passed = now !== null && diff === 0;
  return (
    <section
      id="countdown"
      className="relative overflow-hidden bg-muted px-6 py-24 text-foreground"
    >
      <SectionTitle eyebrow={eyebrow}>{title}</SectionTitle>
      <motion.div
        {...fadeUp}
        className="mx-auto grid max-w-3xl grid-cols-2 gap-5 md:grid-cols-4 md:gap-8"
      >
        {parts.map((p) => (
          <FlipCard key={p.l} value={p.v} label={p.l} />
        ))}
      </motion.div>
      <motion.p
        {...fadeUp}
        className="mt-12 text-center font-script text-4xl text-gold-light md:text-5xl"
      >
        {passed ? reachedText : waitingText}
      </motion.p>
    </section>
  );
}

/* ───────── Story ───────── */
const MILESTONES = [
  {
    t: "The First Hello",
    d: "March 2019",
    x: "A chance meeting at a friend's Eid dinner — and a conversation that never quite ended.",
  },
  {
    t: "The First Date",
    d: "August 2019",
    x: "Chai, monsoon rain and a bookstore café that became our place.",
  },
  {
    t: "The Proposal",
    d: "December 2024",
    x: "Under a sky of lanterns, he asked. Through happy tears, she said yes.",
  },
  {
    t: "The Nikah",
    d: "November 2026",
    x: "Bismillah — the beginning of forever, with all of you by our side.",
  },
];

export function Story() {
  return (
    <section id="story" className="relative overflow-hidden px-6 py-24">
      <SectionTitle eyebrow="The couple">Our Story</SectionTitle>
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-14 md:flex-row md:gap-24">
        {COUPLE_PROFILES.map((p, i) => (
          <motion.div
            key={p.name}
            {...fadeUp}
            transition={{ ...fadeUp.transition, delay: i * 0.2 }}
            className="text-center"
          >
            <div className="relative mx-auto h-60 w-60 md:h-72 md:w-72">
              <Mandala className="absolute -inset-6 h-[calc(100%+3rem)] w-[calc(100%+3rem)] animate-[spin_60s_linear_infinite] text-gold opacity-60" />
              <div className="absolute inset-0 rounded-full border-2 border-gold p-2 shadow-gold">
                <img
                  src={p.img}
                  alt={p.name}
                  loading="lazy"
                  width={816}
                  height={816}
                  className="h-full w-full rounded-full object-cover"
                />
              </div>
            </div>
            <h3 className="mt-10 font-serif text-4xl text-burgundy">{p.name}</h3>
            <p className="mt-2 font-serif text-lg italic text-muted-foreground">{p.line}</p>
          </motion.div>
        ))}
      </div>
      <motion.p
        {...fadeUp}
        className="mx-auto mt-20 max-w-2xl text-center font-serif text-xl leading-relaxed text-brown md:text-2xl"
      >
        What began as a simple hello became a story written by Allah's own hand — of patience,
        laughter, du'as whispered and answered. Now, we begin our forever.
      </motion.p>
      <div className="relative mx-auto mt-16 max-w-2xl">
        <div className="absolute bottom-0 left-5 top-0 border-l-2 border-dotted border-gold md:left-1/2" />
        {MILESTONES.map((m, i) => (
          <motion.div
            key={m.t}
            {...fadeUp}
            className={`relative mb-12 pl-14 md:w-1/2 md:pl-0 ${i % 2 ? "md:ml-auto md:pl-12" : "md:pr-12 md:text-right"}`}
          >
            <Diamond
              className={`absolute left-[11px] top-1 h-5 w-5 fill-gold text-gold md:left-auto ${i % 2 ? "md:-left-[10px]" : "md:-right-[10px]"}`}
            />
            <p className="text-xs uppercase tracking-[0.3em] text-gold">{m.d}</p>
            <h4 className="mt-1 font-serif text-2xl text-burgundy">{m.t}</h4>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.x}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ───────── Events ───────── */
const ICONS = { mosque: Landmark, rings: Gem, feast: UtensilsCrossed };
export function Events() {
  return (
    <section id="events" className="relative overflow-hidden bg-muted px-6 py-24">
      <Mandala className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 text-gold opacity-[0.07]" />
      <SectionTitle eyebrow="Join us">The Celebrations</SectionTitle>
      <div className="relative mx-auto grid max-w-6xl gap-8 md:grid-cols-3">
        {EVENTS.map((e, i) => {
          const Icon = ICONS[e.icon];
          return (
            <motion.div
              key={e.key}
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: i * 0.15 }}
              whileHover={{ y: -10 }}
              className="glass-card gold-corners flex flex-col justify-between rounded-2xl p-10 text-center transition-shadow hover:shadow-gold"
            >
              <div>
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold text-gold">
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mt-6 font-serif text-3xl text-burgundy">{e.title}</h3>
                <div className="mx-auto my-5 h-px w-16 bg-gold" />
                <p className="font-medium">{e.date}</p>
                <p className="text-sm text-muted-foreground">{e.time} IST</p>
                <p className="mt-4 font-serif text-xl text-burgundy">{e.venue}</p>
                <p className="text-sm text-muted-foreground">{e.address}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.25em] text-emerald">
                  Dress code · {e.dress}
                </p>
              </div>
              <div className="mt-7 flex flex-col gap-2.5">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.venue}, ${e.address}`)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-shimmer inline-flex items-center justify-center gap-2 rounded-full bg-burgundy px-6 py-3 text-xs uppercase tracking-[0.2em] text-ivory transition hover:scale-105"
                >
                  <MapPin className="h-4 w-4" /> Get Directions
                </a>
                <a
                  href={buildGoogleCalendarUrl(e)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-gold/60 px-5 py-2.5 text-[11px] uppercase tracking-[0.2em] text-gold transition hover:bg-gold/10"
                >
                  <CalendarPlus className="h-3.5 w-3.5" /> Add to Google Calendar
                </a>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ───────── Gallery with Lightbox Navigation & Captions ───────── */
export function Gallery() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const total = GALLERY_ITEMS.length;

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        setActiveIndex((current) => (current === null ? 0 : (current + 1) % total));
      } else if (event.key === "ArrowLeft") {
        setActiveIndex((current) => (current === null ? 0 : (current - 1 + total) % total));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, total]);

  const currentItem = activeIndex !== null ? GALLERY_ITEMS[activeIndex] : undefined;

  return (
    <section id="gallery" className="px-6 py-24">
      <SectionTitle eyebrow="Gallery">Moments of Us</SectionTitle>
      <div className="mx-auto max-w-6xl columns-1 gap-5 sm:columns-2 lg:columns-3">
        {GALLERY_ITEMS.map((item, i) => (
          <motion.button
            key={i}
            type="button"
            {...fadeUp}
            onClick={() => setActiveIndex(i)}
            className="group relative mb-5 block w-full overflow-hidden rounded-xl border-2 border-transparent text-left transition hover:border-gold hover:shadow-gold"
          >
            <img
              src={item.src}
              alt={`Mohsin and Simran — ${item.caption}`}
              loading="lazy"
              className="w-full transition duration-700 group-hover:scale-110"
            />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4 opacity-0 transition duration-300 group-hover:opacity-100">
              <span className="text-[10px] uppercase tracking-[0.28em] text-gold-light">
                {item.tag}
              </span>
              <p className="font-serif text-lg text-ivory">{item.caption}</p>
            </div>
          </motion.button>
        ))}
      </div>
      <GuestGallery />
      <Dialog open={activeIndex !== null} onOpenChange={(o) => !o && setActiveIndex(null)}>
        <DialogContent className="max-w-4xl border-gold bg-charcoal p-3 text-ivory sm:p-5">
          <DialogTitle className="sr-only">
            {currentItem ? currentItem.caption : "Photo"}
          </DialogTitle>
          {currentItem && activeIndex !== null && (
            <div className="relative">
              <img
                src={currentItem.src}
                alt={currentItem.caption}
                className="max-h-[75vh] w-full rounded-lg object-contain"
              />
              <div className="mt-3 flex items-center justify-between gap-4 px-2">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.3em] text-gold-light">
                    {currentItem.tag} · {activeIndex + 1} / {total}
                  </span>
                  <p className="font-serif text-xl text-ivory">{currentItem.caption}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => setActiveIndex((activeIndex - 1 + total) % total)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/50 text-gold transition hover:bg-gold hover:text-charcoal"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => setActiveIndex((activeIndex + 1) % total)}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-gold/50 text-gold transition hover:bg-gold hover:text-charcoal"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}

/* ───────── Dress code ───────── */
const SWATCHES = [
  { c: "bg-burgundy", n: "Burgundy" },
  { c: "bg-gold", n: "Gold" },
  { c: "bg-emerald", n: "Emerald" },
  { c: "bg-navy", n: "Navy" },
];
export function DressCode() {
  const items = [
    { who: "For Him", what: "Traditional Sherwani or Formal Suit" },
    { who: "For Her", what: "Formal Eastern · Lehenga · Gown" },
  ];
  return (
    <section id="dress-code" className="bg-muted px-6 py-24">
      <SectionTitle eyebrow="Attire">Dress Code</SectionTitle>
      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
        {items.map((it) => (
          <motion.div
            key={it.who}
            {...fadeUp}
            className="glass-card gold-corners rounded-2xl p-10 text-center"
          >
            <p className="text-xs uppercase tracking-[0.4em] text-gold">{it.who}</p>
            <h3 className="mt-3 font-serif text-2xl text-burgundy md:text-3xl">{it.what}</h3>
            <div className="mt-8 flex justify-center gap-5">
              {SWATCHES.map((s) => (
                <div key={s.n} className="text-center">
                  <span
                    className={`block h-11 w-11 rounded-full border-2 border-gold-light shadow-gold transition hover:scale-125 ${s.c}`}
                  />
                  <span className="mt-2 block text-[10px] uppercase tracking-widest text-muted-foreground">
                    {s.n}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

/* ───────── RSVP ───────── */
export function Rsvp({ defaultGuestName = "" }: { defaultGuestName?: string }) {
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const form = e.currentTarget;
    const f = new FormData(form);
    const parsed = rsvpSchema.safeParse({
      name: String(f.get("name") || ""),
      guests: Number(f.get("guests")),
      events: f.getAll("events"),
      diet: String(f.get("diet") || ""),
      message: String(f.get("msg") || ""),
    });
    setError("");
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message || "Please check your reply");
      return;
    }
    const existing = queryClient.getQueryData(wishesQuery.queryKey) || [];
    if (
      existing.some(
        (wish) => normalizeGuestName(wish.name) === normalizeGuestName(parsed.data.name),
      )
    ) {
      setError("A reply from this name has already been received.");
      return;
    }
    setSending(true);
    try {
      const { error: saveError } = await supabase.from("wedding_rsvps").insert(parsed.data);
      if (saveError) {
        setError(
          saveError.code === "23505"
            ? "A reply from this name has already been received."
            : "Your reply could not be saved. Please try again.",
        );
        return;
      }
      await queryClient.invalidateQueries({ queryKey: wishesQuery.queryKey });
      const palette = getComputedStyle(document.documentElement);
      const gold = [
        palette.getPropertyValue("--gold").trim(),
        palette.getPropertyValue("--gold-light").trim(),
      ];
      confetti({ particleCount: 160, spread: 90, origin: { y: 0.7 }, colors: gold });
      setTimeout(
        () =>
          confetti({ particleCount: 90, angle: 60, spread: 70, origin: { x: 0 }, colors: gold }),
        250,
      );
      setTimeout(
        () =>
          confetti({ particleCount: 90, angle: 120, spread: 70, origin: { x: 1 }, colors: gold }),
        400,
      );
      toast.success("Thank You! We can't wait to celebrate with you 💛");
      setSent(true);
      form.reset();
    } catch {
      setError("Your reply could not be saved. Please try again.");
    } finally {
      setSending(false);
    }
  };
  const field =
    "w-full rounded-lg border border-gold/50 bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/30";
  return (
    <section id="rsvp" className="relative overflow-hidden bg-muted px-6 py-24 text-foreground">
      <SectionTitle eyebrow="Kindly reply">RSVP</SectionTitle>
      <motion.form {...fadeUp} onSubmit={submit} className="mx-auto max-w-2xl space-y-6">
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-gold">Full Name</span>
          <input
            key={defaultGuestName}
            name="name"
            defaultValue={defaultGuestName}
            required
            maxLength={100}
            className={field}
            placeholder="Your name"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-gold">
            Number of Guests
          </span>
          <select name="guests" className={field} defaultValue="1">
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <fieldset>
          <legend className="mb-3 text-xs uppercase tracking-[0.3em] text-gold">
            Attending Which Events?
          </legend>
          <div className="flex flex-wrap gap-4">
            {EVENTS.map((e) => (
              <label
                key={e.key}
                className="flex cursor-pointer items-center gap-2 rounded-full border border-gold/50 px-5 py-2.5 transition has-[:checked]:bg-gold has-[:checked]:text-burgundy-deep"
              >
                <input
                  type="checkbox"
                  name="events"
                  value={e.key}
                  className="accent-gold"
                  defaultChecked
                />
                {e.key}
              </label>
            ))}
          </div>
        </fieldset>
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-gold">
            Dietary Restrictions
          </span>
          <input
            name="diet"
            maxLength={500}
            className={field}
            placeholder="Vegetarian, allergies…"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-xs uppercase tracking-[0.3em] text-gold">
            A Message for the Couple
          </span>
          <textarea
            name="msg"
            rows={4}
            maxLength={2000}
            className={field}
            placeholder="Your du'as and wishes…"
          />
        </label>
        <p className="text-sm text-muted-foreground">
          Your name and wishes will be shared below. Guest and dietary details stay private.
        </p>
        <Button
          type="submit"
          disabled={sending}
          className="btn-shimmer h-14 w-full whitespace-normal text-sm font-medium uppercase text-primary-foreground"
        >
          {sending ? "Sending…" : "Send Your Wishes"}
        </Button>
        {error && (
          <p role="alert" className="text-center text-destructive">
            {error}
          </p>
        )}
        {sent && (
          <p className="text-center font-script text-3xl text-gold-light">JazakAllah Khair 💛</p>
        )}
      </motion.form>
    </section>
  );
}

/* ───────── Multi-Venue Interactive Map ───────── */
export function VenueMap() {
  const [selectedKey, setSelectedKey] = useState<WeddingEventKey>("Barat");
  const selectedEvent = EVENTS.find((e) => e.key === selectedKey) ?? EVENTS[1];

  return (
    <section id="venue" className="px-6 py-24">
      <SectionTitle eyebrow="Find us">The Venues</SectionTitle>

      <div className="mx-auto mb-8 flex max-w-2xl flex-wrap justify-center gap-3">
        {EVENTS.map((event) => {
          const active = event.key === selectedEvent.key;
          return (
            <button
              key={event.key}
              type="button"
              onClick={() => setSelectedKey(event.key)}
              className={`rounded-full border px-5 py-2.5 text-xs uppercase tracking-[0.22em] transition ${
                active
                  ? "bg-gold-gradient border-gold font-semibold text-burgundy-deep shadow-gold"
                  : "border-gold/40 bg-card text-foreground hover:border-gold"
              }`}
            >
              {event.key} · {event.venue}
            </button>
          );
        })}
      </div>

      <motion.div
        {...fadeUp}
        className="mx-auto max-w-5xl rounded-2xl border-2 border-gold p-3 shadow-gold"
      >
        <div className="gold-corners overflow-hidden rounded-xl">
          <iframe
            key={selectedEvent.key}
            title={`${selectedEvent.title} venue map`}
            src={`https://www.google.com/maps?q=${encodeURIComponent(selectedEvent.mapQuery)}&output=embed`}
            className="h-[420px] w-full"
            loading="lazy"
          />
        </div>
      </motion.div>
      <motion.div {...fadeUp} className="mt-8 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">
          {selectedEvent.title} · {selectedEvent.date} · {selectedEvent.time} IST
        </p>
        <h3 className="mt-2 font-serif text-3xl text-burgundy">{selectedEvent.venue}</h3>
        <p className="mt-1 text-muted-foreground">{selectedEvent.address}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedEvent.mapQuery)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-gold px-5 py-2 text-xs uppercase tracking-[0.2em] text-gold transition hover:bg-gold/10"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open in Google Maps
          </a>
        </div>
      </motion.div>
    </section>
  );
}

/* ───────── Footer with Personal Invite Generator & Socials ───────── */
export function Footer() {
  const [inviteGuest, setInviteGuest] = useState("");
  const [copied, setCopied] = useState(false);

  const buildPersonalUrl = () => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://mughal-moon-wedding.lovable.app";
    const clean = inviteGuest.trim();
    return clean ? `${origin}/?guest=${encodeURIComponent(clean)}` : `${origin}/`;
  };

  const copyInviteLink = async () => {
    const link = buildPersonalUrl();
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Personalized invitation link copied!");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast("Copy this link: " + link);
    }
  };

  const shareInviteOnWhatsApp = () => {
    const link = buildPersonalUrl();
    const greeting = inviteGuest.trim()
      ? `Assalamu Alaikum ${inviteGuest.trim()}! `
      : "Assalamu Alaikum! ";
    const message = `${greeting}You are cordially invited to the Nikah, Barat & Walima celebrations of Mohsin & Simran (22–23 November 2026). View your invitation & RSVP here: ${link}`;
    window.open(getWhatsAppUrl(message), "_blank", "noopener,noreferrer");
  };

  return (
    <footer className="relative overflow-hidden bg-muted px-6 pb-14 pt-20 text-center text-foreground">
      <Divider className="pt-0" />
      <p className="mx-auto max-w-xl font-serif text-xl italic text-foreground md:text-2xl">
        We look forward to celebrating this beautiful beginning with you.
      </p>
      <h2 className="text-gold-shimmer mt-8 font-script text-6xl md:text-8xl">
        Mohsin &amp; Simran
      </h2>
      <p className="mt-4 tracking-[0.3em] text-gold">{WEDDING_HASHTAG}</p>

      {/* Personal Invitation Link Generator for Family & Guests */}
      <div className="glass-card mx-auto mt-10 max-w-xl rounded-2xl p-6 text-center shadow-gold">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">
          Share a Personal Invitation Link
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter a guest or family name to create a personalized invitation card link
        </p>
        <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
          <input
            type="text"
            value={inviteGuest}
            onChange={(e) => setInviteGuest(e.target.value)}
            maxLength={80}
            placeholder="e.g. Uncle Ahmed & Family"
            aria-label="Guest or family name for personalized invitation"
            className="min-w-0 flex-1 rounded-full border border-gold/50 bg-background px-4 py-2.5 text-sm outline-none focus:border-gold focus:ring-2 focus:ring-gold/30"
          />
          <button
            type="button"
            onClick={() => void copyInviteLink()}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-gold px-4 py-2.5 text-xs uppercase tracking-[0.2em] text-gold transition hover:bg-gold/10"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy Link"}
          </button>
          <button
            type="button"
            onClick={shareInviteOnWhatsApp}
            className="bg-gold-gradient inline-flex items-center justify-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-medium uppercase tracking-[0.2em] text-burgundy-deep transition hover:shadow-gold"
          >
            <Share2 className="h-3.5 w-3.5" /> WhatsApp
          </button>
        </div>
      </div>

      <div className="mt-8 flex justify-center gap-4">
        {[
          { I: Instagram, h: getInstagramUrl(), l: "Instagram" },
          { I: MessageCircle, h: getWhatsAppUrl(), l: "WhatsApp" },
        ].map(({ I, h, l }) => (
          <a
            key={l}
            href={h}
            target="_blank"
            rel="noreferrer"
            aria-label={l}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/60 text-gold transition hover:scale-110 hover:bg-gold hover:text-charcoal"
          >
            <I className="h-5 w-5" />
          </a>
        ))}
      </div>
      <p className="mt-14 flex items-center justify-center gap-1 text-xs text-muted-foreground">
        Made with <Heart className="h-3 w-3 fill-burgundy text-burgundy" /> for Mohsin &amp; Simran
      </p>
    </footer>
  );
}

export { MusicToggle } from "./music-player";

/* ───────── Floating "Ask Simran" Quick-Chat Drawer ───────── */
type QuickLanguage = "en" | "hi" | "ur";
type QuickMessage = { role: "user" | "assistant"; text: string };

const SIMRAN_QUICK_COPY: Record<
  QuickLanguage,
  {
    label: string;
    greeting: string;
    placeholder: string;
    thinking: string;
    error: string;
    limit: string;
    quick: string[];
  }
> = {
  en: {
    label: "English",
    greeting:
      "Assalamu alaikum! I’m Simran, your AI sidekick. Wedding plans, music, everyday questions—or a slightly dark joke? Ask away.",
    placeholder: "Ask Simran…",
    thinking: "Simran is checking the invitation…",
    error: "I couldn't reach Simran right now. Please try again or visit the full concierge page.",
    limit: "You have used all 5 messages for today. Please come back tomorrow.",
    quick: [
      "What time is the Nikah?",
      "What is the dress code?",
      "Where is the Walima?",
      "What is the schedule?",
      "How do I RSVP?",
      "Play softer music",
      "Tell me a dark-ish joke",
      "What can you do?",
    ],
  },
  hi: {
    label: "हिन्दी",
    greeting: "अस्सलामु अलैकुम! मैं सिमरन हूँ। निकाह, बारात, वलीमा या ड्रेस कोड के बारे में पूछें।",
    placeholder: "सिमरन से पूछें…",
    thinking: "सिमरन जानकारी देख रही हैं…",
    error: "अभी सिमरन से संपर्क नहीं हो पाया। कृपया फिर कोशिश करें।",
    limit: "आज के सभी 5 संदेश पूरे हो गए हैं। कृपया कल फिर आएँ।",
    quick: ["निकाह कितने बजे है?", "ड्रेस कोड क्या है?", "वलीमा कहाँ होगा?", "RSVP कैसे करें?"],
  },
  ur: {
    label: "اردو",
    greeting: "السلام علیکم! میں سمرن ہوں۔ نکاح، بارات، ولیمہ یا لباس کے بارے میں پوچھیں۔",
    placeholder: "سمرن سے پوچھیں…",
    thinking: "سمرن تفصیلات دیکھ رہی ہیں…",
    error: "سمرن سے ابھی رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں۔",
    limit: "آج کے تمام 5 پیغامات استعمال ہو گئے ہیں۔ براہ کرم کل دوبارہ آئیں۔",
    quick: ["نکاح کتنے بجے ہے؟", "لباس کا ضابطہ کیا ہے؟", "ولیمہ کہاں ہوگا؟", "RSVP کیسے کریں؟"],
  },
};

export function SimranFloatingWidget({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
}) {
  const [lang, setLang] = useState<QuickLanguage>("en");
  const [messages, setMessages] = useState<QuickMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const requestLock = useRef(false);
  const [failedQuestion, setFailedQuestion] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (open) chatInputRef.current?.focus();
  }, [open]);
  useEffect(() => {
    if (open) chatEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [messages, busy, open]);
  const copy = SIMRAN_QUICK_COPY[lang];
  const dir = lang === "ur" ? "rtl" : "ltr";

  async function askSimran(question: string, retry = false) {
    const clean = question.trim().slice(0, 800);
    if (!clean || requestLock.current) return;
    requestLock.current = true;
    setFailedQuestion(null);

    const next = [
      ...(retry ? messages.slice(0, -2) : messages),
      { role: "user" as const, text: clean },
    ].slice(-5);
    setMessages(next);
    setDraft("");
    setBusy(true);

    const payload = {
      language: copy.label,
      messages: next.map(({ role, text: content }) => ({ role, content: content.slice(0, 400) })),
      visitor: getAiVisitorId(),
    };

    try {
      const instant =
        getInstantMusicReply(clean, copy.label) ??
        getInstantConciergeReply(clean, copy.label) ??
        getInstantSmallTalk(clean, copy.label);
      const result = instant
        ? { reply: instant }
        : await requestConcierge(
            (signal) =>
              supabase.functions.invoke("wedding-concierge", {
                body: payload,
                signal,
              }),
            () => askSimranServer({ data: payload }),
          );

      const renderedReply = applyMusicReply(result.reply, clean);
      setMessages((curr) => [...curr, { role: "assistant", text: renderedReply }]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (/used all|message limit/i.test(message)) {
        setFailedQuestion(null);
        setMessages((curr) => [...curr, { role: "assistant", text: copy.limit }]);
      } else {
        setFailedQuestion(clean);
        setMessages((curr) => [...curr, { role: "assistant", text: copy.error }]);
      }
    } finally {
      requestLock.current = false;
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label="Ask Simran AI Wedding Concierge"
        aria-expanded={open}
        aria-controls="simran-quick-chat"
        className="simran-launcher fixed bottom-6 left-6 z-40 inline-flex items-center gap-2 rounded-full border-2 border-gold-light px-5 py-3.5 text-xs font-semibold uppercase tracking-[0.2em] text-burgundy-deep shadow-gold transition hover:scale-105"
      >
        <SparklesIcon className="h-4 w-4" />
        <span>
          Ask Simran<span className="simran-launcher-caption">Your wedding guide</span>
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.aside
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            id="simran-quick-chat"
            aria-label="Simran AI Wedding Concierge"
            onKeyDown={(event) => {
              if (event.key === "Escape") onOpenChange(false);
            }}
            className="simran-chat fixed bottom-24 left-4 right-4 z-50 max-w-md overflow-hidden rounded-3xl border border-gold/50 bg-card shadow-gold sm:left-6 sm:right-auto sm:w-96"
          >
            <div className="concierge-header flex items-center justify-between gap-3 bg-burgundy-deep px-5 py-5 text-ivory">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] text-gold-light">
                  AI Wedding Concierge
                </p>
                <h3 className="flex items-center gap-3 font-serif text-2xl">
                  <ConciergeAvatar /> Simran
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Simran language"
                  value={lang}
                  disabled={busy}
                  onChange={(e) => {
                    setLang(e.target.value as QuickLanguage);
                    setMessages([]);
                    setFailedQuestion(null);
                  }}
                  className="rounded-full border border-gold/40 bg-charcoal px-2.5 py-1 text-xs text-ivory"
                >
                  {Object.entries(SIMRAN_QUICK_COPY).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close Simran chat"
                  className="rounded-full p-1 text-ivory/80 hover:text-gold-light"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <div
                dir={dir}
                className="mb-3 rounded-2xl border border-gold/25 bg-background/90 p-3 text-xs leading-relaxed"
              >
                {copy.greeting}
              </div>

              <div
                role="log"
                aria-live="polite"
                aria-label="Conversation"
                className="concierge-messages flex max-h-56 flex-col gap-3 overflow-y-auto py-1"
              >
                {messages.map((m, i) => (
                  <div
                    key={i}
                    dir={dir}
                    className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.role === "user"
                        ? "self-end bg-primary text-primary-foreground"
                        : "self-start border border-gold/25 bg-background"
                    }`}
                  >
                    <ConciergeMessage text={m.text} />
                  </div>
                ))}
                {busy && (
                  <div
                    dir={dir}
                    className="self-start rounded-2xl bg-muted px-3.5 py-2 text-xs text-muted-foreground"
                  >
                    <ConciergeThinking label={copy.thinking} />
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <ConciergeControls
                language={copy.label}
                busy={busy}
                hasMessages={messages.length > 0}
                failed={!!failedQuestion}
                onRetry={() => {
                  if (failedQuestion) void askSimran(failedQuestion, true);
                }}
                onClear={() => {
                  setMessages([]);
                  setFailedQuestion(null);
                }}
              />
              <div className="concierge-suggestions mt-3 flex flex-wrap gap-1.5">
                {copy.quick.map((q) => (
                  <button
                    key={q}
                    type="button"
                    disabled={busy}
                    onClick={() => void askSimran(q)}
                    className="rounded-full border border-gold/40 px-2.5 py-1 text-[11px] transition hover:bg-gold/10 disabled:opacity-50"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void askSimran(draft);
                }}
                className="concierge-composer mt-3 flex gap-2"
              >
                <input
                  ref={chatInputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  maxLength={800}
                  dir={dir}
                  placeholder={copy.placeholder}
                  aria-label={copy.placeholder}
                  className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-gold"
                />
                <button
                  type="submit"
                  disabled={busy || !draft.trim()}
                  aria-label="Send question to Simran"
                  className="simran-action flex items-center justify-center rounded-xl px-3.5 py-2 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </form>

              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <a href="/ai-concierge" className="text-gold underline underline-offset-4">
                  Open full Simran page →
                </a>
                <a
                  href="#rsvp"
                  onClick={() => onOpenChange(false)}
                  className="underline underline-offset-4"
                >
                  Go to RSVP
                </a>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}
