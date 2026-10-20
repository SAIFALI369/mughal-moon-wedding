import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { InvitationDetails } from "../invitation-details";
import { storySound } from "./sound";
export function StorybookEntry({
  details,
  enabled,
}: {
  details: InvitationDetails;
  enabled: boolean;
}) {
  const [opened, setOpened] = useState(!enabled);
  const [sound, setSound] = useState(false);
  const [opening, setOpening] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const reduce = useReducedMotion();
  const origin = useRef(0);
  useEffect(() => {
    if (!enabled || opened) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [enabled, opened]);
  if (opened) return null;
  const open = () => {
    if (opening) return;
    if (sound) storySound("chime");
    setOpening(true);
    window.dispatchEvent(new CustomEvent("storybook:opened", { detail: { sound } }));
    timer.current = setTimeout(
      () => {
        setOpened(true);
        document.getElementById("invitation-top")?.focus();
      },
      reduce ? 0 : 1100,
    );
  };
  const kind =
    details.theme === "royal-rajmahal"
      ? "envelope"
      : details.theme === "lotus-goddess"
        ? "box"
        : "scroll";
  return (
    <motion.div
      className={`sb-entry sb-entry-${kind} ${opening ? "is-opening" : ""}`}
      role="dialog"
      aria-modal="true"
      aria-label="Open your invitation"
      initial={{ opacity: 1 }}
      animate={{ opacity: opening ? 0 : 1 }}
      transition={{ delay: 0.65, duration: 0.45 }}
      onKeyDown={(e) => {
        if (e.key === "Escape") open();
        if (e.key === "Tab") {
          const controls = e.currentTarget.querySelectorAll<HTMLElement>("button,input");
          const first = controls[0],
            last = controls[controls.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }}
    >
      <div className="sb-entry-burst" aria-hidden="true">
        {Array.from({ length: 22 }, (_, i) => (
          <i key={i} style={{ "--i": i } as React.CSSProperties}>
            ✦
          </i>
        ))}
      </div>
      <p className="sb-eyebrow">A little wonder, just for you</p>
      <motion.button
        autoFocus
        className="sb-package"
        aria-label={`Open the ${kind}`}
        onClick={open}
        onPointerDown={(e) => {
          origin.current = e.clientY;
        }}
        onPointerUp={(e) => {
          if (origin.current - e.clientY > 45) open();
        }}
        whileHover={reduce ? {} : { rotateZ: -2, y: -6 }}
        whileTap={reduce ? {} : { scale: 0.96 }}
      >
        <motion.span
          className="sb-package-flap"
          initial={{ rotateX: 0 }}
          animate={{ rotateX: opening ? -165 : 0 }}
          transition={{ duration: 0.65 }}
        />
        <span className="sb-package-seal">
          {details.groomName[0]} & {details.brideName[0]}
        </span>
        <span className="sb-package-label">
          {kind === "box"
            ? "A box of sweet beginnings"
            : kind === "scroll"
              ? "A story waiting to unfold"
              : "An invitation from the palace"}
        </span>
      </motion.button>
      <h2>
        {details.groomName} <i>&</i> {details.brideName}
      </h2>
      <p>Tap the seal or swipe up to begin</p>
      <label className="sb-sound-choice">
        <input type="checkbox" checked={sound} onChange={(e) => setSound(e.target.checked)} />{" "}
        Enable gentle sound effects & soundtrack
      </label>
    </motion.div>
  );
}
