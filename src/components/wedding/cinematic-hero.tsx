import { useEffect, useRef, useState, type ReactNode } from "react";
import { ThemeCinema } from "./theme-cinema";
import type { InvitationTheme } from "./invitation-options";

/** Owns only decorative motion; never remounts the form or guest/chat state. */
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
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const phone = window.matchMedia("(max-width: 640px)");
    let frame = 0;
    let visible = true;
    const syncPaused = () => {
      element.dataset.paused = String(!visible || document.hidden || media.matches);
    };
    const update = () => {
      frame = 0;
      if (media.matches || phone.matches || !visible || document.hidden) return;
      const bounds = element.getBoundingClientRect();
      const progress = Math.max(-1, Math.min(1, -bounds.top / Math.max(bounds.height, 1)));
      element.style.setProperty("--cinema-depth", `${progress * 22}px`);
    };
    const scroll = () => {
      if (!frame && !media.matches && !phone.matches && visible && !document.hidden) {
        frame = requestAnimationFrame(update);
      }
    };
    const observer =
      typeof IntersectionObserver !== "undefined"
        ? new IntersectionObserver(([entry]) => {
            visible = entry?.isIntersecting ?? false;
            syncPaused();
            scroll();
          })
        : null;
    const visibility = () => {
      syncPaused();
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
      }
      scroll();
    };
    const preference = () => {
      element.style.setProperty("--cinema-depth", "0px");
      syncPaused();
      scroll();
    };
    observer?.observe(element);
    window.addEventListener("scroll", scroll, { passive: true });
    document.addEventListener("visibilitychange", visibility);
    media.addEventListener("change", preference);
    phone.addEventListener("change", preference);
    syncPaused();
    update();
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", scroll);
      document.removeEventListener("visibilitychange", visibility);
      media.removeEventListener("change", preference);
      phone.removeEventListener("change", preference);
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
