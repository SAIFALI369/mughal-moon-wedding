import type { ReactNode } from "react";

/** An ornate heading shared by every host's invitation suite. */
export function SuiteHeading({
  eyebrow,
  children,
  light = false,
}: {
  eyebrow?: string;
  children: ReactNode;
  light?: boolean;
}) {
  return (
    <div className="invite-heading">
      {eyebrow && <p className="invite-heading-eyebrow">{eyebrow}</p>}
      <h2 className={`invite-heading-title ${light ? "text-ivory" : "text-burgundy"}`}>
        {children}
      </h2>
      <div className="invite-heading-rule" aria-hidden="true">
        <span className="invite-heading-line" />
        <svg viewBox="0 0 74 18" className="invite-heading-fleuron" fill="none">
          <path
            d="M2 9c10 0 13-7 19-7 5 0 6 4 3 5-3 1-5-2-2-4 6-4 12 2 13 5 1-3 7-9 13-5 3 2 1 5-2 4-3-1-2-5 3-5 6 0 9 7 19 7"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M37 2.5 39 7l4.5 2-4.5 2-2 4.5-2-4.5L30.5 9 35 7Z"
            fill="currentColor"
            opacity=".9"
          />
        </svg>
        <span className="invite-heading-line" />
      </div>
    </div>
  );
}

/** A gold seal with the couple's initials, used on covers, notes and the footer. */
export function InviteMonogram({
  left,
  right,
  size = "md",
  className = "",
}: {
  left: string;
  right: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      className={`invite-monogram invite-monogram-${size} ${className}`}
      aria-label={`${left} and ${right} monogram`}
    >
      <span className="invite-monogram-inner" aria-hidden="true">
        <span>{left}</span>
        <span className="invite-monogram-amp">&amp;</span>
        <span>{right}</span>
      </span>
    </span>
  );
}

/** Fine corner flourishes for framed invitation panels. */
export function CornerFlourish({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      aria-hidden="true"
      className={`invite-corner-flourish ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      strokeLinecap="round"
    >
      <path d="M4 76C4 45 20 16 52 7" opacity=".85" />
      <path d="M4 62c0-20 9-36 27-44" opacity=".5" />
      <path d="M12 27c7-4 13-3 17 1 3 4 1 9-4 9-4 0-6-3-4-6 2-2 6-1 7 2 1 4-4 8-8 8" />
      <path d="M28 13c5-3 10-2 12 2 2 3 0 7-3 7-3 0-4-2-3-4" />
      <circle cx="15" cy="56" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="44" cy="15" r="1.6" fill="currentColor" stroke="none" />
      <path
        d="M64 6 66 10l4 2-4 2-2 4-2-4-4-2 4-2Z"
        fill="currentColor"
        stroke="none"
        opacity=".9"
      />
    </svg>
  );
}

export function InvitationCorners() {
  return (
    <span className="invite-corners" aria-hidden="true">
      <CornerFlourish className="invite-corner-tl" />
      <CornerFlourish className="invite-corner-tr" />
      <CornerFlourish className="invite-corner-bl" />
      <CornerFlourish className="invite-corner-br" />
    </span>
  );
}

/** A slim Mughal arch outline that sits behind a section's content. */
export function ArchOutline({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 400 560"
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`invite-arch-outline ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M14 546V190C14 90 98 14 200 14s186 76 186 176v356" />
      <path d="M28 546V194C28 102 105 30 200 30s172 72 172 164v352" opacity=".45" />
      <path d="M200 14v-6M190 600h20" opacity=".4" />
    </svg>
  );
}

/** A crescent-and-star crest for the back of the invitation. */
export function InviteCrest({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      className={`invite-crest ${className}`}
      fill="none"
    >
      <circle cx="60" cy="60" r="52" stroke="currentColor" strokeWidth=".8" opacity=".7" />
      <circle cx="60" cy="60" r="45" stroke="currentColor" strokeWidth=".5" opacity=".45" />
      <path
        d="M74 36c-16 2-28 14-28 29 0 14 10 25 24 27-6 3-12 4-18 4-20 0-36-14-36-31 0-18 16-32 36-32 8 0 15 1 22 3Z"
        stroke="currentColor"
        strokeWidth="1.1"
        fill="currentColor"
        fillOpacity=".06"
      />
      <path d="M86 38 89 45l7 2.2-7 2.2-3 7-3-7-7-2.2 7-2.2Z" fill="currentColor" opacity=".95" />
      <circle cx="86" cy="66" r="1.6" fill="currentColor" />
      <path d="M36 84c16 6 40 6 56 0" stroke="currentColor" strokeWidth=".6" opacity=".55" />
    </svg>
  );
}

/** A delicate hanging-lamp ornament used beside the celebration details. */
export function HangingLamp({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 70 190"
      aria-hidden="true"
      className={`invite-hanging-lamp ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
    >
      <path d="M35 0v44" opacity=".5" />
      <path d="M35 44c-13 0-22 10-22 22h44c0-12-9-22-22-22Z" />
      <path d="M20 66h30l-5 28H25Z" opacity=".8" />
      <path d="M30 94c0 8 10 8 10 0M35 94v22" opacity=".6" />
      <path d="M27 116h16l-3 9H30Z" />
      <path d="M35 125v34" opacity=".5" />
      <path
        d="M35 159l3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"
        fill="currentColor"
        stroke="none"
        opacity=".8"
      />
    </svg>
  );
}
