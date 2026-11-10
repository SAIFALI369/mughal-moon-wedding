import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { openingCoverForTheme, openingVideoForTheme } from "../invitation-art";
import { isDarkOpeningTheme } from "../noor-arch-gate";
import type { InvitationDetails } from "../invitation-details";

export function StorybookEntry({
  details,
  enabled,
  onPrime,
  onEnter,
}: {
  details: InvitationDetails;
  enabled: boolean;
  onPrime?: () => void;
  onEnter?: () => void;
}) {
  const [opened, setOpened] = useState(!enabled);
  const [opening, setOpening] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const enterButton = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  useEffect(() => {
    if (!enabled || opened) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    enterButton.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [enabled, opened]);

  if (opened) return null;

  const cover = openingCoverForTheme(details.theme);
  const video = openingVideoForTheme(details.theme);
  const darkSurface = isDarkOpeningTheme(details.theme);

  const complete = () => {
    if (videoRef.current) {
      try {
        videoRef.current.pause();
      } catch {
        // Ignore media stubs without pause.
      }
    }
    window.dispatchEvent(new CustomEvent("storybook:opened", { detail: { sound: true } }));
    window.dispatchEvent(new Event("wedding:revealed"));
    onEnter?.();
    setOpened(true);
    document.getElementById("invitation-top")?.focus();
  };

  const open = () => {
    if (opening) return;
    onPrime?.();
    setOpening(true);

    const v = videoRef.current;
    if (reduce || !v) {
      timer.current = setTimeout(complete, 60);
      return;
    }

    try {
      v.currentTime = 0;
    } catch {
      // Ignore unseekable stream.
    }
    try {
      const started = v.play();
      if (!started || typeof started.catch !== "function") {
        timer.current = setTimeout(complete, 60);
        return;
      }
      started.catch(() => complete());
    } catch {
      timer.current = setTimeout(complete, 60);
      return;
    }

    timer.current = setTimeout(complete, 2400);
  };

  return (
    <div
      className={`sb-entry ${opening ? "is-opening" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sb-gate-title"
      onClick={!opening ? open : undefined}
      onKeyDown={(e) => {
        if (e.key === "Escape") open();
      }}
    >
      <div className={`noor-gate-zoom absolute inset-0 ${opening ? "is-zooming" : ""}`}>
        <img
          src={cover}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <video
          ref={videoRef}
          src={video.src}
          poster={cover}
          muted
          playsInline
          preload="auto"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>
      <div
        className={`noor-start-scrim pointer-events-none absolute inset-0 transition-opacity duration-300 ${opening ? "opacity-0" : "opacity-100"}`}
        aria-hidden="true"
      />

      <div className="sb-door sb-door-left" aria-hidden="true">
        <div className="sb-door-panel">
          <div className="sb-door-arch" />
        </div>
      </div>
      <div className="sb-door sb-door-right" aria-hidden="true">
        <div className="sb-door-panel">
          <div className="sb-door-arch" />
        </div>
      </div>

      <div
        className={`card-calligraphy-plate relative z-10 max-w-md transition-opacity duration-200 ${
          darkSurface ? "is-dark-art" : "is-light-art"
        } ${opening ? "pointer-events-none opacity-0" : "opacity-100"}`}
      >
        <h2 id="sb-gate-title" className="card-calligraphy-names">
          <span className="card-calligraphy-name">{details.groomName}</span>
          <span className="card-calligraphy-amp" aria-hidden="true">
            &amp;
          </span>
          <span className="card-calligraphy-name">{details.brideName}</span>
        </h2>

        <span className="card-calligraphy-rule" aria-hidden="true" />

        <button
          ref={enterButton}
          type="button"
          disabled={opening}
          onClick={(event) => {
            event.stopPropagation();
            open();
          }}
          className="noor-tap-open mt-6 inline-flex min-h-11 items-center justify-center rounded-full px-8 py-3 text-sm uppercase tracking-[0.18em]"
        >
          Tap to open
        </button>
      </div>
    </div>
  );
}
