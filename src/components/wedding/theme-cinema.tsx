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
  "bihari-vibe": "petals",
  mecca_madinah: "rays",
  luxury: "embers",
  futuristic: "stars",
  fairytale: "snow",
  ballroom: "embers",
  "diya-utsav": "diyas",
  "sacred-mandap": "petals",
  "riad-noor": "lanterns",
  "kashi-ghat": "diyas",
  "mehndi-night": "fireflies",
  "jharokha-dawn": "rays",
  "haldi-baag": "petals",
  "vows-in-ink": "rays",
  "chand-bagh": "fireflies",
  "mela-maidan": "petals",
  "royal-rajmahal": "petals",
  "lotus-goddess": "petals",
  calligraphy: "embers",
};

const counts: Record<Effect, number> = {
  lanterns: 5, fireflies: 12, diyas: 7, petals: 10, embers: 12, snow: 12, stars: 16, confetti: 10, grid: 1, ink: 3, rays: 3,
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
              "--d": `${-((i * 7) % 19)}s`,
              "--t": `${18 + ((i * 3) % 13)}s`,
              "--s": `${0.6 + ((i * 11) % 9) / 10}`,
              "--r": `${i * 60}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
