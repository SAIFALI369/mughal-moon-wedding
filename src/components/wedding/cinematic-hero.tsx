import { useEffect, useRef, useState, type ReactNode } from "react";
import { ThemeCinema } from "./theme-cinema";
import type { InvitationTheme } from "./invitation-options";

/** Owns only decorative motion; keeps hero backgrounds locked steady without scroll jitter. */
export function CinematicHero({
  theme,
  waitingForGate = false,
  children,
}: {
  theme: InvitationTheme;
  waitingForGate?: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(!waitingForGate);

  useEffect(() => {
    const reveal = () => setRevealed(true);
    window.addEventListener("storybook:opened", reveal);
    window.addEventListener("wedding:revealed", reveal);
    return () => {
      window.removeEventListener("storybook:opened", reveal);
      window.removeEventListener("wedding:revealed", reveal);
    };
  }, []);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    element.style.setProperty("--cinema-depth", "0px");
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let visible = true;
    const syncPaused = () => {
      element.dataset.paused = String(!visible || document.hidden || media.matches);
    };
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? false;
            syncPaused();
          })
        : null;
    observer?.observe(element);
    document.addEventListener("visibilitychange", syncPaused);
    media.addEventListener("change", syncPaused);
    syncPaused();
    return () => {
      observer?.disconnect();
      document.removeEventListener("visibilitychange", syncPaused);
      media.removeEventListener("change", syncPaused);
    };
  }, [theme]);

  return (
    <div ref={ref} className="cinema-hero" data-revealed={revealed || !waitingForGate}>
      <div key={theme} className="cinema-scene">
        {children}
        <ThemeCinema theme={theme} />
        <div className="cinema-sheers" aria-hidden="true">
          <span className="cinema-sheer cinema-sheer-left" />
          <span className="cinema-sheer cinema-sheer-right" />
        </div>
      </div>
    </div>
  );
}
