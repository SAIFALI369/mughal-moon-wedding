import type { InvitationFramework, InvitationTheme } from "./invitation-options";

/**
 * Reading a partner's raw notes into a card.
 *
 * Printing partners usually receive a WhatsApp message, a handwritten slip or
 * the proof text of a printed card — not a tidy form. This module turns that
 * prose into a *reading*: the values it could recognise, the values a human
 * should double-check, and the ones still missing. Nothing is saved here; the
 * partner reviews the reading and only then applies it to the card, so the
 * form always shows what the invitation will actually say.
 *
 * The same reader runs on the server as the offline fallback for Simran, the
 * partner-only form assistant, and on the client for an instant preview.
 */

export type ReadingFieldKey =
  | "title"
  | "groomName"
  | "brideName"
  | "date"
  | "time"
  | "endTime"
  | "venue"
  | "address"
  | "eventType"
  | "hosts"
  | "hostName"
  | "contactName"
  | "contactPhone"
  | "dressCode"
  | "rsvpDeadline"
  | "hashtag"
  | "giftsNote"
  | "livestreamUrl"
  | "mapUrl"
  | "message";

export type ReadField = {
  key: ReadingFieldKey;
  label: string;
  value: string;
  /** True when the value is plausible but the partner should confirm it. */
  check?: boolean;
};

export type ReadEvent = {
  title: string;
  date: string;
  time: string;
  venue: string;
  address: string;
};

export type InvitationReading = {
  source: "reader" | "simran";
  fields: ReadField[];
  events: ReadEvent[];
  missing: { key: ReadingFieldKey; label: string }[];
  notes: string[];
  theme: InvitationTheme | null;
  framework: InvitationFramework | null;
};

export const READING_LABELS: Record<ReadingFieldKey, string> = {
  title: "Card title",
  groomName: "Groom",
  brideName: "Bride",
  date: "Wedding date",
  time: "Start time",
  endTime: "End time",
  venue: "Venue",
  address: "Address",
  eventType: "Ceremony",
  hosts: "Hosting families",
  hostName: "Host name",
  contactName: "Contact",
  contactPhone: "Contact phone",
  dressCode: "Dress code",
  rsvpDeadline: "RSVP by",
  hashtag: "Hashtag",
  giftsNote: "Gifts note",
  livestreamUrl: "Live stream",
  mapUrl: "Map link",
  message: "Personal note",
};

/** Required by the card schema, in the order a partner should fill them. */
export const REQUIRED_READING_KEYS: ReadingFieldKey[] = [
  "groomName",
  "brideName",
  "date",
  "time",
  "venue",
  "address",
];

/** Optional but strongly recommended, so the card can answer its guests. */
const RECOMMENDED_READING_KEYS: ReadingFieldKey[] = [
  "eventType",
  "hosts",
  "contactPhone",
  "rsvpDeadline",
];

