import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState, type FormEvent } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { normalizeGuestName, rsvpSchema } from "./rsvp-schema";
import { wishesQuery } from "./wishes-query";
import eidSky from "@/assets/eid-sky.jpg";
import {
  CalendarHeart,
  ChevronDown,
  Diamond,
  Gem,
  Heart,
  Instagram,
  Landmark,
  MapPin,
  MessageCircle,
  Music,
  UtensilsCrossed,
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
import { EVENTS, MAP_QUERY, MUSIC_URL, WEDDING_DATE, downloadIcs } from "./config";
import groom from "@/assets/groom.jpg";
import bride from "@/assets/bride.jpg";
import g1 from "@/assets/g1.jpg";
import g2 from "@/assets/g2.jpg";
import g3 from "@/assets/g3.jpg";
import g4 from "@/assets/g4.jpg";
import g5 from "@/assets/g5.jpg";
import g6 from "@/assets/g6.jpg";

/* ───────── Preloader ───────── */
export function Preloader({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(true);
  const [parts] = useState(() =>
    Array.from({ length: 48 }, () => ({
      x: (Math.random() - 0.5) * 1400,
      y: (Math.random() - 0.5) * 900,
      d: Math.random() * 0.6,
    })),
  );
  useEffect(() => {
    const t = setTimeout(() => setShow(false), 2800);
    return () => clearTimeout(t);
  }, []);
  return (
    <AnimatePresence onExitComplete={onDone}>
      {show && (
        <motion.div
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="bg-hero fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
        >
          <Sparkles count={45} />
          <GlimmeringButterflies intro />
          {parts.map((p, i) => (
            <motion.span
              key={i}
              className="absolute h-1.5 w-1.5 rounded-full bg-gold-light shadow-gold"
              initial={{ x: p.x, y: p.y, opacity: 0 }}
              animate={{ x: 0, y: 0, opacity: [0, 1, 0] }}
              transition={{ duration: 1.6, delay: p.d, ease: "easeIn" }}
            />
          ))}
          <motion.h1
            initial={{ opacity: 0, scale: 0.9, filter: "blur(12px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            transition={{ delay: 1.3, duration: 1 }}
            className="text-gold-shimmer relative z-10 px-4 text-center font-script text-6xl md:text-8xl"
          >
            Mohsin &amp; Simran
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ───────── Hero ───────── */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const fade = useTransform(scrollYProgress, [0, 0.7], [1, 0]);
  return (
    <section
      ref={ref}
      className="eid-hero relative flex min-h-[88svh] items-center justify-center overflow-hidden text-foreground"
    >
      <motion.div style={{ y }} className="absolute inset-0">
        <img
          src={eidSky}
          alt="Golden crescent moon and stars above luminous Eid clouds"
          width={1536}
          height={1024}
          fetchPriority="high"
          className="h-full w-full object-cover object-right"
        />
      </motion.div>
      <Sparkles count={85} />
      <GlimmeringButterflies />
      <motion.div style={{ opacity: fade }} className="relative z-10 px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 3.2, duration: 1 }}
          dir="rtl"
          className="font-arabic text-2xl text-gold-light md:text-4xl"
        >
          بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ
        </motion.p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3.6 }}
          className="mt-8 text-xs uppercase tracking-[0.5em] text-gold md:text-sm"
        >
          Together with their families
        </motion.p>
        <div className="mt-8 flex flex-col items-center gap-2 md:flex-row md:gap-10">
          <motion.h1
            initial={{ opacity: 0, x: -60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 3.8, duration: 1.2 }}
            className="font-serif text-6xl font-medium sm:text-7xl md:text-9xl"
          >
            Mohsin
          </motion.h1>
          <motion.span
            initial={{ opacity: 0, scale: 0.4 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 4.3, duration: 1 }}
            className="text-gold-shimmer font-script text-6xl md:text-8xl"
          >
            weds
          </motion.span>
          <motion.h1
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 3.8, duration: 1.2 }}
            className="font-serif text-6xl font-medium sm:text-7xl md:text-9xl"
          >
            Simran
          </motion.h1>
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 4.8, duration: 1 }}
          className="mx-auto mt-10 max-w-xl font-serif text-lg italic text-foreground md:text-2xl"
        >
          Sunday, the Twenty-Second of November, Two Thousand Twenty-Six
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 5.2 }}
          className="mt-10 flex flex-wrap items-center justify-center gap-3"
        >
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
            <MessageCircle className="h-4 w-4" /> Ask the Concierge
          </a>
        </motion.div>
      </motion.div>
      <motion.a
        href="#countdown"
        animate={{ y: [0, 10, 0] }}
        transition={{ repeat: Infinity, duration: 2 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-center text-[10px] uppercase tracking-[0.4em] text-gold"
      >
        Scroll
        <ChevronDown className="mx-auto mt-1 h-5 w-5" />
      </motion.a>
    </section>
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

export function Countdown() {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = Math.max(0, WEDDING_DATE.getTime() - (now ?? WEDDING_DATE.getTime()));
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
      <SectionTitle eyebrow="The countdown">Counting Every Moment</SectionTitle>
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
        {passed ? "Alhamdulillah — We Said Qubool Hai" : "Until We Say Qubool Hai"}
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
  const people = [
    { img: groom, name: "Mohsin", line: "The calm to her storm" },
    { img: bride, name: "Simran", line: "The spark to his soul" },
  ];
  return (
    <section className="relative overflow-hidden px-6 py-24">
      <SectionTitle eyebrow="The couple">Our Story</SectionTitle>
      <div className="mx-auto flex max-w-4xl flex-col items-center justify-center gap-14 md:flex-row md:gap-24">
        {people.map((p, i) => (
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
    <section className="relative overflow-hidden bg-muted px-6 py-24">
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
              className="glass-card gold-corners rounded-2xl p-10 text-center transition-shadow hover:shadow-gold"
            >
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-gold text-gold">
                <Icon className="h-7 w-7" />
              </div>
              <h3 className="mt-6 font-serif text-3xl text-burgundy">{e.title}</h3>
              <div className="mx-auto my-5 h-px w-16 bg-gold" />
              <p className="font-medium">{e.date}</p>
              <p className="text-sm text-muted-foreground">{e.time}</p>
              <p className="mt-4 font-serif text-xl text-burgundy">{e.venue}</p>
              <p className="text-sm text-muted-foreground">{e.address}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.25em] text-emerald">
                Dress code · {e.dress}
              </p>
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${e.venue}, ${e.address}`)}`}
                target="_blank"
                rel="noreferrer"
                className="btn-shimmer mt-7 inline-flex items-center gap-2 rounded-full bg-burgundy px-6 py-3 text-xs uppercase tracking-[0.2em] text-ivory transition hover:scale-105"
              >
                <MapPin className="h-4 w-4" /> Get Directions
              </a>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

/* ───────── Gallery ───────── */
const PHOTOS = [g1, g2, g3, groom, g4, g5, bride, g6];
export function Gallery() {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <section className="px-6 py-24">
      <SectionTitle eyebrow="Gallery">Moments of Us</SectionTitle>
      <div className="mx-auto max-w-6xl columns-1 gap-5 sm:columns-2 lg:columns-3">
        {PHOTOS.map((src, i) => (
          <motion.button
            key={i}
            {...fadeUp}
            onClick={() => setOpen(src)}
            className="group mb-5 block w-full overflow-hidden rounded-xl border-2 border-transparent transition hover:border-gold hover:shadow-gold"
          >
            <img
              src={src}
              alt={`Mohsin and Simran moment ${i + 1}`}
              loading="lazy"
              className="w-full transition duration-700 group-hover:scale-110"
            />
          </motion.button>
        ))}
      </div>
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-4xl border-gold bg-charcoal p-2">
          <DialogTitle className="sr-only">Photo</DialogTitle>
          {open && (
            <img
              src={open}
              alt="Enlarged moment"
              className="max-h-[85vh] w-full rounded-lg object-contain"
            />
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
    <section className="bg-muted px-6 py-24">
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
export function Rsvp() {
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
          <input name="name" required maxLength={100} className={field} placeholder="Your name" />
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

/* ───────── Map ───────── */
export function VenueMap() {
  return (
    <section className="px-6 py-24">
      <SectionTitle eyebrow="Find us">The Venue</SectionTitle>
      <motion.div
        {...fadeUp}
        className="mx-auto max-w-5xl rounded-2xl border-2 border-gold p-3 shadow-gold"
      >
        <div className="gold-corners overflow-hidden rounded-xl">
          <iframe
            title="Venue map"
            src={`https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&output=embed`}
            className="h-[420px] w-full"
            loading="lazy"
          />
        </div>
      </motion.div>
      <motion.div {...fadeUp} className="mt-8 text-center">
        <h3 className="font-serif text-3xl text-burgundy">The Imperial, New Delhi</h3>
        <p className="mt-1 text-muted-foreground">
          Janpath Lane, Connaught Place, New Delhi 110001
        </p>
      </motion.div>
    </section>
  );
}

/* ───────── Footer ───────── */
export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-muted px-6 pb-10 pt-20 text-center text-foreground">
      <Divider className="pt-0" />
      <p className="mx-auto max-w-xl font-serif text-xl italic text-foreground md:text-2xl">
        We look forward to celebrating this beautiful beginning with you.
      </p>
      <h2 className="text-gold-shimmer mt-8 font-script text-6xl md:text-8xl">
        Mohsin &amp; Simran
      </h2>
      <p className="mt-4 tracking-[0.3em] text-gold">#MohsinWedsSimran</p>
      <div className="mt-8 flex justify-center gap-4">
        {[
          { I: Instagram, h: "https://instagram.com", l: "Instagram" },
          { I: MessageCircle, h: "https://wa.me/", l: "WhatsApp" },
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
        Made with <Heart className="h-3 w-3 fill-burgundy text-burgundy" />
      </p>
    </footer>
  );
}

/* ───────── Music ───────── */
export function MusicToggle() {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const toggle = () => {
    if (!audio.current) {
      audio.current = new Audio(MUSIC_URL);
      audio.current.loop = true;
      audio.current.volume = 0.4;
    }
    if (playing) {
      audio.current.pause();
      setPlaying(false);
    } else
      audio.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => toast("Tap again to play music"));
  };
  return (
    <button
      onClick={toggle}
      aria-label={playing ? "Pause music" : "Play music"}
      className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full border-2 border-gold bg-charcoal text-gold shadow-gold transition hover:scale-110"
    >
      <span
        className={`flex h-10 w-10 items-center justify-center rounded-full border border-gold/40 ${playing ? "animate-[spin_3s_linear_infinite]" : ""}`}
      >
        <Music className="h-5 w-5" />
      </span>
    </button>
  );
}
