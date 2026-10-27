import { escapeHtml } from "./html-escape";

/**
 * Print-ready artwork for a host's card, produced as a self-contained document
 * that opens in a print window.
 *
 * Two outputs share the same typography:
 *  - the invitation itself, A5 portrait, front and back;
 *  - an A4 sheet of QR inserts (90 × 55 mm) for handing to a print shop.
 *
 * Everything is vector text and inline SVG, so the browser's "Save as PDF"
 * produces a real print file at any size — no raster text, no external assets.
 */

export type PrintPalette = {
  /** Page background. */
  paper: string;
  /** Body text. */
  ink: string;
  /** Names, rules and ornaments. */
  accent: string;
  /** Secondary text. */
  soft: string;
  /** Light panel behind the QR. */
  tint: string;
};

const PALETTES: Record<string, PrintPalette> = {
  "mughal-moon-film": {
    paper: "#f7efe2",
    ink: "#141a26",
    accent: "#9a7333",
    soft: "#6c6357",
    tint: "#e9dcc3",
  },
  "royal-rajmahal": {
    paper: "#fff4e1",
    ink: "#451522",
    accent: "#9b6e29",
    soft: "#876955",
    tint: "#f2dfbd",
  },
  "lotus-goddess": {
    paper: "#fff9f8",
    ink: "#314c40",
    accent: "#956374",
    soft: "#6b7c70",
    tint: "#f3e3e8",
  },
  calligraphy: {
    paper: "#f4ead9",
    ink: "#38291e",
    accent: "#875b2b",
    soft: "#806d59",
    tint: "#e8d7ba",
  },
  eid: { paper: "#fbf8f1", ink: "#22322c", accent: "#2f6b57", soft: "#6f7f78", tint: "#eef4f0" },
  aladin: { paper: "#f9f4fb", ink: "#38235e", accent: "#6f4a9c", soft: "#71638a", tint: "#f1e9f8" },
  "bihari-vibe": {
    paper: "#fdf5ee",
    ink: "#4a2a1d",
    accent: "#b8532f",
    soft: "#86705f",
    tint: "#f9e6d7",
  },
  mecca_madinah: {
    paper: "#f5faf6",
    ink: "#143d31",
    accent: "#1f6b52",
    soft: "#5f7a70",
    tint: "#e8f2ec",
  },
  luxury: { paper: "#faf8f4", ink: "#241c25", accent: "#9c7b3f", soft: "#6f665f", tint: "#f2ede4" },
  futuristic: {
    paper: "#f6f9fc",
    ink: "#102743",
    accent: "#2f5d8a",
    soft: "#5f7286",
    tint: "#e8f0f7",
  },
  fairytale: {
    paper: "#fdf6f7",
    ink: "#48222f",
    accent: "#a8496a",
    soft: "#8b6d78",
    tint: "#fbeaee",
  },
  ballroom: {
    paper: "#fdf9ef",
    ink: "#3a2a17",
    accent: "#9a7433",
    soft: "#846f52",
    tint: "#f8eed6",
  },
  "diya-utsav": {
    paper: "#fdf6ec",
    ink: "#3a1c12",
    accent: "#c2601c",
    soft: "#8a6a55",
    tint: "#fbe7d2",
  },
  "sacred-mandap": {
    paper: "#fdf9ef",
    ink: "#3b2416",
    accent: "#a8541f",
    soft: "#87705a",
    tint: "#f9efdc",
  },
  "riad-noor": {
    paper: "#f7fbf9",
    ink: "#123c3a",
    accent: "#1f6f68",
    soft: "#5f7d79",
    tint: "#e6f2ef",
  },
  "kashi-ghat": {
    paper: "#fdf7ec",
    ink: "#31251a",
    accent: "#b6601f",
    soft: "#87705a",
    tint: "#faeadb",
  },
  "mehndi-night": {
    paper: "#f8fbf6",
    ink: "#14372b",
    accent: "#1f6b4e",
    soft: "#5f7a6d",
    tint: "#e6f2ea",
  },
  "jharokha-dawn": {
    paper: "#fdf6f1",
    ink: "#4a2b28",
    accent: "#b0604a",
    soft: "#8a6a60",
    tint: "#f8e4d9",
  },
  "haldi-baag": {
    paper: "#fefaef",
    ink: "#4a3410",
    accent: "#b8871a",
    soft: "#8a7440",
    tint: "#faedc4",
  },
  "vows-in-ink": {
    paper: "#f7f3e9",
    ink: "#1d1c1a",
    accent: "#b3352a",
    soft: "#6f6a5e",
    tint: "#ebe5d6",
  },
  "chand-bagh": {
    paper: "#f4f8fb",
    ink: "#132a3d",
    accent: "#1f5f7a",
    soft: "#5d7484",
    tint: "#e2eef4",
  },
  "mela-maidan": {
    paper: "#fff8ee",
    ink: "#4a2415",
    accent: "#c2552c",
    soft: "#8a6a55",
    tint: "#fde8d2",
  },
};

