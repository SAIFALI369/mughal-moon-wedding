import { describe, expect, it } from "vitest";

import {
  buildGoogleCalendarUrl,
  buildWeddingCalendar,
  EVENTS,
  getInstagramUrl,
  getWhatsAppUrl,
  MUSIC_TRACK,
  MUSIC_URL,
  WEDDING_DATE,
} from "@/components/wedding/config";
import {
  BRIDE_PHOTO,
  COUPLE_PROFILES,
  GALLERY_ITEMS,
  GALLERY_PHOTOS,
  GROOM_PHOTO,
} from "@/components/wedding/photos";
import { AI_NAME as ROUTE_AI_NAME } from "@/routes/ai-concierge";
import {
  AI_NAME,
  GEMINI_API_KEY,
  GEMINI_MODEL,
} from "../../supabase/functions/wedding-concierge/gemini-key";

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

  it("builds Google Calendar links for each celebration", () => {
    const nikahLink = buildGoogleCalendarUrl(EVENTS[0]);
    expect(nikahLink).toContain("calendar.google.com/calendar/render");
    expect(nikahLink).toContain("20261122T103000Z%2F20261122T123000Z");
    expect(nikahLink).toContain("Jama+Masjid+Hall");
  });

  it("configures soothing Balagal Ula Bi Kamalihi background music and social helpers", () => {
    expect(MUSIC_TRACK.title).toBe("Balagal Ula Bi Kamalihi");
    expect(MUSIC_URL).toContain("balagal-ula-bi-kamalihi");
    expect(getInstagramUrl()).toContain("instagram.com");
    expect(getWhatsAppUrl("Mubarak!")).toContain("wa.me");
  });

  it("names the AI wedding concierge Simran and exposes the Supabase Gemini key config", () => {
    expect(AI_NAME).toBe("Simran");
    expect(ROUTE_AI_NAME).toBe("Simran");
    expect(typeof GEMINI_API_KEY).toBe("string");
    expect(GEMINI_MODEL).toBe("gemini-2.5-flash");
  });

  it("exposes configurable bride, groom, and gallery photos", () => {
    expect(COUPLE_PROFILES.map((p) => p.name)).toEqual(["Mohsin", "Simran"]);
    expect(GROOM_PHOTO).toBeTruthy();
    expect(BRIDE_PHOTO).toBeTruthy();
    expect(GALLERY_PHOTOS).toHaveLength(5);
    expect(GALLERY_ITEMS).toHaveLength(5);
    // Two of five are bride & groom at their fixed places (2 & 4)
    expect(GALLERY_ITEMS[1].caption).toContain("Groom");
    expect(GALLERY_ITEMS[3].caption).toContain("Bride");
  });
});
