import { describe, expect, it } from "vitest";
import { buildCardQr, qrSvgMarkup } from "@/lib/card-qr";
import {
  buildInsertSheetHtml,
  buildInvitationArtworkHtml,
  paletteForTheme,
  type PrintDetails,
} from "@/lib/print-sheets";
import { invitationThemeIds } from "@/components/wedding/invitation-options";

const QR = qrSvgMarkup(buildCardQr("https://invitingyou.example/invite/ayesha-imran"));
const URL = "https://invitingyou.example/invite/ayesha-imran";

const details: PrintDetails = {
  groomName: "Imran",
  brideName: "Ayesha",
  date: "Saturday, 12 December 2026",
  time: "7:00 PM",
  venue: "Pearl Hall",
  address: "Boring Road, Patna",
  eventType: "Nikah",
  hosts: "The Khan family",
  message: "Your presence is our blessing.",
  rsvpDeadline: "1 December 2026",
  dressCode: "Ivory and gold",
  contactName: "Farhan",
  contactPhone: "99999",
  arrivalNotes: "Parking behind the hall",
  extraEvents: [
    {
      title: "Mehndi",
      date: "10 December 2026",
      time: "4:00 PM",
      venue: "Family home",
      address: "",
    },
  ],
};

const palette = paletteForTheme("royal-rajmahal");

