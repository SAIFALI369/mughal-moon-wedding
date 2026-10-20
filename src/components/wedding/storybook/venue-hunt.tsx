import { useState } from "react";
import { Flame, MapPin, Shirt } from "lucide-react";
import { isSafeWebUrl, type InvitationDetails } from "../invitation-details";
export function VenueHunt({ details }: { details: InvitationDetails }) {
  const [found, setFound] = useState<string[]>([]);
  const map = isSafeWebUrl(details.mapUrl)
    ? details.mapUrl
    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([details.venue, details.address].filter(Boolean).join(", "))}`;
  const objects = [
    {
      id: "when",
      icon: Flame,
      title: "Light the lantern",
      content: (
        <>
          <h3>Date & time</h3>
          <p>
            {details.date} · {details.time}
          </p>
        </>
      ),
    },
    {
      id: "where",
      icon: MapPin,
      title: "Find our place",
      content: (
        <>
          <h3>{details.venue || "Venue to be announced"}</h3>
          <p>{details.address}</p>
          <a className="sb-button" href={map} target="_blank" rel="noreferrer">
            Get directions ↗
          </a>
        </>
      ),
    },
    ...(details.dressCode
      ? [
          {
            id: "wear",
            icon: Shirt,
            title: "Open the wardrobe",
            content: (
              <>
                <h3>Dress code</h3>
                <p>{details.dressCode}</p>
              </>
            ),
          },
        ]
      : []),
  ];
  return (
    <section className="sb-chapter sb-hunt" aria-labelledby="sb-hunt-title">
      <p className="sb-eyebrow">A tiny treasure trail</p>
      <h2 id="sb-hunt-title">Find your way to us</h2>
      <p className="sb-hint" role="status">
        {found.length} of {objects.length} details discovered · tap each object
      </p>
      <svg
        className="sb-hunt-scene"
        viewBox="0 0 600 160"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M15 150H585M75 150V55L130 20L185 55V150M415 150V55L470 20L525 55V150M185 150V65Q300 -35 415 65V150M225 150V80Q300 0 375 80V150M60 55H200M400 55H540M95 85H165M435 85H505M95 110H165M435 110H505" />
        <path d="M270 115Q300 145 330 115Q300 100 270 115ZM300 107Q280 85 300 75Q320 85 300 107ZM300 130V150" />
        <circle cx="300" cy="32" r="8" />
        <path d="M110 55V150M150 55V150M450 55V150M490 55V150" opacity=".35" />
      </svg>
      <div className="sb-hunt-grid">
        {objects.map(({ id, icon: Icon, title, content }) => (
          <div key={id}>
            <button
              className="sb-hunt-object"
              aria-expanded={found.includes(id)}
              aria-controls={`sb-hunt-${id}`}
              onClick={() =>
                setFound((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]))
              }
            >
              <Icon size={38} />
              <span>{title}</span>
            </button>
            <div id={`sb-hunt-${id}`} hidden={!found.includes(id)} className="sb-hunt-reveal">
              {content}
            </div>
          </div>
        ))}
      </div>
      <button className="sb-text-button" onClick={() => setFound(objects.map((o) => o.id))}>
        Show all travel details
      </button>
    </section>
  );
}
