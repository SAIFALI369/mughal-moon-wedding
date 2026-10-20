/**
 * The printable card insert a host hands to a print shop: a 90 × 55 mm piece
 * with the invitation QR on the left and the couple's details on the right.
 *
 * It lives in its own document so nothing from the dashboard can leak into the
 * printout, and so a shop can "Save as PDF" straight from the print dialog.
 */

export type CardInsertInput = {
  /** Used only as the document title; never printed. */
  title: string;
  names: string;
  when?: string;
  where?: string;
  /** Hosting family line, if the card has one. */
  footer?: string;
  /** A complete `<svg>` QR code, already generated from the invitation link. */
  qrSvg: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildCardInsertHtml(input: CardInsertInput): string {
  const when = (input.when ?? "").trim();
  const where = (input.where ?? "").trim();
  const footer = (input.footer ?? "").trim();
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(input.title)} — QR card insert</title>
<style>
  @page { size: A4; margin: 12mm; }
  * { box-sizing: border-box; }
  body { margin: 0; padding: 0; background: #ffffff; color: #2b2320; font-family: Georgia, "Times New Roman", serif; }
  .sheet { display: flex; flex-wrap: wrap; gap: 8mm; padding: 4mm 0; }
  .insert {
    width: 90mm; height: 55mm; padding: 5mm;
    display: flex; align-items: center; gap: 5mm;
    border: 0.4mm solid #b08d57; background: #ffffff;
  }
  .qr { width: 34mm; flex: 0 0 34mm; }
  .qr svg { display: block; width: 100%; height: auto; }
  .caption { margin: 1.5mm 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 2.4mm; letter-spacing: .08em; text-transform: uppercase; text-align: center; color: #6f6257; }
  .copy { min-width: 0; }
  .eyebrow { margin: 0 0 1.5mm; font-family: Arial, Helvetica, sans-serif; font-size: 2.6mm; letter-spacing: .22em; text-transform: uppercase; color: #a07a3f; }
  .names { margin: 0 0 2mm; font-size: 7mm; line-height: 1.05; }
  .meta { margin: 0; font-family: Arial, Helvetica, sans-serif; font-size: 2.9mm; line-height: 1.45; color: #4c433d; }
  .scan { margin: 2.5mm 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 2.7mm; color: #7a6a5c; }
  .footer { margin: 2mm 0 0; font-family: Arial, Helvetica, sans-serif; font-size: 2.4mm; color: #8a7b6d; }
  @media screen { body { padding: 10mm; background: #f5f1ea; } .insert { box-shadow: 0 2mm 6mm rgba(0,0,0,.12); } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="insert">
      <div>
        <div class="qr">${input.qrSvg}</div>
        <p class="caption">Scan to open</p>
      </div>
      <div class="copy">
        <p class="eyebrow">You are invited</p>
        <h1 class="names">${escapeHtml(input.names)}</h1>
        ${when ? `<p class="meta">${escapeHtml(when)}</p>` : ""}
        ${where ? `<p class="meta">${escapeHtml(where)}</p>` : ""}
        <p class="scan">Scan for the full invitation, map and RSVP.</p>
        ${footer ? `<p class="footer">${escapeHtml(footer)}</p>` : ""}
      </div>
    </div>
  </div>
  <script>
    // Give the browser a moment to lay out the SVG, then open the print dialog.
    window.addEventListener("load", function () { setTimeout(function () { window.print(); }, 150); });
  </script>
</body>
</html>`;
}
