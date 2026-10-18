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
  },
] as const;

export const MUSIC_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3";
export const MAP_QUERY = "The Imperial, Janpath, New Delhi";

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
