import { useEffect, useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { invitationArt } from "../invitation-art";
import { getInvitationMonogram, type InvitationDetails } from "../invitation-details";

export function StorybookEntry({
  details,
  enabled,
  onEnter,
}: {
  details: InvitationDetails;
  enabled: boolean;
  onEnter?: () => void;
}) {
  const [opened, setOpened] = useState(!enabled);
  const [opening, setOpening] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const monogram = getInvitationMonogram(details);
  const dateVenueLine = [details.date, details.venue].filter(Boolean).join(" · ");

  const open = () => {
    if (opening) return;
    onEnter?.();
    window.dispatchEvent(new CustomEvent("storybook:opened", { detail: { sound: true } }));
    setOpening(true);
    timer.current = setTimeout(
      () => {
        setOpened(true);
        document.getElementById("invitation-top")?.focus();
      },
      reduce ? 80 : 1250,
    );
  };

  return (
    <div
      className={`sb-entry ${opening ? "is-opening" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sb-gate-title"
      onKeyDown={(e) => {
        if (e.key === "Escape") open();
      }}
    >
      <img
        src={invitationArt[details.theme]}
        alt=""
        aria-hidden="true"
        className="sb-entry-backdrop"
      />
      <div className="sb-entry-veil" aria-hidden="true" />

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

      <div className="sb-entry-card">
        <div className="sb-entry-seal" aria-hidden="true">
          <span>{monogram.left}</span>
          <i className="sb-entry-seal-amp">&amp;</i>
          <span>{monogram.right}</span>
        </div>

        <p className="sb-eyebrow">{details.hosts || "Together with their families"}</p>

        {details.riteLine && <p className="sb-entry-blessing">{details.riteLine}</p>}

        <h2 id="sb-gate-title">
          <span>{details.groomName}</span>
          <i>&amp;</i>
          <span>{details.brideName}</span>
        </h2>

        {dateVenueLine && <p className="sb-entry-meta">{dateVenueLine}</p>}

        <button
          ref={enterButton}
          type="button"
          disabled={opening}
          onClick={open}
          className="sb-entry-open"
        >
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{opening ? "Welcome inside" : "Open invitation"}</span>
        </button>
      </div>
    </div>
  );
}
