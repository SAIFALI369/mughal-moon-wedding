import { useState } from "react";
import { Flower2 } from "lucide-react";
import type { InvitationDetails } from "../invitation-details";
import { storySound } from "./sound";
export function FlipEvents({ details }: { details: InvitationDetails }) {
  const events = [
    ...details.additionalEvents,
    {
      title: details.eventType || "Wedding",
      date: details.date,
      time: details.time,
      venue: details.venue,
      address: details.address,
    },
  ];
  const [flipped, setFlipped] = useState<number[]>([]);
  return (
    <section className="sb-chapter" aria-labelledby="sb-events-title">
      <p className="sb-eyebrow">The celebration, in chapters</p>
      <h2 id="sb-events-title">A date with joy</h2>
      <p className="sb-hint">Tap a keepsake to turn it over.</p>
      <div className="sb-event-grid">
        {events.map((event, i) => (
          <button
            key={i}
            className={`sb-flip ${flipped.includes(i) ? "is-flipped" : ""}`}
            aria-expanded={flipped.includes(i)}
            onClick={(e) => {
              setFlipped((previous) =>
                previous.includes(i) ? previous.filter((n) => n !== i) : [...previous, i],
              );
              if (
                e.currentTarget.closest(".personal-invite")?.getAttribute("data-sound") === "true"
              )
                storySound("knock");
            }}
          >
            <span className="sb-flip-inner">
              <span className="sb-flip-front" aria-hidden={flipped.includes(i)}>
                <span className="sb-event-number">0{i + 1}</span>
                <Flower2 size={45} />
                <strong>{event.title}</strong>
                <small>Tap to discover ↗</small>
              </span>
              <span className="sb-flip-back" aria-hidden={!flipped.includes(i)}>
                <strong>{event.title}</strong>
                <span>{event.date || "Date to be announced"}</span>
                <span>{event.time}</span>
                <span>{event.venue}</span>
                {details.dressCode && <small>Dress · {details.dressCode}</small>}
                <small>Tap to turn back</small>
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
