import { motion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

export const fadeUp = {
  initial: { opacity: 0, y: 40 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] as const },
};

/** Mughal-inspired divider that draws itself on scroll */
export function Divider({ className = "" }: { className?: string }) {
  const draw = {
    initial: { pathLength: 0, opacity: 0 },
    whileInView: { pathLength: 1, opacity: 1 },
    viewport: { once: true },
    transition: { duration: 2, ease: "easeInOut" as const },
  };
  return (
    <div className={`flex justify-center py-10 text-gold ${className}`}>
      <svg
        width="320"
        height="48"
        viewBox="0 0 320 48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.2"
      >
        <motion.path {...draw} d="M0 24 H120" />
        <motion.path {...draw} d="M200 24 H320" />
        <motion.path {...draw} d="M160 4 L180 24 L160 44 L140 24 Z" />
        <motion.path {...draw} d="M160 12 L172 24 L160 36 L148 24 Z" />
        <motion.path {...draw} d="M120 24 C128 12 136 12 140 24 C136 36 128 36 120 24" />
        <motion.path {...draw} d="M200 24 C192 12 184 12 180 24 C184 36 192 36 200 24" />
        <motion.circle {...draw} cx="104" cy="24" r="3" />
        <motion.circle {...draw} cx="216" cy="24" r="3" />
      </svg>
    </div>
  );
}

export function Mandala({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.6"
    >
      {Array.from({ length: 16 }).map((_, i) => (
        <g key={i} transform={`rotate(${i * 22.5} 100 100)`}>
          <path d="M100 100 C110 70 110 40 100 10 C90 40 90 70 100 100Z" />
          <circle cx="100" cy="30" r="4" />
        </g>
      ))}
      <circle cx="100" cy="100" r="30" />
      <circle cx="100" cy="100" r="60" />
      <circle cx="100" cy="100" r="92" />
    </svg>
  );
}

type ButterflyFlight = {
  x: string[];
  y: string[];
  rotate: number[];
  duration: number;
  delay: number;
  size: number;
};

const butterflyFlights: ButterflyFlight[] = [
  {
    x: ["-12vw", "13vw", "37vw", "69vw", "108vw"],
    y: ["72vh", "54vh", "61vh", "28vh", "39vh"],
    rotate: [-12, 9, -7, 13, -4],
    duration: 17,
    delay: 0,
    size: 1,
  },
  {
    x: ["105vw", "79vw", "58vw", "31vw", "-14vw"],
    y: ["21vh", "38vh", "24vh", "49vh", "32vh"],
    rotate: [10, -8, 12, -13, 5],
    duration: 19,
    delay: 1.2,
    size: 0.72,
  },
  {
    x: ["-10vw", "20vw", "48vw", "76vw", "106vw"],
    y: ["32vh", "18vh", "43vh", "34vh", "14vh"],
    rotate: [-8, 14, -11, 9, -3],
    duration: 21,
    delay: 2.7,
    size: 0.58,
  },
  {
    x: ["102vw", "83vw", "55vw", "27vw", "-12vw"],
    y: ["78vh", "61vh", "73vh", "47vh", "58vh"],
    rotate: [9, -12, 7, -9, 4],
    duration: 22,
    delay: 4.1,
    size: 0.84,
  },
  {
    x: ["-8vw", "28vw", "51vw", "74vw", "106vw"],
    y: ["88vh", "74vh", "82vh", "56vh", "66vh"],
    rotate: [-10, 8, -5, 14, -2],
    duration: 24,
    delay: 6,
    size: 0.48,
  },
];

