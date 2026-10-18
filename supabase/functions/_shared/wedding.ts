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

export const weddingFacts = `Couple: Mohsin and Simran. All times are India Standard Time (IST).
${EVENTS.map((e) => `${e.title}: ${e.date}, ${e.time}. ${e.venue}, ${e.address}. Dress code: ${e.dress}. Maps: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(e.mapQuery)}`).join("\n")}
Men may wear a traditional sherwani or formal suit. Women may wear formal Eastern attire, a lehenga, or a gown.
RSVP must be submitted through the invitation's RSVP form. Never claim to submit an RSVP or request private guest details.
`;
