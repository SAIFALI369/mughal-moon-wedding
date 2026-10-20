import { describe, expect, it } from "vitest";
import {
  RSVP_CSV_HEADER,
  rsvpFileName,
  rsvpsToCsv,
  summariseRsvps,
  type RsvpRecord,
} from "@/lib/rsvp-export";

const reply = (overrides: Partial<RsvpRecord> = {}): RsvpRecord => ({
  name: "Ayesha Khan",
  attending: true,
  guests: 2,
  contact: "99999",
  dietary: "",
  message: "",
  created_at: "2026-11-01T10:00:00.000Z",
  ...overrides,
});

describe("RSVP summary", () => {
  it("counts replies, guests and declines", () => {
    const summary = summariseRsvps([
      reply({ guests: 2 }),
      reply({ name: "Imran", guests: 3 }),
      reply({ name: "Rizwan", attending: false, guests: 0 }),
    ]);
    expect(summary).toMatchObject({
      responses: 3,
      accepting: 2,
      declined: 1,
      guestsExpected: 5,
    });
  });

  it("never counts guests for a declined reply", () => {
    const summary = summariseRsvps([reply({ attending: false, guests: 4 })]);
    expect(summary.guestsExpected).toBe(0);
    expect(summary.accepting).toBe(0);
  });

  it("groups dietary notes, most common first", () => {
    const summary = summariseRsvps([
      reply({ dietary: "Vegetarian, Jain" }),
      reply({ dietary: "vegetarian" }),
      reply({ dietary: "Halal; No onion" }),
      reply({ dietary: "" }),
    ]);
    expect(summary.dietary[0]).toEqual({ label: "Vegetarian", count: 2 });
    expect(summary.dietary).toEqual(
      expect.arrayContaining([
        { label: "Vegetarian", count: 2 },
        { label: "Jain", count: 1 },
        { label: "Halal", count: 1 },
        { label: "No onion", count: 1 },
      ]),
    );
  });

  it("handles an empty list", () => {
    expect(summariseRsvps([])).toEqual({
      responses: 0,
      accepting: 0,
      declined: 0,
      guestsExpected: 0,
      dietary: [],
    });
  });
});

describe("RSVP CSV", () => {
  it("writes a BOM, a CRLF header and one row per reply", () => {
    const csv = rsvpsToCsv([reply()]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain(`${RSVP_CSV_HEADER.join(",")}\r\n`);
    expect(csv.split("\r\n").filter(Boolean)).toHaveLength(2);
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("quotes commas, quotes and newlines inside a cell", () => {
    const csv = rsvpsToCsv([
      reply({ name: 'Ahmed, "Naaz" & Family', message: "Line one\nLine two" }),
    ]);
    expect(csv).toContain('"Ahmed, ""Naaz"" & Family"');
    expect(csv).toContain('"Line one\nLine two"');
  });

  it("writes Yes/No and zero guests for a decline", () => {
    const csv = rsvpsToCsv([reply({ attending: false, guests: 0 })]);
    expect(csv).toContain("Ayesha Khan,No,0,");
  });

  it("neutralises spreadsheet formulas typed into a name", () => {
    const csv = rsvpsToCsv([
      reply({ name: '=HYPERLINK("http://evil","click")' }),
      reply({ name: "+91 99999" }),
      reply({ name: "@sum" }),
    ]);
    expect(csv).toContain(`"'=HYPERLINK(""http://evil"",""click"")"`);
    expect(csv).toContain("'+91 99999");
    expect(csv).toContain("'@sum");
    expect(csv).not.toMatch(/,=HYPERLINK/);
  });

  it("keeps Hindi and Urdu names intact", () => {
    const csv = rsvpsToCsv([reply({ name: "आयशा खान" }), reply({ name: "عائشہ خان" })]);
    expect(csv).toContain("आयशा खान");
    expect(csv).toContain("عائشہ خان");
  });

  it("names the file after the card and the day", () => {
    expect(rsvpFileName("Ayesha & Imran / 2026")).toMatch(
      /^invitation-Ayesha-Imran-2026-rsvps-\d{4}-\d{2}-\d{2}\.csv$/,
    );
    expect(rsvpFileName("///")).toMatch(/^invitation-invitation-rsvps-/);
  });
});