export function paletteForTheme(theme: string): PrintPalette {
  return PALETTES[theme] ?? PALETTES["eid"];
}

export type PrintEvent = {
  title: string;
  date: string;
  time: string;
  venue: string;
  address: string;
};

export type PrintDetails = {
  groomName: string;
  brideName: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  eventType?: string;
  hosts?: string;
  hostName?: string;
  message?: string;
  rsvpDeadline?: string;
  dressCode?: string;
  contactName?: string;
  contactPhone?: string;
  arrivalNotes?: string;
  extraEvents?: PrintEvent[];
};

export type PrintInsert = {
  /** Personalised greeting; omitted on a generic insert. */
  name?: string;
  qrSvg: string;
};

const SERIF = `Georgia, "Times New Roman", "Noto Serif", serif`;
const SANS = `"Helvetica Neue", Arial, "Noto Sans", sans-serif`;

function coupleNames(details: PrintDetails): string {
  return `${details.groomName} & ${details.brideName}`;
}

function whenLine(details: PrintDetails): string {
  return [details.date, details.time].filter(Boolean).join(" · ");
}

function whereLine(details: PrintDetails): string {
  return [details.venue, details.address].filter(Boolean).join(", ");
}

function contactLine(details: PrintDetails): string {
  return [details.contactName, details.contactPhone].filter(Boolean).join(" · ");
}

/** A small drawn flourish, so the frame needs no image assets. */
function flourish(color: string): string {
  return `<svg class="flourish" viewBox="0 0 120 12" aria-hidden="true" fill="none" stroke="${color}" stroke-width="0.5">
    <path d="M2 6h42M76 6h42" />
    <path d="M54 6l6-4 6 4-6 4z" fill="${color}" stroke="none" />
    <circle cx="47" cy="6" r="1.1" fill="${color}" stroke="none" />
    <circle cx="73" cy="6" r="1.1" fill="${color}" stroke="none" />
  </svg>`;
}

