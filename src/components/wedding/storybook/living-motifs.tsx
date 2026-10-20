import { useEffect, useRef } from "react";
import { Flame, Flower2 } from "lucide-react";
export function LivingMotifs({ theme }: { theme: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        ref.current?.style.setProperty("--px", `${(e.clientX / window.innerWidth - 0.5) * 24}px`);
        ref.current?.style.setProperty("--py", `${(e.clientY / window.innerHeight - 0.5) * 18}px`);
      });
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
    };
  }, []);
  const Icon = theme === "calligraphy" ? Flame : Flower2;
  return (
    <div className="sb-motifs" ref={ref} aria-hidden="true">
      {Array.from({ length: 8 }, (_, i) => (
        <span
          key={i}
          style={{
            left: `${i % 2 ? 94 : 2}%`,
            top: `${8 + i * 12}%`,
            animationDelay: `${i * -0.7}s`,
          }}
        >
          <Icon size={20 + (i % 3) * 7} />
        </span>
      ))}
    </div>
  );
}
