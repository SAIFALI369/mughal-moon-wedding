import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Film, Images, Music2 } from "lucide-react";
import { invitationArt } from "./invitation-art";
import { ThemeLoop } from "./theme-loop";
import {
  demoCategoryLabel,
  demoCityLabel,
  demoDateLabel,
  demoThemeLabel,
  type ThemeDemo,
} from "@/config/theme-demos";

/**
 * A pickable theme, shown as the real card it opens into: the theme's own hero
 * film looping over its artwork, the demo couple's names and date, and a strip
 * of that demo's actual gallery photos. Tap it and the whole invitation opens.
 */
export function ThemeDemoCard({
  demo,
  priority = false,
  compact = false,
}: {
  demo: ThemeDemo;
  /** Above the fold: load the film immediately instead of on approach. */
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
          <img src={invitationArt[demo.theme]} alt="" loading={priority ? "eager" : "lazy"} />
          <ThemeLoop theme={demo.theme} priority={priority} className="theme-demo-film" />
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
              <img key={photo.caption} src={photo.src} alt="" loading="lazy" />
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
}