function pageStyle(palette: PrintPalette): string {
  return `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: ${palette.paper}; color: ${palette.ink}; }
  body { font-family: ${SANS}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page {
    position: relative; width: 148mm; height: 210mm; overflow: hidden;
    padding: 12mm; background: ${palette.paper};
    page-break-after: always; break-after: page;
  }
  .page:last-child { page-break-after: auto; break-after: auto; }
  .frame {
    position: absolute; inset: 7mm; border: 0.5mm solid ${palette.accent};
  }
  .frame::after {
    content: ""; position: absolute; inset: 1.6mm; border: 0.25mm solid ${palette.accent}; opacity: .55;
  }
  .content { position: relative; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 0 4mm; }
  .eyebrow { font-size: 2.6mm; letter-spacing: .32em; text-transform: uppercase; color: ${palette.accent}; margin: 0 0 5mm; }
  .couple { font-family: ${SERIF}; font-size: 15mm; line-height: 1.02; margin: 0; color: ${palette.ink}; overflow-wrap: break-word; max-width: 100%; }
  .couple.long { font-size: 11mm; }
  .amp { display: block; font-size: 8mm; color: ${palette.accent}; margin: 1.5mm 0; font-style: italic; }
  .flourish { width: 46mm; height: auto; margin: 5mm 0; }
  .invite-line { font-family: ${SERIF}; font-style: italic; font-size: 4.2mm; margin: 0 0 4mm; color: ${palette.soft}; }
  .ceremony { font-size: 3.2mm; letter-spacing: .22em; text-transform: uppercase; margin: 0 0 3mm; color: ${palette.accent}; }
  .when { font-family: ${SERIF}; font-size: 5.4mm; margin: 0 0 1.5mm; }
  .where { font-size: 3.4mm; color: ${palette.soft}; margin: 0; }
  .qr-block { margin-top: 7mm; display: flex; align-items: center; gap: 4mm; justify-content: center; padding: 3mm 4mm; background: ${palette.tint}; }
  .qr-block svg { width: 24mm; height: 24mm; display: block; }
  .qr-copy { text-align: left; font-size: 2.6mm; line-height: 1.5; color: ${palette.soft}; max-width: 52mm; }
  .qr-copy strong { display: block; font-size: 2.8mm; letter-spacing: .14em; text-transform: uppercase; color: ${palette.accent}; margin-bottom: 1mm; }

  /* Back page */
  .back { justify-content: flex-start; text-align: left; padding-top: 18mm; }
  .back h2 { font-family: ${SERIF}; font-size: 8mm; margin: 0 0 2mm; font-weight: normal; }
  .back .hosts { font-size: 3mm; color: ${palette.soft}; margin: 0 0 7mm; }
  .back h3 { font-size: 2.5mm; letter-spacing: .24em; text-transform: uppercase; color: ${palette.accent}; margin: 6mm 0 2mm; }
  .event { margin: 0 0 3.5mm; }
  .event-title { font-family: ${SERIF}; font-size: 4.4mm; margin: 0; }
  .event-meta { font-size: 3mm; color: ${palette.soft}; margin: .8mm 0 0; line-height: 1.45; }
  .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 2mm 6mm; font-size: 3mm; color: ${palette.ink}; }
  .facts span { display: block; font-size: 2.3mm; letter-spacing: .16em; text-transform: uppercase; color: ${palette.accent}; margin-bottom: .6mm; }
  .note { font-family: ${SERIF}; font-style: italic; font-size: 3.6mm; line-height: 1.5; color: ${palette.ink}; margin: 0 0 5mm; }
  .back-footer { margin-top: auto; padding-top: 8mm; display: flex; align-items: center; gap: 4mm; }
  .back-footer svg { width: 16mm; height: 16mm; display: block; }
  .back-footer p { margin: 0; font-size: 2.6mm; color: ${palette.soft}; line-height: 1.5; }
  .back-footer strong { display: block; color: ${palette.accent}; letter-spacing: .12em; text-transform: uppercase; font-size: 2.6mm; }

  @page { size: A5 portrait; margin: 0; }
  @media screen { body { background: #e7e3da; padding: 8mm; } .page { margin: 0 auto 8mm; box-shadow: 0 2mm 8mm rgba(0,0,0,.18); } }
  `;
}

function autoPrint(title: string): string {
  return `<script>
    document.title = ${JSON.stringify(title)};
    window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 250); });
  </script>`;
}

function qrBlock(qrSvg: string, url: string, label: string): string {
  return `<div class="qr-block">
    ${qrSvg}
    <div class="qr-copy"><strong>${escapeHtml(label)}</strong>Point your camera here for the map, full schedule and RSVP.<br />${escapeHtml(url)}</div>
  </div>`;
}