describe("print palettes", () => {
  it("gives every theme its own ink and paper", () => {
    const seen = new Set<string>();
    for (const theme of invitationThemeIds) {
      const entry = paletteForTheme(theme);
      expect(entry.accent).toMatch(/^#[0-9a-f]{6}$/i);
      expect(entry.paper).toMatch(/^#[0-9a-f]{6}$/i);
      expect(entry.accent).not.toBe(entry.ink);
      seen.add(`${entry.paper}|${entry.accent}`);
    }
    expect(seen.size).toBe(invitationThemeIds.length);
  });

  it("falls back to the default theme for unknown values", () => {
    expect(paletteForTheme("no-such-theme")).toEqual(paletteForTheme("eid"));
  });
});

describe("invitation artwork", () => {
  const html = buildInvitationArtworkHtml({
    title: "Ayesha & Imran",
    details,
    palette,
    qrSvg: QR,
    url: URL,
  });

  it("prints an A5 front and back", () => {
    expect(html).toContain("@page { size: A5 portrait; margin: 0; }");
    expect(html.match(/class="page"/g)).toHaveLength(2);
    expect(html).toContain("break-after: page");
  });

  it("puts the names, ceremony, date and venue on the front", () => {
    expect(html).toContain("Imran");
    expect(html).toContain("Ayesha");
    expect(html).toContain("Nikah");
    expect(html).toContain("Saturday, 12 December 2026 · 7:00 PM");
    expect(html).toContain("Pearl Hall, Boring Road, Patna");
    expect(html).toContain("The Khan family");
  });

  it("lists every celebration on the back", () => {
    expect(html).toContain("Order of celebration");
    expect(html).toContain("Mehndi");
    expect(html).toContain("Family home");
  });

  it("shows the practical details and the host note", () => {
    expect(html).toContain("Ivory and gold");
    expect(html).toContain("1 December 2026");
    expect(html).toContain("Farhan · 99999");
    expect(html).toContain("Parking behind the hall");
    expect(html).toContain("Your presence is our blessing.");
  });

  it("includes the scannable QR twice and the plain URL", () => {
    expect(html.match(/<svg/g)?.length).toBeGreaterThanOrEqual(2);
    expect(html).toContain(URL);
  });

  it("shrinks very long names so they stay on the A5 page", () => {
    const long = buildInvitationArtworkHtml({
      title: "Card",
      details: { ...details, groomName: "Muhammad Suleman Ahmed", brideName: "Ayesha Siddiqui" },
      palette,
      qrSvg: QR,
      url: URL,
    });
    expect(long).toContain('class="couple long"');
    expect(html).toContain('class="couple"');
  });

  it("opens the print dialog on load", () => {
    expect(html).toContain("window.print()");
    expect(html).toContain('document.title = "Ayesha & Imran — artwork"');
  });

  it("escapes host-supplied text on both pages", () => {
    const risky = buildInvitationArtworkHtml({
      title: "Card",
      details: {
        ...details,
        groomName: "<script>alert(1)</script>",
        venue: 'Hall <img src=x onerror="alert(1)">',
        message: "a & b",
      },
      palette,
      qrSvg: QR,
      url: URL,
    });
    expect(risky).not.toContain("<script>alert(1)");
    expect(risky).not.toContain("<img src=x");
    expect(risky).toContain("&lt;script&gt;");
    expect(risky).toContain("a &amp; b");
  });

  it("omits empty optional blocks instead of printing labels alone", () => {
    const sparse = buildInvitationArtworkHtml({
      title: "Card",
      details: {
        ...details,
        message: "",
        dressCode: "",
        rsvpDeadline: "",
        contactName: "",
        contactPhone: "",
        arrivalNotes: "",
        hosts: "",
        extraEvents: [],
      },
      palette,
      qrSvg: QR,
      url: URL,
    });
    expect(sparse).not.toContain("Good to know");
    expect(sparse).not.toContain("Today");
    expect(sparse).toContain("Order of celebration");
    expect(sparse).not.toContain("Your presence is our blessing.");
  });
});

describe("insert sheets", () => {
  const sheets = (count: number) =>
    buildInsertSheetHtml({
      inserts: Array.from({ length: count }, (_, index) => ({
        name: `Guest ${index + 1}`,
        qrSvg: QR,
      })),
      details,
      palette,
    });

  it("prints one 90 × 55 mm insert for a single card", () => {
    const html = sheets(1);
    expect(html).toContain("width: 90mm; height: 55mm");
    expect(html.match(/class="insert"/g)).toHaveLength(1);
    expect(html.match(/class="sheet"/g)).toHaveLength(1);
  });

  it("fits eight inserts on an A4 sheet and paginates the rest", () => {
    expect(sheets(8).match(/class="insert"/g)).toHaveLength(8);
    expect(sheets(8).match(/class="sheet"/g)).toHaveLength(1);
    const nine = sheets(9);
    expect(nine.match(/class="insert"/g)).toHaveLength(9);
    expect(nine.match(/class="sheet"/g)).toHaveLength(2);
    expect(sheets(40).match(/class="sheet"/g)).toHaveLength(5);
  });

  it("greets each guest by name and repeats the couple's details", () => {
    const html = sheets(2);
    expect(html).toContain("Guest 1");
    expect(html).toContain("Guest 2");
    expect(html).toContain("Imran");
    expect(html).toContain("Pearl Hall, Boring Road, Patna");
    expect(html).toContain("Scan for the map &amp; RSVP");
  });

  it("leaves the greeting out of a generic insert", () => {
    const html = buildInsertSheetHtml({
      inserts: [{ qrSvg: QR }],
      details,
      palette,
    });
    expect(html).not.toContain('class="greeting"');
    expect(html).toContain('class="insert-names"');
  });

  it("shrinks a long personalised greeting to fit the insert", () => {
    const html = buildInsertSheetHtml({
      inserts: [{ name: "The entire Prasad, Sharma and Verma extended family", qrSvg: QR }],
      details,
      palette,
    });
    expect(html).toContain('class="greeting long"');
  });

  it("escapes guest names", () => {
    const html = buildInsertSheetHtml({
      inserts: [{ name: '<script>alert("x")</script>', qrSvg: QR }],
      details,
      palette,
    });
    expect(html).not.toContain("<script>alert");
    expect(html).toContain("&lt;script&gt;");
  });

  it("uses the card's print colours and A4 page size", () => {
    const html = sheets(1);
    expect(html).toContain(palette.accent);
    expect(html).toContain("@page { size: A4 portrait; margin: 8mm; }");
    expect(html).toContain("outline: 0.2mm dashed #b9b2a6");
  });

  it("returns an empty document rather than crashing with no guests", () => {
    const html = buildInsertSheetHtml({ inserts: [], details, palette });
    expect(html).not.toContain('class="insert"');
    expect(html).toContain("window.print()");
  });
});
