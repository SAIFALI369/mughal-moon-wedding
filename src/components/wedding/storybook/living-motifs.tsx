import type { CSSProperties } from "react";

/**
 * Cinematic hero effect for the three keepsake themes, replacing the old
 * floating icons. Pure CSS/SVG so it plays instantly with no video download.
 */
export function LivingMotifs(_props: { theme: string }) {
  return null;
}

export function StorybookCinema({ theme }: { theme: string }) {
  if (theme === "royal-rajmahal") {
    return (
      <div className="cine cine-curtains" aria-hidden="true">
        <span className="cine-curtain cine-curtain-left" />
        <span className="cine-curtain cine-curtain-right" />
        <span className="cine-pelmet" />
        {Array.from({ length: 14 }, (_, i) => (
          <i
            key={i}
            className="cine-petal"
            style={{ "--x": `${(i * 37) % 100}%`, "--d": `${(i % 7) * 0.6 + 1.6}s` } as CSSProperties}
          />
        ))}
      </div>
    );
  }
  if (theme === "lotus-goddess") {
    return (
      <div className="cine cine-lotus" aria-hidden="true">
        <svg viewBox="0 0 200 200" className="cine-lotus-svg">
          <defs>
            <radialGradient id="cine-halo" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--gold)" stopOpacity=".7" />
              <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle className="cine-halo" cx="100" cy="88" r="70" fill="url(#cine-halo)" />
          <g className="cine-goddess" fill="var(--gold)">
            <circle cx="100" cy="62" r="11" />
            <path d="M100 52c-5-8 5-8 0-14 -5 6 5 6 0 14Z" />
            <path d="M84 120c2-24 6-38 16-44 10 6 14 20 16 44Z" />
            <path d="M89 86c-12 4-20 12-24 20M111 86c12 4 20 12 24 20" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" fill="none" />
            <circle cx="100" cy="98" r="4" fill="var(--background)" />
          </g>
          {[-60, -36, -12, 12, 36, 60].map((a, i) => (
            <path
              key={a}
              className="cine-petal-lotus"
              style={{ "--a": `${a}deg`, "--i": i } as CSSProperties}
              d="M100 150c-14-20-14-46 0-66 14 20 14 46 0 66Z"
            />
          ))}
          <ellipse cx="100" cy="156" rx="70" ry="8" className="cine-water" />
        </svg>
      </div>
    );
  }
  return (
    <div className="cine cine-fireworks" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className="cine-rocket"
          style={{ "--x": `${12 + i * 19}%`, "--y": `${18 + (i % 3) * 12}%`, "--d": `${i * 0.9}s` } as CSSProperties}
        >
          {Array.from({ length: 12 }, (_, j) => (
            <b key={j} style={{ "--r": `${j * 30}deg` } as CSSProperties} />
          ))}
        </span>
      ))}
    </div>
  );
}