export function buildInvitationArtworkHtml(input: {
  title: string;
  details: PrintDetails;
  palette: PrintPalette;
  qrSvg: string;
  url: string;
}): string {
  const { details, palette, qrSvg, url, title } = input;
  const hosts = details.hosts || details.hostName || "";
  const events: PrintEvent[] = [
    {
      title: details.eventType || "Wedding celebration",
      date: details.date,
      time: details.time,
      venue: details.venue,
      address: details.address,
    },
    ...(details.extraEvents ?? []),
  ];
  const contact = contactLine(details);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)} — invitation artwork</title>
<style>${pageStyle(palette)}</style>
</head>
<body>
  <section class="page">
    <div class="frame"></div>
    <div class="content">
      <p class="eyebrow">${hosts ? escapeHtml(hosts) : "Together with their families"}</p>
      <h1 class="couple${coupleNames(details).length > 24 ? " long" : ""}">${escapeHtml(details.groomName)}<span class="amp">&amp;</span>${escapeHtml(details.brideName)}</h1>
      ${flourish(palette.accent)}
      <p class="invite-line">request the pleasure of your company</p>
      <p class="ceremony">${escapeHtml(events[0].title)}</p>
      ${whenLine(details) ? `<p class="when">${escapeHtml(whenLine(details))}</p>` : ""}
      ${whereLine(details) ? `<p class="where">${escapeHtml(whereLine(details))}</p>` : ""}
      ${qrBlock(qrSvg, url, "Scan to open")}
    </div>
  </section>

  <section class="page">
    <div class="frame"></div>
    <div class="content back">
      <h2>${escapeHtml(coupleNames(details))}</h2>
      ${hosts ? `<p class="hosts">${escapeHtml(hosts)}</p>` : ""}
      ${details.message ? `<p class="note">“${escapeHtml(details.message)}”</p>` : ""}

      <h3>Order of celebration</h3>
      ${events
        .map(
          (event) => `<div class="event">
        <p class="event-title">${escapeHtml(event.title)}</p>
        <p class="event-meta">${escapeHtml(
          [event.date, event.time].filter(Boolean).join(" · ") || "To be announced",
        )}${event.venue ? `<br />${escapeHtml([event.venue, event.address].filter(Boolean).join(", "))}` : ""}</p>
      </div>`,
        )
        .join("")}

      ${
        details.dressCode || details.rsvpDeadline || contact || details.arrivalNotes
          ? `<h3>Good to know</h3>
      <div class="facts">
        ${details.dressCode ? `<div><span>Dress code</span>${escapeHtml(details.dressCode)}</div>` : ""}
        ${details.rsvpDeadline ? `<div><span>RSVP by</span>${escapeHtml(details.rsvpDeadline)}</div>` : ""}
        ${contact ? `<div><span>Contact</span>${escapeHtml(contact)}</div>` : ""}
        ${details.arrivalNotes ? `<div><span>Arrival</span>${escapeHtml(details.arrivalNotes)}</div>` : ""}
      </div>`
          : ""
      }

      <div class="back-footer">
        ${qrSvg}
        <p><strong>Scan for details</strong>${escapeHtml(url)}</p>
      </div>
    </div>
  </section>
  ${autoPrint(`${title} — artwork`)}
