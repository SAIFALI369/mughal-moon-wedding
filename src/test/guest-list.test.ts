import { describe, expect, it } from "vitest";
import { MAX_GUEST_ENTRIES, parseGuestList, parseCsvRows } from "@/lib/guest-list";

describe("CSV rows", () => {
  it("keeps commas and quotes inside quoted cells", () => {
    expect(parseCsvRows('Name,Phone\n"Ahmed, Family",98765\n"Rizwan ""Riz"" Khan",123')).toEqual([
      ["Name", "Phone"],
      ["Ahmed, Family", "98765"],
      ['Rizwan "Riz" Khan', "123"],
    ]);
  });

  it("handles CRLF, trailing newlines and blank lines", () => {
    expect(parseCsvRows("A\r\nB\r\n\r\n")).toEqual([["A"], ["B"]]);
  });
});

describe("guest list parsing", () => {
  it("reads one name per line", () => {
    const { entries } = parseGuestList("Ayesha Khan\nUncle Ahmed & Family\nRizwan");
    expect(entries.map((entry) => entry.name)).toEqual([
      "Ayesha Khan",
      "Uncle Ahmed & Family",
      "Rizwan",
    ]);
  });

  it("uses the Name column of a CSV and ignores the rest", () => {
    const { entries, skipped } = parseGuestList(
      "S.No,Name,Phone\n1,Ayesha Khan,99999\n2,Imran Ali,88888",
    );
    expect(entries.map((entry) => entry.name)).toEqual(["Ayesha Khan", "Imran Ali"]);
    expect(skipped).toBe(0);
  });

  it("finds the name column when the header has no obvious label", () => {
    const { entries } = parseGuestList("1,Ayesha Khan,Patna\n2,Rizwan Alam,Gaya");
    expect(entries.map((entry) => entry.name)).toEqual(["Ayesha Khan", "Rizwan Alam"]);
  });

  it("keeps quoted names that contain commas", () => {
    const { entries } = parseGuestList('Name\n"Ahmed, Naaz & Family"');
    expect(entries[0].name).toBe("Ahmed, Naaz & Family");
  });

  it("drops duplicates regardless of case and spacing", () => {
    const { entries, skipped } = parseGuestList("Ayesha  Khan\nayesha khan\nAYESHA KHAN");
    expect(entries).toHaveLength(1);
    expect(skipped).toBe(2);
  });

  it("skips rows that cannot be a printed name", () => {
    const { entries, skipped } = parseGuestList("A\n1\n-\n???\nAyesha Khan\n\n");
    expect(entries.map((entry) => entry.name)).toEqual(["Ayesha Khan"]);
    expect(skipped).toBe(4);
  });

  it("strips a spreadsheet byte-order mark and normalises whitespace", () => {
    const { entries } = parseGuestList("\uFEFF  Ayesha   Khan  ");
    expect(entries[0].name).toBe("Ayesha Khan");
  });

  it("caps the list and reports the dropped rows", () => {
    const text = Array.from(
      { length: MAX_GUEST_ENTRIES + 12 },
      (_, index) => `Guest ${index + 1}`,
    ).join("\n");
    const { entries, truncated } = parseGuestList(text);
    expect(entries).toHaveLength(MAX_GUEST_ENTRIES);
    expect(truncated).toBe(12);
  });

  it("returns nothing for empty input", () => {
    expect(parseGuestList("   \n  ")).toEqual({ entries: [], skipped: 0, truncated: 0 });
  });

  it("accepts Hindi and Urdu names", () => {
    const { entries } = parseGuestList("आयशा खान\nعائشہ خان");
    expect(entries).toHaveLength(2);
  });
});
