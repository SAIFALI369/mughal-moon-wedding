export const WEDDING_DATE = new Date("2026-11-22T16:00:00+05:30");

export const EVENTS = [
  {
    key: "Nikah",
    title: "Nikah Ceremony",
    date: "Sunday, 22 November 2026",
    time: "4:00 PM",
    venue: "Jama Masjid Hall",
    address: "Chandni Chowk, Old Delhi, India",
    dress: "Ivory, Gold & Pastels",
    icon: "mosque",
    startUtc: "20261122T103000Z",
    endUtc: "20261122T123000Z",
    mapQuery: "Jama Masjid Hall, Chandni Chowk, Old Delhi, India",
  },
  {
    key: "Barat",
    title: "Barat / Reception",
    date: "Sunday, 22 November 2026",
    time: "7:30 PM",
    venue: "The Imperial Ballroom",
    address: "Janpath, New Delhi, India",
    dress: "Burgundy & Gold Formal",
    icon: "rings",
    startUtc: "20261122T140000Z",
    endUtc: "20261122T173000Z",
    mapQuery: "The Imperial Ballroom, Janpath, New Delhi, India",
  },
  {
    key: "Walima",
    title: "Walima",
    date: "Monday, 23 November 2026",
    time: "8:00 PM",
    venue: "The Leela Palace",
    address: "Chanakyapuri, New Delhi, India",
    dress: "Emerald & Royal Navy",
    icon: "feast",
    startUtc: "20261123T143000Z",
    endUtc: "20261123T173000Z",
    mapQuery: "The Leela Palace, Chanakyapuri, New Delhi, India",
  },
] as const;

export type WeddingEvent = (typeof EVENTS)[number];
export type WeddingEventKey = WeddingEvent["key"];

/**
 * Background Music Configuration — "Balagal Ula Bi Kamalihi" (Soothing Edition)
 * Set `CUSTOM_MUSIC_URL` (e.g. "/audio/balagal-ula-bi-kamalihi.mp3") if you upload a custom MP3 file.
 */
export const CUSTOM_MUSIC_URL = "";
export const MUSIC_URL = CUSTOM_MUSIC_URL.trim() || "/audio/balagal-ula-bi-kamalihi.wav";

export const MUSIC_TRACK = {
  title: "Balagal Ula Bi Kamalihi",
  arabic: "بَلَغَ الْعُلَىٰ بِكَمَالِهِ",
  subtitle: "Kashafad-Duja Bi-Jamalihi · Soothing Edition",
  url: MUSIC_URL,
  verses: [
    {
      arabic: "بَلَغَ الْعُلَىٰ بِكَمَالِهِ",
      transliteration: "Balaghal-‘ulā bi-kamālihī",
      meaning: "He attained the highest heights by his perfection",
    },
    {
      arabic: "كَشَفَ الدُّجَىٰ بِجَمَالِهِ",
      transliteration: "Kashafad-dujā bi-jamālihī",
      meaning: "He dispelled the darkness by his beauty",
    },
    {
      arabic: "حَسُنَتْ جَمِيعُ خِصَالِهِ",
      transliteration: "Ḥasunat jamī‘u khiṣālihī",
      meaning: "Beauteous are all his qualities",
    },
    {
      arabic: "صَلُّوا عَلَيْهِ وَآلِهِ",
      transliteration: "Ṣallū ‘alayhi wa ālihī",
      meaning: "Send blessings upon him and his family",
    },
  ],
} as const;

/**
 * Contact & Social Configuration (Add your phone number and Instagram ID here anytime)
 * - WHATSAPP_PHONE: International format without '+' (e.g. "919876543210")
 * - INSTAGRAM_ID: Instagram handle without '@' (e.g. "mohsinwedssimran")
 */
export const WHATSAPP_PHONE = "";
export const INSTAGRAM_ID = "";
export const WEDDING_HASHTAG = "#MohsinWedsSimran";

export const MAP_QUERY = "The Imperial, Janpath, New Delhi";

export function getInstagramUrl() {
  const cleanHandle = INSTAGRAM_ID.trim().replace(/^@/, "");
  return cleanHandle
    ? `https://instagram.com/${encodeURIComponent(cleanHandle)}`
    : "https://www.instagram.com/explore/tags/mohsinwedssimran/";
}

export function getWhatsAppUrl(customMessage?: string) {
  const cleanPhone = WHATSAPP_PHONE.replace(/[^\d]/g, "");
  const text =
    customMessage ||
    "Assalamu Alaikum! Wishing Mohsin & Simran a blessed Nikah, Barat & Walima (22–23 Nov 2026) ✨ #MohsinWedsSimran";
  return cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
    : `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function buildGoogleCalendarUrl(event: WeddingEvent) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Mohsin & Simran — ${event.title}`,
    dates: `${event.startUtc}/${event.endUtc}`,
    details: `${event.title} for Mohsin & Simran. Dress code: ${event.dress}. ${WEDDING_HASHTAG}`,
    location: `${event.venue}, ${event.address}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildWeddingCalendar() {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MohsinWedsSimran//Wedding Invitation//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Mohsin & Simran's Wedding",
    "BEGIN:VEVENT",
    "UID:mohsin-simran-nikah-20261122@wedding",
    "DTSTAMP:20261018T000000Z",
    "DTSTART:20261122T103000Z",
    "DTEND:20261122T123000Z",
    "SUMMARY:Mohsin & Simran — Nikah Ceremony",
    "LOCATION:Jama Masjid Hall\\, Chandni Chowk\\, Old Delhi\\, India",
    "DESCRIPTION:Nikah ceremony. Dress code: Ivory\\, Gold & Pastels. #MohsinWedsSimran",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:mohsin-simran-barat-20261122@wedding",
    "DTSTAMP:20261018T000000Z",
    "DTSTART:20261122T140000Z",
    "DTEND:20261122T173000Z",
    "SUMMARY:Mohsin & Simran — Barat / Reception",
    "LOCATION:The Imperial Ballroom\\, Janpath\\, New Delhi\\, India",
    "DESCRIPTION:Barat and reception. Dress code: Burgundy & Gold Formal. #MohsinWedsSimran",
    "END:VEVENT",
    "BEGIN:VEVENT",
    "UID:mohsin-simran-walima-20261123@wedding",
    "DTSTAMP:20261018T000000Z",
    "DTSTART:20261123T143000Z",
    "DTEND:20261123T173000Z",
    "SUMMARY:Mohsin & Simran — Walima",
    "LOCATION:The Leela Palace\\, Chanakyapuri\\, New Delhi\\, India",
    "DESCRIPTION:Walima celebration. Dress code: Emerald & Royal Navy. #MohsinWedsSimran",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs() {
  const url = URL.createObjectURL(
    new Blob([buildWeddingCalendar()], { type: "text/calendar;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "mohsin-simran-wedding.ics";
  anchor.click();
  URL.revokeObjectURL(url);
}
