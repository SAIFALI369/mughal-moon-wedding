export const WEDDING_DATE = new Date("2025-06-21T19:00:00+05:30");

export const EVENTS = [
  { key: "Nikah", title: "Nikah Ceremony", date: "Saturday, 21 June 2025", time: "4:00 PM", venue: "Jama Masjid Hall", address: "Chandni Chowk, Old Delhi, India", dress: "Ivory, Gold & Pastels", icon: "mosque" },
  { key: "Barat", title: "Barat / Reception", date: "Saturday, 21 June 2025", time: "7:30 PM", venue: "The Imperial Ballroom", address: "Janpath, New Delhi, India", dress: "Burgundy & Gold Formal", icon: "rings" },
  { key: "Walima", title: "Walima", date: "Sunday, 22 June 2025", time: "8:00 PM", venue: "The Leela Palace", address: "Chanakyapuri, New Delhi, India", dress: "Emerald & Royal Navy", icon: "feast" },
] as const;

export const MUSIC_URL = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3";
export const MAP_QUERY = "The Imperial, Janpath, New Delhi";

export function downloadIcs() {
  const ics = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//MohsinWedsSimran//EN", "BEGIN:VEVENT",
    "UID:mohsin-simran-2025@wedding", "DTSTAMP:20250101T000000Z",
    "DTSTART:20250621T103000Z", "DTEND:20250621T173000Z",
    "SUMMARY:Mohsin & Simran's Wedding",
    "LOCATION:The Imperial\\, Janpath\\, New Delhi",
    "DESCRIPTION:Nikah & Barat celebrations. #MohsinWedsSimran",
    "END:VEVENT", "END:VCALENDAR",
  ].join("\r\n");
  const url = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
  const a = document.createElement("a");
  a.href = url; a.download = "mohsin-simran-wedding.ics"; a.click();
  URL.revokeObjectURL(url);
}
