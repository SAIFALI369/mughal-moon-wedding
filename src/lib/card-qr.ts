import qrcode from "qrcode-generator";

/**
 * Printable QR codes for a host's invitation.
 *
 * A physical card usually carries a QR that opens the couple's digital
 * invitation. The modules are rendered here (not by a canvas-only library) so
 * the same matrix feeds the on-screen preview, a crisp SVG for print shops and
 * a high-resolution PNG for home printers.
 */

/** Quiet zone in modules. The QR spec asks for at least 4 to stay scannable. */
export const QR_QUIET_ZONE = 4;

/** High error correction so a slightly smudged or glossy print still scans. */
export const QR_ERROR_CORRECTION = "Q" as const;

export type CardQr = {
  moduleCount: number;
  isDark(row: number, col: number): boolean;
};

export type QrSvgOptions = {
  /** Space in modules around the code. Print needs at least four. */
  margin?: number;
  /** Accessible name, also used as the SVG title. */
  label?: string;
  /** Module colour. Keep it dark for reliable scanning. */
  dark?: string;
  /** Background colour. Keep it light for reliable scanning. */
  light?: string;
};

export function invitationShareUrl(origin: string, slug: string, guest?: string): string {
  const base = `${origin.replace(/\/+$/, "")}/invite/${slug.trim()}`;
  const name = (guest ?? "").trim().slice(0, 80);
  return name ? `${base}?guest=${encodeURIComponent(name)}` : base;
}

export function buildCardQr(text: string): CardQr {
  if (!text.trim()) throw new Error("A link is required to build a QR code.");
  const qr = qrcode(0, QR_ERROR_CORRECTION);
  qr.addData(text);
  qr.make();
  const moduleCount = qr.getModuleCount();
  return {
    moduleCount,
    isDark: (row: number, col: number) => qr.isDark(row, col),
  };
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * One path per row of dark modules, merging horizontal runs. The result is a
 * few hundred bytes instead of one rect per module, so it stays sharp at any
 * print size without bloating the page.
 */
export function qrPath(qr: CardQr, margin = QR_QUIET_ZONE): { path: string; size: number } {
  const offset = Math.max(0, Math.round(margin));
  const size = qr.moduleCount + offset * 2;
  const segments: string[] = [];
  for (let row = 0; row < qr.moduleCount; row += 1) {
    let col = 0;
    while (col < qr.moduleCount) {
      if (!qr.isDark(row, col)) {
        col += 1;
        continue;
      }
      let run = 1;
      while (col + run < qr.moduleCount && qr.isDark(row, col + run)) run += 1;
      segments.push(`M${col + offset} ${row + offset}h${run}v1h-${run}z`);
      col += run;
    }
  }
  return { path: segments.join(""), size };
}

export function qrSvgMarkup(qr: CardQr, options: QrSvgOptions = {}): string {
  const margin = options.margin ?? QR_QUIET_ZONE;
  const label = options.label ?? "QR code";
  const dark = options.dark ?? "#000000";
  const light = options.light ?? "#ffffff";
  const { path, size } = qrPath(qr, margin);
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"`,
    ` width="${size}" height="${size}" shape-rendering="crispEdges" role="img"`,
    ` aria-label="${escapeXml(label)}">`,
    `<title>${escapeXml(label)}</title>`,
    `<rect width="${size}" height="${size}" fill="${light}"/>`,
    `<path d="${path}" fill="${dark}"/>`,
    `</svg>`,
  ].join("");
}

/**
 * A PNG for home printers and word processors. 1200 px is 300 dpi at 4 in, and
 * far beyond what a phone camera needs at business-card size.
 */
export function qrPngDataUrl(qr: CardQr, pixels = 1200, margin = QR_QUIET_ZONE): string {
  if (typeof document === "undefined") throw new Error("PNG export needs a browser.");
  const { size } = qrPath(qr, margin);
  const cell = Math.max(1, Math.floor(pixels / size));
  const side = cell * size;
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("This browser cannot export a PNG.");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, side, side);
  context.fillStyle = "#000000";
  const offset = Math.max(0, Math.round(margin));
  for (let row = 0; row < qr.moduleCount; row += 1) {
    let col = 0;
    while (col < qr.moduleCount) {
      if (!qr.isDark(row, col)) {
        col += 1;
        continue;
      }
      let run = 1;
      while (col + run < qr.moduleCount && qr.isDark(row, col + run)) run += 1;
      context.fillRect((col + offset) * cell, (row + offset) * cell, run * cell, cell);
      col += run;
    }
  }
  return canvas.toDataURL("image/png");
}

/** Files are named after the invitation so a print shop can match them up. */
export function qrFileName(slug: string, extension: "png" | "svg"): string {
  const safe = slug.replace(/[^a-z0-9-]+/gi, "-").replace(/^-+|-+$/g, "") || "invitation";
  return `invitation-${safe}-qr.${extension}`;
}
