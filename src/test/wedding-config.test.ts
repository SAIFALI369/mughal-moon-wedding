import { describe, expect, it } from "vitest";

import { buildWeddingCalendar, EVENTS, WEDDING_DATE } from "@/components/wedding/config";

describe("2026 wedding schedule", () => {
  it("counts down to the Nikah in India Standard Time", () => {
    expect(WEDDING_DATE.toISOString()).toBe("2026-11-22T10:30:00.000Z");
  });

  it("keeps every event card on the confirmed dates", () => {
    expect(EVENTS.map(({ key, date, time }) => ({ key, date, time }))).toEqual([
      { key: "Nikah", date: "Sunday, 22 November 2026", time: "4:00 PM" },
      { key: "Barat", date: "Sunday, 22 November 2026", time: "7:30 PM" },
      { key: "Walima", date: "Monday, 23 November 2026", time: "8:00 PM" },
    ]);
  });

  it("includes all three celebrations in the downloadable calendar", () => {
    const calendar = buildWeddingCalendar();

    expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(3);
    expect(calendar).toContain("DTSTART:20261122T103000Z");
    expect(calendar).toContain("DTSTART:20261122T140000Z");
    expect(calendar).toContain("DTSTART:20261123T143000Z");
  });
});
