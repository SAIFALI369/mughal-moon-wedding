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
      <svg width="320" height="48" viewBox="0 0 320 48" fill="none" stroke="currentColor" strokeWidth="1.2">
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
    <svg viewBox="0 0 200 200" className={className} fill="none" stroke="currentColor" strokeWidth="0.6">
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

export function SectionTitle({ eyebrow, children, light }: { eyebrow?: string; children: ReactNode; light?: boolean }) {
  return (
    <motion.div {...fadeUp} className="mb-14 text-center">
      {eyebrow && <p className="mb-3 text-xs uppercase tracking-[0.4em] text-gold">{eyebrow}</p>}
      <h2 className={`font-serif text-4xl md:text-6xl ${light ? "text-ivory" : "text-burgundy"}`}>{children}</h2>
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
      x: Math.random(), y: Math.random(), r: Math.random() * 1.8 + 0.4,
      s: Math.random() * 0.0006 + 0.0002, p: Math.random() * Math.PI * 2,
    }));
    const tick = (t: number) => {
      ctx.clearRect(0, 0, c.width, c.height);
      for (const q of ps) {
        q.y -= q.s; if (q.y < -0.02) q.y = 1.02;
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
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, [count]);
  return <canvas ref={ref} className="pointer-events-none absolute inset-0 h-full w-full" />;
}
