import type { CSSProperties } from "react";

/**
 * A looping, video-like effect over the first screen of each non-storybook
 * theme. Pure CSS so it starts instantly; hidden for reduced-motion guests.
 */
type Effect = "lanterns" | "fireflies" | "diyas" | "petals" | "embers" | "snow" | "stars" | "confetti" | "grid" | "ink" | "rays";

const effectByTheme: Record<string, Effect> = {
  eid: "stars",
  mughal: "lanterns",
  classic: "petals",
  aladin: "stars",
  "bihari-vibe": "confetti",
  mecca_madinah: "rays",
  luxury: "embers",
  futuristic: "grid",
  fairytale: "snow",
  ballroom: "embers",
  "diya-utsav": "diyas",
  "sacred-mandap": "petals",
  "riad-noor": "lanterns",
  "kashi-ghat": "diyas",
  "mehndi-night": "fireflies",
  "jharokha-dawn": "rays",
  "haldi-baag": "petals",
  "vows-in-ink": "ink",
  "chand-bagh": "fireflies",
  "mela-maidan": "confetti",
};

const counts: Record<Effect, number> = {
  lanterns: 9, fireflies: 22, diyas: 10, petals: 18, embers: 24, snow: 30, stars: 26, confetti: 26, grid: 1, ink: 6, rays: 6,
};

export function ThemeCinema({ theme }: { theme: string }) {
  const effect = effectByTheme[theme] ?? "stars";
  return (
    <div className={`tcine tcine-${effect}`} aria-hidden="true">
      {Array.from({ length: counts[effect] }, (_, i) => (
        <i
          key={i}
          style={
            {
              "--x": `${(i * 53) % 100}%`,
              "--y": `${(i * 29) % 100}%`,
              "--d": `${((i * 7) % 13) * 0.45}s`,
              "--t": `${6 + ((i * 3) % 7)}s`,
              "--s": `${0.6 + ((i * 11) % 9) / 10}`,
              "--r": `${i * 60}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