/** Golden butterflies that drift across the opening with a soft glimmering trail. */
export function GlimmeringButterflies({ intro = false }: { intro?: boolean }) {
  const flights = intro ? butterflyFlights.slice(0, 3) : butterflyFlights;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-[2] overflow-hidden">
      {flights.map((flight, index) => (
        <motion.div
          key={index}
          className="absolute left-0 top-0 will-change-transform"
          animate={{
            x: flight.x,
            y: flight.y,
            rotate: flight.rotate,
            opacity: [0, 0.95, 1, 0.9, 0],
          }}
          transition={{
            duration: intro ? flight.duration * 0.55 : flight.duration,
            delay: intro ? flight.delay * 0.25 : flight.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <motion.svg
            viewBox="0 0 52 38"
            style={{ width: 52 * flight.size, height: 38 * flight.size }}
            className="overflow-visible drop-shadow-[0_0_9px_rgba(232,200,120,0.95)]"
            animate={{ y: [0, -5, 2, -3, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <defs>
              <linearGradient
                id={`butterfly-gold-${intro ? "intro" : "hero"}-${index}`}
                x1="0"
                y1="0"
                x2="1"
                y2="1"
              >
                <stop offset="0" stopColor="#fff7c7" />
                <stop offset="0.46" stopColor="#e8c878" />
                <stop offset="1" stopColor="#8e5f16" />
              </linearGradient>
            </defs>
            <motion.g
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
              animate={{ scaleX: [1, 0.38, 1, 0.56, 1] }}
              transition={{ duration: 0.72, repeat: Infinity, ease: "easeInOut" }}
              fill={`url(#butterfly-gold-${intro ? "intro" : "hero"}-${index})`}
              stroke="#fff3b0"
              strokeWidth="0.7"
            >
              <path d="M24 18C18 3 5 1 3 8c-2 7 7 14 20 14-9 3-13 10-8 13 5 3 10-5 10-14Z" />
              <path d="M28 18C34 3 47 1 49 8c2 7-7 14-20 14 9 3 13 10 8 13-5 3-10-5-10-14Z" />
            </motion.g>
            <path d="M26 13c2 5 2 12 0 18-2-6-2-13 0-18Z" fill="#6f4917" />
            <path
              d="M25 14c-4-5-6-5-8-6M27 14c4-5 6-5 8-6"
              fill="none"
              stroke="#f8dc8a"
              strokeWidth="0.8"
              strokeLinecap="round"
            />
            {[0, 1, 2].map((sparkle) => (
              <motion.circle
                key={sparkle}
                cx={10 - sparkle * 7}
                cy={24 + sparkle * 2}
                r={sparkle === 0 ? 1.4 : 1}
                fill="#fff5b7"
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1.4, 0.4] }}
                transition={{ duration: 1.3, delay: sparkle * 0.25, repeat: Infinity }}
              />
            ))}
          </motion.svg>
        </motion.div>
      ))}
    </div>
  );
}

export function SectionTitle({
  eyebrow,
  children,
  light,
}: {
  eyebrow?: string;
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <motion.div {...fadeUp} className="mb-14 text-center">
      {eyebrow && <p className="mb-3 text-xs uppercase tracking-[0.4em] text-gold">{eyebrow}</p>}
      <h2 className={`font-serif text-4xl md:text-6xl ${light ? "text-ivory" : "text-burgundy"}`}>
        {children}
      </h2>
      <div className="mx-auto mt-5 flex items-center justify-center gap-3 text-gold">
        <span className="h-px w-16 bg-gold" />
        <span className="h-2 w-2 rotate-45 border border-gold" />
        <span className="h-px w-16 bg-gold" />
      </div>
    </motion.div>
  );
}

/** Lightweight canvas of drifting gold sparkles */
export function Sparkles({ count = 70 }: { count?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext("2d")!;
    let raf = 0;
    const resize = () => {
      c.width = c.offsetWidth * devicePixelRatio;
      c.height = c.offsetHeight * devicePixelRatio;
    };
    resize();
    window.addEventListener("resize", resize);
    const ps = Array.from({ length: count }, () => ({
      x: Math.random(),
      y: Math.random(),
      r: Math.random() * 1.8 + 0.4,
      s: Math.random() * 0.0006 + 0.0002,
      p: Math.random() * Math.PI * 2,
    }));
    const tick = (t: number) => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const q of ps) {
        q.y -= q.s;
        if (q.y < -0.02) q.y = 1.02;
        const a = 0.35 + 0.65 * Math.abs(Math.sin(t / 900 + q.p));
        const x = (q.x + Math.sin(t / 3000 + q.p) * 0.01) * c.width;
        ctx.beginPath();
        ctx.fillStyle = `rgba(232, 200, 120, ${a})`;
        ctx.shadowColor = "rgba(232,200,120,0.9)";
        ctx.shadowBlur = 8;
        ctx.arc(x, q.y * c.height, q.r * devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [count]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
