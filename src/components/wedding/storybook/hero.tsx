import type { ReactNode } from "react";
import type { InvitationDetails } from "../invitation-details";
import { invitationArt } from "../invitation-art";
import { ThemeLoop } from "../theme-loop";
import { CouplePortraits } from "../invitation-stage";

export function StorybookHero({
  details,
  actions,
  motion = true,
}: {
  details: InvitationDetails;
  actions?: ReactNode;
  /** False keeps the framed photograph a still, as the host asked. */
  motion?: boolean;
}) {
  return (
    <section id="invitation-top" tabIndex={-1} className="sb-hero">
      <div className="sb-hero-visual">
        <div className="sb-hero-frame">
          <img
            src={invitationArt[details.theme]}
            alt=""
            fetchPriority="high"
            className="sb-hero-art"
          />
          <ThemeLoop theme={details.theme} className="sb-hero-video" priority enabled={motion} />
        </div>
      </div>
      <div className="sb-hero-copy">
        <p className="sb-eyebrow">{details.hosts || "Together with our families"}</p>
        {details.riteLine && <p className="sb-blessing">{details.riteLine}</p>}
        <h1>
          <span>{details.groomName}</span>
          <i>&amp;</i>
          <span>{details.brideName}</span>
        </h1>
        <CouplePortraits details={details} />
        <p className="sb-date">{[details.date, details.time].filter(Boolean).join(" · ")}</p>
        {details.venue && <p className="sb-venue">{details.venue}</p>}
        {details.address && <p className="sb-address">{details.address}</p>}
        <div className="sb-hero-actions">
          {actions ?? (
            <a className="sb-button" href="#celebration">
              See the celebration <span aria-hidden="true">↓</span>
            </a>
          )}
        </div>
      </div>
    </section>
  );
}
