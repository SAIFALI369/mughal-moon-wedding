import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { InvitationDetails } from "../invitation-details";

const descriptions = {
  "royal-rajmahal": {
    title: "A palace coming to life",
    action: "Open the palace doors",
    opened: "The palace is ready to welcome you",
    type: "palace",
  },
  "lotus-goddess": {
    title: "A blessing in bloom",
    action: "Let the lotus bloom",
    opened: "A thousand beginnings, one beautiful bloom",
    type: "lotus",
  },
  calligraphy: {
    title: "A little light for forever",
    action: "Light the brass diya",
    opened: "A light for your next chapter",
    type: "diya",
  },
} as const;

function Palace() {
  return (
    <div className="sc-palace">
      <div className="sc-palace-block sc-palace-main">
        <i className="sc-wall sc-wall-front">
          <span className="sc-arch">
            <b />
            <b />
          </span>
          <span className="sc-jaali sc-jaali-left" />
          <span className="sc-jaali sc-jaali-right" />
        </i>
        <i className="sc-wall sc-wall-back" />
        <i className="sc-wall sc-wall-left" />
        <i className="sc-wall sc-wall-right" />
        <i className="sc-wall sc-wall-top" />
      </div>
      {[-1, 1].map((side) => (
        <div key={side} className="sc-tower" style={{ "--side": side } as CSSProperties}>
          <div className="sc-palace-block">
            <i className="sc-wall sc-wall-front">
              <span className="sc-tower-window" />
            </i>
            <i className="sc-wall sc-wall-back" />
            <i className="sc-wall sc-wall-left" />
            <i className="sc-wall sc-wall-right" />
            <i className="sc-wall sc-wall-top" />
          </div>
          <span className="sc-dome">
            <i />
            <b />
          </span>
          <span className="sc-tower-cap" />
        </div>
      ))}
      <span className="sc-palace-pediment">✦</span>
      <span className="sc-step sc-step-one" />
      <span className="sc-step sc-step-two" />
    </div>
  );
}

function Lotus() {
  return (
    <div className="sc-lotus">
      <span className="sc-pond" />
      <span className="sc-lily-leaf" />
      {[0, 1].map((ring) => (
        <div className={`sc-petal-ring sc-petal-ring-${ring}`} key={ring}>
          {Array.from({ length: 10 }, (_, i) => (
            <span
              className="sc-petal"
              key={i}
              style={{ "--angle": `${i * 36 + ring * 18}deg`, "--petal": i } as CSSProperties}
            >
              <i />
            </span>
          ))}
        </div>
      ))}
      <span className="sc-lotus-heart" />
      {Array.from({ length: 7 }, (_, i) => (
        <span className="sc-pollen" key={i} style={{ "--i": i } as CSSProperties} />
      ))}
    </div>
  );
}

function Diya() {
  return (
    <div className="sc-diya">
      <span className="sc-brass-base" />
      <span className="sc-brass-foot" />
      <div className="sc-brass-stem">
        {Array.from({ length: 12 }, (_, i) => (
          <i key={i} style={{ transform: `rotateY(${i * 30}deg) translateZ(10px)` }} />
        ))}
      </div>
      <span className="sc-brass-bowl" />
      <span className="sc-oil" />
      <span className="sc-flame">
        <i />
        <i />
        <i />
      </span>
      <div className="sc-scroll">
        <span>शुभ विवाह</span>
        <i className="sc-scroll-top" />
        <i className="sc-scroll-bottom" />
        <b />
      </div>
      <span className="sc-jasmine sc-jasmine-one">✿</span>
      <span className="sc-jasmine sc-jasmine-two">✿</span>
    </div>
  );
}

/** Real CSS 3D geometry, not a flat image: perspective, physical planes and articulated parts. */
export function StorybookSculpture({
  details,
  compact = false,
}: {
  details: Pick<InvitationDetails, "theme">;
  compact?: boolean;
}) {
  const copy = descriptions[details.theme as keyof typeof descriptions];
  const [active, setActive] = useState(false);
  const [visible, setVisible] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  useEffect(() => {
    const element = root.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "80px",
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame.current);
    };
  }, []);
  if (!copy) return null;
  const reset = () => {
    cancelAnimationFrame(frame.current);
    root.current?.style.setProperty("--tilt-x", "0deg");
    root.current?.style.setProperty("--tilt-y", "0deg");
  };
  return (
    <div
      ref={root}
      className={`sculpture sc-theme-${copy.type} ${active ? "sc-active" : ""} ${visible ? "sc-visible" : ""} ${compact ? "sc-compact" : ""}`}
    >
      <div
        className="sc-scene"
        onPointerMove={(event) => {
          if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          const rect = event.currentTarget.getBoundingClientRect();
          const x = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
          const y = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
          cancelAnimationFrame(frame.current);
          frame.current = requestAnimationFrame(() => {
            root.current?.style.setProperty("--tilt-x", `${-y * 12}deg`);
            root.current?.style.setProperty("--tilt-y", `${x * 24}deg`);
          });
        }}
        onPointerLeave={reset}
        onPointerUp={reset}
        onPointerCancel={reset}
      >
        <div className="sc-ambient" aria-hidden="true" />
        <div className="sc-camera" aria-hidden="true">
          <div className="sc-orbit">
            <div className="sc-platform">
              <span />
            </div>
            {copy.type === "palace" ? <Palace /> : copy.type === "lotus" ? <Lotus /> : <Diya />}
          </div>
        </div>
        <span className="sc-caption">Interactive 3D keepsake</span>
      </div>
      {!compact && <p className="sc-title">{copy.title}</p>}
      <button
        type="button"
        className="sc-control"
        aria-pressed={active}
        onClick={() => setActive((value) => !value)}
      >
        {active ? "↺ Play again" : copy.action}
        <span aria-hidden="true"> ✧</span>
      </button>
      <p className="sc-status" role="status">
        {active ? copy.opened : "Move a finger or your cursor to explore the depth"}
      </p>
    </div>
  );
}
