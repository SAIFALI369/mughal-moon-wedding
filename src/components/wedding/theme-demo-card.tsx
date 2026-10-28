import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Film, Images, Music2 } from "lucide-react";
import { ThemeLoop } from "./theme-loop";
import {
  demoCategoryLabel,
  demoCityLabel,
  demoDateLabel,
  demoPoster,
  demoThemeLabel,
  type ThemeDemo,
} from "@/config/theme-demos";

/**
 * A pickable theme, shown as the real card it opens into: the theme's own hero
 * film over its artwork, the demo couple's names and date, and a strip of that
 * demo's actual gallery photos. Tap it and the whole invitation opens.
 *
 * Everything here is cheap on purpose — a 560 px poster, 320 px stills and a
 * film that only decodes while this tile is the most visible one on screen.
 */
export const ThemeDemoCard = memo(function ThemeDemoCard({
  demo,
  priority = false,
  compact = false,
}: {
  demo: ThemeDemo;
  /** Above the fold: wins the film budget, loads eagerly. */
  priority?: boolean;
  compact?: boolean;
}) {
  const label = demoThemeLabel(demo.theme);
  const city = demoCityLabel(demo);
  return (
    <article className="theme-demo-card" data-demo-theme={demo.theme}>
      <Link
        to="/theme/$themeId"
        params={{ themeId: demo.theme }}
        className="theme-demo-link"
        aria-label={`Open the ${label} demo invitation for ${demo.groomName} and ${demo.brideName}`}
      >
        <div className="theme-demo-art">
          <img
            src={demoPoster(demo.theme)}
            alt=""
            width={560}
            height={700}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : "low"}
            decoding="async"
          />
          <ThemeLoop
            theme={demo.theme}
            priority={priority}
            className="theme-demo-film theme-loop-cover"
          />
          <span className="theme-demo-badge">
            <Film size={11} aria-hidden="true" /> Live film
          </span>
          <div className="theme-demo-plate">
            <span className="theme-demo-kicker">{demo.eventType}</span>
            <span className="theme-demo-names">
              {demo.groomName}
              <em>&amp;</em>
              {demo.brideName}
            </span>
            <span className="theme-demo-date">
              {demoDateLabel(demo)} · {city}
            </span>
          </div>
        </div>
        {!compact && (
          <div className="theme-demo-strip" aria-hidden="true">
            {demo.gallery.slice(0, 4).map((photo) => (
              <img
                key={photo.caption}
                src={photo.thumb}
                alt=""
                width={320}
                height={320}
                loading="lazy"
                decoding="async"
              />
            ))}
          </div>
        )}
        <div className="theme-demo-meta">
          <div>
            <span className="theme-demo-group">{demoCategoryLabel(demo.theme)}</span>
            <strong>{label}</strong>
            <span className="theme-demo-mood">{demo.mood}</span>
          </div>
          <span className="theme-demo-go" aria-hidden="true">
            <ArrowUpRight size={18} />
          </span>
        </div>
        <div className="theme-demo-facts">
          <span>
            <Music2 size={12} aria-hidden="true" /> {demo.songs[0]?.title}
          </span>
          <span>
            <Images size={12} aria-hidden="true" /> {demo.gallery.length + 2} photos
          </span>
          <span>Every element on</span>
        </div>
      </Link>
    </article>
  );
});
