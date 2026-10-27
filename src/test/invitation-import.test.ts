import { describe, expect, it } from "vitest";
import {
  mergeReadingIntoForm,
  normalizeInvitationDate,
  normalizeInvitationTime,
  readingCompleteness,
  readingValues,
  readInvitationText,
} from "@/components/wedding/invitation-import";
import { emptyInvitationForm } from "@/components/wedding/invitation-form-data";

const NOTE = `Ayaan weds Zara
Nikah on 22 November 2026 at 4:00 PM IST
Venue: Jama Masjid Hall, Patna, Bihar
Hosted by: The Khan family
Contact: Imran +91 98765 43210
Dress code: Indian formal
RSVP by 10 November 2026
Sangeet on 20 November 2026 at 7:00 PM at Sharma House, Patna
#AyaanWedsZara`;

describe("reading a partner's notes", () => {
  it("feels the couple, the day, the place and the ceremony from a WhatsApp-style note", () => {
    const reading = readInvitationText(NOTE);
    const values = readingValues(reading);
    expect(values.groomName).toBe("Ayaan");
    expect(values.brideName).toBe("Zara");
    expect(values.date).toBe("22/11/2026");
    expect(values.time).toBe("4:00 PM");
    expect(values.venue).toBe("Jama Masjid Hall");
    expect(values.address).toBe("Patna, Bihar");
    expect(values.eventType).toBe("Nikah ceremony");
    expect(values.contactPhone).toBe("+91 98765 43210");
    expect(values.dressCode).toBe("Indian formal");
    expect(values.rsvpDeadline).toBe("10/11/2026");
    expect(values.hashtag).toBe("#AyaanWedsZara");
    expect(readingCompleteness(reading).required).toBe(6);
    expect(reading.missing.map((item) => item.key)).not.toContain("groomName");
  });

  it("reads labelled groom and bride lines, not just 'X weds Y'", () => {
    const reading = readInvitationText(
      "Groom: Ayaan Khan\nBride: Zara Sheikh\nDate: 22 November 2026\nVenue: Jama Masjid Hall, Patna",
    );
    const values = readingValues(reading);
    expect(values.groomName).toBe("Ayaan Khan");
    expect(values.brideName).toBe("Zara Sheikh");
    expect(values.date).toBe("22/11/2026");
    expect(values.venue).toBe("Jama Masjid Hall");
  });

  it("keeps an extra celebration separate from the main date", () => {
    const reading = readInvitationText(NOTE);
    expect(reading.fields.find((field) => field.key === "date")?.value).toBe("22/11/2026");
    expect(reading.events).toHaveLength(1);
    expect(reading.events[0]).toMatchObject({
      title: "Sangeet",
      date: "20/11/2026",
      time: "7:00 PM",
      venue: "Sharma House",
    });
  });

  it("reads day-first numeric dates into DD/MM/YYYY and asks the partner to check ambiguous ones", () => {
    const ambiguous = normalizeInvitationDate("03/04/2027");
    expect(ambiguous).toEqual({ value: "03/04/2027", check: true });
    const clear = normalizeInvitationDate("22/11/2026");
    expect(clear).toEqual({ value: "22/11/2026", check: false });
    expect(normalizeInvitationDate("31 February 2027")).toBeNull();
    expect(normalizeInvitationTime("7 pm")).toEqual({ value: "7:00 PM", check: false });
    expect(normalizeInvitationTime("16:30")).toEqual({ value: "4:30 PM", check: true });
  });

  it("says what is still missing instead of inventing it", () => {
    const reading = readInvitationText("hello hello hello");
    const values = readingValues(reading);
    expect(values.groomName).toBeUndefined();
    expect(values.date).toBeUndefined();
    expect(reading.missing.map((item) => item.key)).toEqual(
      expect.arrayContaining(["groomName", "brideName", "date", "time", "venue", "address"]),
    );
    expect(reading.notes.join(" ")).toMatch(/nothing recognisable/i);
  });

  it("copies only the ticked lines, and never overwrites a half-written card", () => {
    const reading = readInvitationText(NOTE);
    const draft = { ...emptyInvitationForm(), brideName: "Kept by hand" };
    const merged = mergeReadingIntoForm(draft, reading, ["groomName", "date", "venue"]);
    expect(merged.groomName).toBe("Ayaan");
    expect(merged.date).toBe("22/11/2026");
    expect(merged.venue).toBe("Jama Masjid Hall");
    expect(merged.brideName).toBe("Kept by hand");
    expect(merged.address).toBe("");
    expect(merged.additionalEvents).toHaveLength(0);
  });

  it("merges extra events once, without duplicating the same celebration", () => {
    const reading = readInvitationText(NOTE);
    const once = mergeReadingIntoForm(emptyInvitationForm(), reading, [
      "additionalEvents",
      "theme",
    ]);
    expect(once.additionalEvents).toHaveLength(1);
    expect(once.theme).toBe("royal-rajmahal");
    const twice = mergeReadingIntoForm(once, reading, ["additionalEvents", "theme"]);
    expect(twice.additionalEvents).toHaveLength(1);
  });
});
