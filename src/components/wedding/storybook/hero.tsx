import { StorybookSculpture } from "./sculpture";
import { StorybookCinema } from "./living-motifs";
import { motion } from "framer-motion";
import type { InvitationDetails } from "../invitation-details";
import { invitationArt } from "../invitation-art";
export function StorybookHero({ details }: { details: InvitationDetails }) {
  return (
    <section id="invitation-top" tabIndex={-1} className="sb-hero">
      <StorybookCinema theme={details.theme} />
      <div className="sb-hero-visual">
        <img
          src={invitationArt[details.theme]}
          alt=""
          fetchPriority="high"
          className="sb-hero-art"
        />
        <StorybookSculpture details={details} />
      </div>
      <div className="sb-hero-copy">
        <p className="sb-eyebrow">{details.hosts || "Together with our families"}</p>
        <motion.div initial={false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <p className="sb-blessing">{details.riteLine || "॥ श्री गणेशाय नमः ॥"}</p>
          <h1>
            <span>{details.groomName}</span>
            <i>&</i>
            <span>{details.brideName}</span>
          </h1>
        </motion.div>
        <p className="sb-date">{[details.date, details.time].filter(Boolean).join(" · ")}</p>
        <p>{details.venue}</p>
        <a className="sb-button" href="#story">
          Turn the first page <span aria-hidden="true">↓</span>
        </a>
        <p className="sb-hero-caption">Not just an invitation. A story you step into.</p>
      </div>
    </section>
  );
}