</body>
</html>`;
}

const INSERT_WIDTH_MM = 90;
const INSERT_HEIGHT_MM = 55;
const INSERTS_PER_PAGE = 8;

function insertMarkup(insert: PrintInsert, details: PrintDetails, palette: PrintPalette): string {
  const greeting = insert.name?.trim();
  return `<div class="insert">
    <div class="insert-qr">${insert.qrSvg}<p class="scan">Scan to open</p></div>
    <div class="insert-copy">
      <p class="insert-eyebrow">You are invited</p>
      ${greeting ? `<p class="greeting${greeting.length > 26 ? " long" : ""}">${escapeHtml(greeting)}</p>` : ""}
      <p class="insert-names">${escapeHtml(coupleNames(details))}</p>
      ${whenLine(details) ? `<p class="insert-meta">${escapeHtml(whenLine(details))}</p>` : ""}
      ${whereLine(details) ? `<p class="insert-meta">${escapeHtml(whereLine(details))}</p>` : ""}
      <p class="insert-hint" style="color:${palette.accent}">Scan for the map &amp; RSVP</p>
    </div>
  </div>`;
}

/**
 * A4 sheets of cut-out inserts. Eight fit per page at 90 × 55 mm, which is the
 * size a print shop can trim from one sheet with almost no waste.
 */
export function buildInsertSheetHtml(input: {
  inserts: PrintInsert[];
  details: PrintDetails;
  palette: PrintPalette;
  title?: string;
}): string {
  const { inserts, details, palette, title } = input;
  const pages: string[] = [];
  for (let index = 0; index < inserts.length; index += INSERTS_PER_PAGE) {
    pages.push(
      `<section class="sheet">${inserts
        .slice(index, index + INSERTS_PER_PAGE)
        .map((insert) => insertMarkup(insert, details, palette))
        .join("")}</section>`,
    );
  }

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title || coupleNames(details))} — QR inserts</title>
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: ${SANS}; color: ${palette.ink}; background: #ffffff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet {
    display: flex; flex-wrap: wrap; gap: 5mm; align-content: flex-start;
    page-break-after: always; break-after: page;
  }
  .sheet:last-child { page-break-after: auto; break-after: auto; }
  .insert {
    width: ${INSERT_WIDTH_MM}mm; height: ${INSERT_HEIGHT_MM}mm; padding: 4.5mm; overflow: hidden;
    display: flex; align-items: center; gap: 4mm;
    border: 0.3mm solid ${palette.accent}; background: ${palette.paper};
    outline: 0.2mm dashed #b9b2a6; outline-offset: 1.2mm;
  }
  .insert-qr { width: 32mm; flex: 0 0 32mm; text-align: center; }
  .insert-qr svg { display: block; width: 30mm; height: 30mm; margin: 0 auto; }
  .scan { margin: 1.2mm 0 0; font-size: 2.1mm; letter-spacing: .12em; text-transform: uppercase; color: ${palette.soft}; }
  .insert-copy { min-width: 0; }
  .insert-eyebrow { margin: 0 0 1.2mm; font-size: 2.2mm; letter-spacing: .2em; text-transform: uppercase; color: ${palette.accent}; }
  .greeting { margin: 0 0 1mm; font-family: ${SERIF}; font-size: 4.6mm; line-height: 1.1; overflow-wrap: break-word; }
  .greeting.long { font-size: 3.4mm; }
  .insert-names { margin: 0 0 1.2mm; font-family: ${SERIF}; font-size: 3.8mm; line-height: 1.15; }
  .greeting + .insert-names { font-size: 3mm; color: ${palette.soft}; }
  .insert-meta { margin: 0; font-size: 2.4mm; line-height: 1.4; color: ${palette.soft}; }
  .insert-hint { margin: 1.6mm 0 0; font-size: 2.2mm; letter-spacing: .08em; text-transform: uppercase; }
  @page { size: A4 portrait; margin: 8mm; }
  @media screen { body { background: #e7e3da; padding: 8mm; } .sheet { width: 194mm; background: #fff; padding: 4mm; margin: 0 auto 8mm; box-shadow: 0 2mm 8mm rgba(0,0,0,.18); } }
</style>
</head>
<body>
  ${pages.join("")}
  ${autoPrint(title ? `${title} — QR inserts` : "QR inserts")}
</body>
</html>`;
}

/** Opens a print document in a new window, with the browser's print dialog. */
export function openPrintWindow(html: string, existing?: Window | null): boolean {
  const popup =
    existing && !existing.closed ? existing : window.open("", "_blank", "width=900,height=1000");
  if (!popup) return false;
  popup.document.open();
  popup.document.write(html);
  popup.document.close();
  return true;
}