export const READING_GROUPS: {
  id: string;
  label: string;
  keys: ReadingFieldKey[];
}[] = [
  { id: "couple", label: "The couple", keys: ["groomName", "brideName", "title"] },
  { id: "when", label: "When", keys: ["date", "time", "endTime", "rsvpDeadline"] },
  { id: "where", label: "Where", keys: ["venue", "address", "mapUrl"] },
  { id: "ceremony", label: "Ceremony & style", keys: ["eventType", "dressCode", "hashtag"] },
  {
    id: "hosts",
    label: "Hosts & contact",
    keys: ["hosts", "hostName", "contactName", "contactPhone"],
  },
  { id: "extras", label: "Extras", keys: ["giftsNote", "livestreamUrl", "message"] },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Words that look like names because they are capitalised, but are not. */
const NAME_STOPWORDS = new Set([
  "wedding",
  "nikah",
  "nikkah",
  "shadi",
  "shaadi",
  "marriage",
  "reception",
  "invitation",
  "invite",
  "ceremony",
  "sangeet",
  "mehndi",
  "mehendi",
  "haldi",
  "walima",
  "valima",
  "engagement",
  "roka",
  "baraat",
  "mandap",
  "aarti",
  "the",
  "and",
  "with",
  "at",
  "on",
  "of",
  "for",
  "by",
  "to",
  "from",
  "please",
  "rsvp",
  "details",
  "venue",
  "address",
  "date",
  "time",
  "contact",
  "host",
  "hosts",
  "hosted",
  "family",
  "families",
  "groom",
  "bride",
  "couple",
  "dress",
  "code",
  "live",
  "join",
  "note",
  "message",
  "gifts",
  "gift",
  "phone",
  "call",
  "am",
  "pm",
  "ist",
  "india",
  "save",
  "our",
  "your",
]);

const EXTRA_EVENT_WORDS =
  /\b(sangeet|mehndi|mehendi|haldi|walima|valima|reception|engagement|roka|baraat|aarti)\b/i;

const CEREMONY_WORDS: { pattern: RegExp; label: string; theme: InvitationTheme; main: boolean }[] =
  [
    {
      pattern: /\bnikah\b|\bnikaah\b|\bnikkah\b/i,
      label: "Nikah ceremony",
      theme: "mughal",
      main: true,
    },
    {
      pattern: /\bwalima\b|\bvalima\b/i,
      label: "Walima reception",
      theme: "riad-noor",
      main: true,
    },
    {
      pattern: /\bshubh\s+vivah\b|\bvivah\b|\bmandap\b/i,
      label: "Shubh Vivah",
      theme: "sacred-mandap",
      main: true,
    },
    {
      pattern: /\bwedding\b|\bshaadi\b|\bshadi\b/i,
      label: "Wedding ceremony",
      theme: "eid",
      main: true,
    },
    { pattern: /\breception\b/i, label: "Wedding reception", theme: "ballroom", main: true },
    {
      pattern: /\bengagement\b|\broka\b/i,
      label: "Engagement ceremony",
      theme: "classic",
      main: true,
    },
    {
      pattern: /\bmehndi\b|\bmehendi\b/i,
      label: "Mehndi ceremony",
      theme: "mehndi-night",
      main: false,
    },
    { pattern: /\bsangeet\b/i, label: "Sangeet night", theme: "mehndi-night", main: false },
    { pattern: /\bhaldi\b/i, label: "Haldi ceremony", theme: "haldi-baag", main: false },
  ];

function monthFromName(name: string): number {
  const needle = name.trim().toLowerCase();
  if (needle.length < 3) return 0;
  return MONTHS.findIndex((month) => month.toLowerCase().startsWith(needle.slice(0, 3))) + 1;
}

function validDate(year: number, month: number, day: number): boolean {
  if (![year, month, day].every(Number.isInteger)) return false;
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const probe = new Date(Date.UTC(year, month - 1, day));
  return (
    probe.getUTCFullYear() === year &&
    probe.getUTCMonth() === month - 1 &&
    probe.getUTCDate() === day
  );
}

function formatDate(year: number, month: number, day: number): string {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${String(year).padStart(4, "0")}`;
}

/**
 * Read a date written the way people actually write it: ISO, 22 November 2026,
 * November 22, 2026 or 22/11/2026. A numeric date where both parts could be a
 * month is read day-first (the Indian convention) and flagged for a check.
 */
export function normalizeInvitationDate(raw: string): { value: string; check: boolean } | null {
  const text = raw
    .trim()
    .replace(/^date\s*[:-]\s*/i, "")
    .replace(/(\d)(st|nd|rd|th)\b/gi, "$1")
    .replace(/\s+/g, " ")
    .replace(/[.,]$/, "");

  let match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (match) {
    const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
    return validDate(year, month, day)
      ? { value: formatDate(year, month, day), check: false }
      : null;
  }

  match = /^(\d{1,2})[\s.-]+([A-Za-z]{3,9})[\s,.-]+(\d{4})$/.exec(text);
  if (match) {
    const day = Number(match[1]);
    const month = monthFromName(match[2]);
    const year = Number(match[3]);
    return validDate(year, month, day)
      ? { value: formatDate(year, month, day), check: false }
      : null;
  }

  match = /^([A-Za-z]{3,9})[\s.-]+(\d{1,2})[\s,.-]+(\d{4})$/.exec(text);
  if (match) {
    const month = monthFromName(match[1]);
    const day = Number(match[2]);
    const year = Number(match[3]);
    return validDate(year, month, day)
      ? { value: formatDate(year, month, day), check: false }
      : null;
  }

  match = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(text);
  if (match) {
    const first = Number(match[1]);
    const second = Number(match[2]);
    const year = Number(match[3]);
    // Day-first. Only flag it when both numbers could be a month.
    const check = first <= 12 && second <= 12;
    return validDate(year, second, first)
      ? { value: formatDate(year, second, first), check }
      : null;
  }

  return null;
}

/** Read a time as 12-hour prose, keeping a written zone (IST, UTC…) if present. */
export function normalizeInvitationTime(raw: string): { value: string; check: boolean } | null {
  const text = raw
    .trim()
    .replace(/^time\s*[:-]\s*/i, "")
    .replace(/\s+/g, " ")
    .replace(/\s*hrs?\.?$/i, "")
    .replace(/\./g, "");
  const match = /^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?(?:\s+(IST|UTC|GMT|EST|BST|CET))?$/i.exec(text);
  if (!match) return null;
  const minute = Number(match[2] ?? 0);
  if (minute > 59) return null;
  let hour = Number(match[1]);
  const meridian = match[3]?.toLowerCase();
  const zone = match[4] ? ` ${match[4].toUpperCase()}` : "";
  if (meridian) {
    if (hour < 1 || hour > 12) return null;
    return {
      value: `${hour}:${String(minute).padStart(2, "0")} ${meridian.toUpperCase()}${zone}`,
      check: false,
    };
  }
  if (hour > 23) return null;
  const suffix = hour >= 12 ? "PM" : "AM";
  hour = hour % 12 || 12;
  return { value: `${hour}:${String(minute).padStart(2, "0")} ${suffix}${zone}`, check: true };
}

function splitLines(text: string): string[] {
  return text
    .split(/[\n\r]+|(?<=[.;])\s+(?=[A-Z])/g)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function looksLikeName(value: string): boolean {
  const words = value.trim().split(/\s+/);
  if (!words.length || words.length > 3) return false;
  if (words.some((word) => NAME_STOPWORDS.has(word.toLowerCase()))) return false;
  return words.every((word) => /^[\p{L}'’.-]{2,}$/u.test(word));
}

function cleanName(value: string): string {
  return value
    .replace(/[|•·]+/g, " ")
    .replace(/[^\p{L}\p{N}'’ .-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60);
}

/** Keep the leading words of a name and drop trailing non-name words. */
function trimName(value: string): string {
  const words = cleanName(value).split(/\s+/).filter(Boolean);
  while (words.length && NAME_STOPWORDS.has(words[words.length - 1].toLowerCase())) words.pop();
  return words.slice(0, 3).join(" ");
}

const NAME_PART = /[\p{L}][\p{L}'’.-]*(?:[ \t]+[\p{L}][\p{L}'’.-]*){0,2}/u;

function findCouple(text: string): { groom?: string; bride?: string } {
  const labelled = (label: string) => {
    const match = new RegExp(`${label}\\s*(?:'s)?\\s*(?:name)?\\s*[:-]\\s*([^\\n,;|]+)`, "i").exec(
      text,
    );
    const value = match?.[1] ? trimName(match[1]) : "";
    return looksLikeName(value) ? value : undefined;
  };

  let groom = labelled("groom");
  let bride = labelled("bride");

  const joiner = /(?:[ \t]*(?:weds|wedding[ \t]+with|&|and|❤️|❤|\+|\/)[ \t]*)/iu;
  const pair = new RegExp(`${NAME_PART.source}${joiner.source}${NAME_PART.source}`, "gu");
  for (const match of text.matchAll(pair)) {
    const parts = match[0].split(/\s*(?:weds|wedding\s+with|&|and|❤️|❤|\+|\/)\s*/iu);
    if (parts.length !== 2) continue;
    const left = trimName(parts[0]);
    const right = trimName(parts[1]);
    if (!looksLikeName(left) || !looksLikeName(right)) continue;
    groom = groom ?? left;
    bride = bride ?? right;
    if (groom && bride) break;
  }

  return { groom, bride };
}

