import { Link } from "@tanstack/react-router";
import { ArrowRight, Download, Sparkles } from "lucide-react";
import { OFFLINE_APP_RELEASE } from "@/config/app-release";

/**
 * The current Offline Studio release, as seen on the site: what version is
 * shipped, when, and what changed. Used on the landing page and on /download so
 * a shop can tell at a glance whether the app on their counter is current.
 */
export function ReleaseCard({ audience = "public" }: { audience?: "public" | "partner" }) {
  const release = OFFLINE_APP_RELEASE;
  return (
    <section className="release-card" aria-labelledby="release-card-title">
      <div className="release-card-head">
        <span className="release-card-version">
          <Sparkles size={11} aria-hidden="true" /> v{release.version}
        </span>
        <span className="release-card-date">
          Latest release · {release.releasedOn} · {release.sizeLabel}
        </span>
      </div>
      <h3 id="release-card-title">What&rsquo;s new in the Offline App v{release.version}</h3>
      <ul className="release-highlights">
        {release.highlights.map((highlight) => (
          <li key={highlight.title}>
            <span className="release-tick" aria-hidden="true">
              ✓
            </span>
            <span>
              <strong>{highlight.title}.</strong> {highlight.detail}
            </span>
          </li>
        ))}
      </ul>
      <div className="release-card-actions">
        <Link to="/download" className="studio-button">
          <Download size={15} /> {audience === "partner" ? "Update offline app" : "Get v"}
          {release.version} <ArrowRight size={14} />
        </Link>
        <Link to="/offline-studio" className="studio-text-button">
          Open offline studio <ArrowRight size={14} />
        </Link>
      </div>
      <p className="release-card-meta">
        Already installed? Open <strong>Download offline app → Update offline cache</strong> once
        with the internet on; it works offline immediately after.
      </p>
    </section>
  );
}