function findCeremony(text: string): { label: string; theme: InvitationTheme } | null {
  const lines = splitLines(text);
  const isExtraLine = (line: string) => EXTRA_EVENT_WORDS.test(line);

  // The main ceremony first: a nikah headline outranks a sangeet mention.
  for (const line of lines) {
    for (const candidate of CEREMONY_WORDS) {
      if (!candidate.main) continue;
      if (candidate.pattern.test(line)) return { label: candidate.label, theme: candidate.theme };
    }
  }

  // "Groom: … / Bride: …" with no ceremony word still means a wedding.
  if (
    /groom\s*(?:'s)?\s*(?:name)?\s*[:-]/i.test(text) &&
    /bride\s*(?:'s)?\s*(?:name)?\s*[:-]/i.test(text)
  ) {
    return { label: "Wedding ceremony", theme: "eid" };
  }

  // A mehndi-only or sangeet-only card is legitimate too.
  for (const line of lines) {
    for (const candidate of CEREMONY_WORDS) {
      if (candidate.main || !isExtraLine(line)) continue;
      if (candidate.pattern.test(line)) return { label: candidate.label, theme: candidate.theme };
    }
  }
  return null;
}

/** "Jama Masjid Hall, Patna, Bihar" → venue and address, without a label. */
function splitPlace(value: string): { venue: string; address: string } {
  const cleaned = value
    .replace(/^[a-z]+\s+at\s+/i, "")
    .replace(/^(?:venue|location|address|place)\s*[:-]\s*/i, "")
    .replace(/\b(?:at|on)\s+\d.*$/i, "")
    .replace(/[.!]+$/, "")
    .trim();
  const parts = cleaned
    .split(/\s*,\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return { venue: "", address: "" };
  if (parts.length === 1) return { venue: parts[0], address: "" };
  return { venue: parts[0], address: parts.slice(1).join(", ") };
}

/** The last "at <place>" on a line; "at 4 pm at the hall" ends at the hall. */
function atPlace(line: string): string {
  const matches = [...line.matchAll(/\bat\s+([\p{L}][^\n;|]*)/giu)];
  return matches.length ? (matches[matches.length - 1][1] ?? "").trim() : "";
}

function findPlace(text: string): { venue: string; address: string } {
  const labelled =
    /(?:venue|location|place)\s*[:-]\s*([^\n;|]+)/i.exec(text) ??
    /(?:address)\s*[:-]\s*([^\n;|]+)/i.exec(text);
  if (labelled?.[1]) {
    const place = splitPlace(labelled[1]);
    if (place.venue) return place;
  }

  const lines = splitLines(text);
  const mainLines = lines.filter((line) => !EXTRA_EVENT_WORDS.test(line));
  for (const line of mainLines) {
    const place = splitPlace(atPlace(line));
    if (place.venue && looksLikeName(place.venue.replace(/[^\p{L} .&'-]/gu, "").trim())) {
      return place;
    }
  }

  const halls =
    /\b([\p{L}][\p{L}' .&()-]{2,60}(?:hall|palace|garden|gardens|hotel|resort|farm|lawn|banquet|convention|masjid|mandir|temple|ashram|marriage\s+home))\b[^\n;|]*/iu.exec(
      mainLines.join("\n"),
    );
  if (halls?.[0]) {
    const place = splitPlace(halls[0]);
    if (place.venue) return place;
  }

  return { venue: "", address: "" };
}

const DATE_PATTERNS: RegExp[] = [
  /\b\d{4}-\d{1,2}-\d{1,2}\b/g,
  /\b\d{1,2}(?:st|nd|rd|th)?[\s.-]+[A-Za-z]{3,9}[\s,.-]+\d{4}\b/g,
  /\b[A-Za-z]{3,9}[\s.-]+\d{1,2}(?:st|nd|rd|th)?[\s,]+\d{4}\b/g,
  /\b\d{1,2}[./-]\d{1,2}[./-]\d{4}\b/g,
];

function lineAt(text: string, index: number): string {
  const start = text.lastIndexOf("\n", index) + 1;
  const end = text.indexOf("\n", index);
  return text.slice(start, end === -1 ? text.length : end);
}

/** The main celebration date: earliest date not belonging to an extra event. */
function findMainDate(text: string): { raw: string; value: string; check: boolean } | null {
  const found: { raw: string; value: string; check: boolean; index: number }[] = [];
  for (const pattern of DATE_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const parsed = normalizeInvitationDate(match[0]);
      if (!parsed) continue;
      if (EXTRA_EVENT_WORDS.test(lineAt(text, match.index ?? 0))) continue;
      found.push({ raw: match[0], ...parsed, index: match.index ?? 0 });
    }
  }
  found.sort((a, b) => a.index - b.index);
  return found[0] ?? null;
}

function findPhone(text: string): string {
  const matches = [...text.matchAll(/(?:\+?91[\s-]?)?[6-9]\d(?:[\s-]?\d){8,9}/g)].map((item) =>
    item[0].trim(),
  );
  if (!matches.length) return "";
  return matches
    .sort((a, b) => b.length - a.length)[0]
    .replace(/\s+/g, " ")
    .trim();
}

function findHashtag(text: string): string {
  const match = /#[\p{L}\p{N}_]{2,40}/u.exec(text);
  return match?.[0] ?? "";
}

function findUrl(text: string, pattern: RegExp): string {
  for (const match of text.matchAll(/https?:\/\/[^\s<>"')\]]+/g)) {
    const url = match[0].replace(/[.,;]+$/, "");
    if (pattern.test(url) || pattern.test(text)) return url;
  }
  return "";
}

function findExtraEvents(text: string, main: string, venue: string, address: string): ReadEvent[] {
  const events: ReadEvent[] = [];
  for (const line of splitLines(text)) {
    const keyword = line.match(EXTRA_EVENT_WORDS)?.[0];
    if (!keyword) continue;
    const title = titleCase(keyword);
    if (events.some((event) => event.title.toLowerCase() === title.toLowerCase())) continue;

    const rawDate = DATE_PATTERNS.map((pattern) => line.match(pattern)?.[0]).find(Boolean);
    const parsedDate = rawDate ? normalizeInvitationDate(rawDate) : null;
    const date = parsedDate?.value && parsedDate.value !== main ? parsedDate.value : "";

    const rawTime = /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.exec(line)?.[0];
    const time = rawTime ? (normalizeInvitationTime(rawTime)?.value ?? "") : "";

    const place = splitPlace(atPlace(line));
    const eventVenue = place.venue || venue;
    const eventAddress = place.address || address;

    if (!date && !time && eventVenue === venue) continue;
    events.push({ title, date, time, venue: eventVenue, address: eventAddress });
    if (events.length >= 4) break;
  }
  return events;
}

function labelledValue(text: string, pattern: RegExp): string {
  const match = pattern.exec(text);
  return (
    match?.[1]
      ?.replace(/\s+/g, " ")
      .replace(/[.,;|]+$/, "")
      .trim() ?? ""
  );
}

/**
 * Read pasted notes into a candidate card. Deterministic and instant: the AI
 * assistant refines this same shape, but the structure never depends on it.
 */
export function readInvitationText(raw: string): InvitationReading {
  const text = raw.replace(/\r/g, "").trim();
  const notes: string[] = [];
  const fields: ReadField[] = [];

  function add(key: ReadingFieldKey, value: string, check = false) {
    const trimmed = value.trim();
    if (!trimmed || fields.some((field) => field.key === key)) return;
    fields.push({ key, label: READING_LABELS[key], value: trimmed, ...(check ? { check } : {}) });
  }

  const { groom, bride } = findCouple(text);
  if (groom) add("groomName", groom);
  if (bride) add("brideName", bride);
  if (groom && bride) add("title", `${groom} & ${bride} Wedding`);

  const mainDate = findMainDate(text);
  if (mainDate) {
    add("date", mainDate.value, mainDate.check);
    if (mainDate.check) {
      notes.push(
        `"${mainDate.raw}" was read day-first as ${mainDate.value}. Confirm the day and month.`,
      );
    }
  }

  const labelledTime = labelledValue(
    text,
    /(?:time|starts?|starting)\s*(?:at)?\s*[:-]?\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm|a\.m\.|p\.m\.)?(?:\s+IST)?)/i,
  );
  const rawTime = labelledTime || /\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/i.exec(text)?.[0] || "";
  const time = rawTime ? normalizeInvitationTime(rawTime) : null;
  if (time) add("time", time.value, time.check);

  const timeRange =
    /\b(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*(?:to|-|–|until|till)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))\b/i.exec(
      text,
    );
  if (timeRange?.[2]) {
    const end = normalizeInvitationTime(timeRange[2]);
    if (end?.value && end.value !== time?.value) add("endTime", end.value);
  }

  const place = findPlace(text);
  if (place.venue) add("venue", place.venue);
  if (place.address) add("address", place.address);

  const ceremony = findCeremony(text);
  if (ceremony) add("eventType", ceremony.label);

  const hosts = labelledValue(text, /(?:hosted\s+by|hosts?|families?)\s*[:-]\s*([^\n;|]+)/i);
  if (hosts && !/^(the\s+)?(groom|bride|couple)$/i.test(hosts)) add("hosts", hosts);

  const hostName = labelledValue(text, /(?:host\s*name|your\s+name)\s*[:-]\s*([^\n;|]+)/i);
  if (hostName) add("hostName", trimName(hostName));

  const contactRaw = labelledValue(
    text,
    /(?:contact|call|for\s+questions?)\s*(?:person|name)?\s*[:-]?\s*([^\n;|]+)/i,
  );
  const contactName = trimName(contactRaw.split(/\s+(?:at|on|\+)/i)[0] ?? "");
  if (contactName && looksLikeName(contactName)) add("contactName", contactName);

  const phone = findPhone(text);
  if (phone) {
    add("contactPhone", phone);
    if (!phone.startsWith("+"))
      notes.push(`Phone read as ${phone} — add +91 if it is an Indian number.`);
  }

  const dressCode = labelledValue(text, /dress\s*code\s*[:-]\s*([^\n;|]+)/i);
  if (dressCode) add("dressCode", dressCode);

  const rsvpRaw = labelledValue(text, /rsvp\s*(?:by|before|deadline)\s*[:-]?\s*([^\n;|]+)/i);
  const rsvp = rsvpRaw ? normalizeInvitationDate(rsvpRaw) : null;
  if (rsvp) add("rsvpDeadline", rsvp.value);
  else if (rsvpRaw) add("rsvpDeadline", rsvpRaw);

  const hashtag = findHashtag(text);
  if (hashtag) add("hashtag", hashtag);

  const gifts = labelledValue(text, /(?:gifts?|registry|shagun|blessings?)\s*[:-]\s*([^\n;|]+)/i);
  if (gifts) add("giftsNote", gifts);

  const livestream = findUrl(
    text,
    /(?:youtube\.com\/live|youtu\.be|zoom\.us|meet\.google|stream|live)/i,
  );
  if (livestream) add("livestreamUrl", livestream);

  const mapUrl = findUrl(text, /(?:google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps)/i);
  if (mapUrl) add("mapUrl", mapUrl);

  const message = labelledValue(text, /(?:message|note|request)\s*[:-]\s*([^\n]{6,400})/i);
  if (message) add("message", message);

  const events = findExtraEvents(text, mainDate?.value ?? "", place.venue, place.address);

  const missing = [...REQUIRED_READING_KEYS, ...RECOMMENDED_READING_KEYS]
    .filter((key) => !fields.some((field) => field.key === key))
    .map((key) => ({ key, label: READING_LABELS[key] }));

  if (fields.length === 0) {
    notes.push(
      "Nothing recognisable yet. Paste the couple's message as it is — names, a date, a time and a place are enough to begin.",
    );
  } else {
    notes.push(
      `Read ${fields.length} detail${fields.length === 1 ? "" : "s"}${
        events.length
          ? ` and ${events.length} extra celebration${events.length === 1 ? "" : "s"}`
          : ""
      } from ${text.split(/\s+/).length} words.`,
    );
  }
  if (!phone) notes.push("No phone number found — guests will have no one to call.");
  if (!place.address) notes.push("No full address found — add the city and state for the map.");

  return {
    source: "reader",
    fields,
    events,
    missing,
    notes,
    theme: ceremony?.theme ?? null,
    framework: null,
  };
}

/** Values as a plain record, for merging into the form and for tests. */
export function readingValues(
  reading: InvitationReading,
): Partial<Record<ReadingFieldKey, string>> {
  return Object.fromEntries(reading.fields.map((field) => [field.key, field.value])) as Partial<
    Record<ReadingFieldKey, string>
  >;
}

export function readingCompleteness(reading: InvitationReading): {
  found: number;
  required: number;
  total: number;
} {
  const values = readingValues(reading);
  const total = REQUIRED_READING_KEYS.length + RECOMMENDED_READING_KEYS.length;
  return {
    found: Object.values(values).filter(Boolean).length,
    required: REQUIRED_READING_KEYS.filter((key) => !!values[key]).length,
    total,
  };
}

/**
 * Merge only the values the partner ticked; everything else is left untouched.
 * Reading never overwrites the whole form, so half-written work survives a paste.
 */
export function mergeReadingIntoForm<T extends Record<string, unknown>>(
  form: T,
  reading: InvitationReading,
  accepted: Iterable<string>,
): T {
  const take = new Set(accepted);
  const values = readingValues(reading);
  const next: Record<string, unknown> = { ...form };
  for (const [key, value] of Object.entries(values)) {
    if (take.has(key) && value) next[key] = value;
  }
  if (take.has("additionalEvents") && reading.events.length) {
    const existing = Array.isArray(form.additionalEvents)
      ? (form.additionalEvents as ReadEvent[])
      : [];
    const merged = [...existing];
    for (const event of reading.events) {
      if (
        !merged.some(
          (item) =>
            item.title.toLowerCase() === event.title.toLowerCase() && item.date === event.date,
        )
      ) {
        merged.push(event);
      }
    }
    next.additionalEvents = merged.slice(0, 4);
  }
  if (take.has("theme") && reading.theme) next.theme = reading.theme;
  if (take.has("framework") && reading.framework) next.framework = reading.framework;
  return next as T;
}
