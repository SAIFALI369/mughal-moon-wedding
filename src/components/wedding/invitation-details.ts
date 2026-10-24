import {
  defaultInvitationElements,
  invitationFrameworkIds,
  invitationThemeIds,
  type InvitationElements,
  type InvitationFramework,
  type InvitationTheme,
} from "./invitation-options";
import { sanitizeInvitationSongs, type InvitationSong } from "./invitation-music";

export type {
  InvitationTheme,
  InvitationFramework,
  InvitationElements,
} from "./invitation-options";

export type InvitationDetails = {
  groomName: string;
  brideName: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  eventType: string;
  message: string;
  story: string;
  hosts: string;
  hostName: string;
  /** A short line under the hosts, e.g. a Sanskrit blessing or "A storybook celebration". */
  riteLine: string;
  songs: InvitationSong[];
  dressCode: string;
  contactName: string;
  contactPhone: string;
  arrivalNotes: string;
  rsvpDeadline: string;
  /** When the ceremony is expected to end, used for calendar events. */
  endTime: string;
  /** A host-supplied directions link, used instead of a Google query. */
  mapUrl: string;
  /** A custom link for guests who cannot attend in person. */
  livestreamUrl: string;
  /** Wedding hashtag, shown in the footer and the share text. */
  hashtag: string;
  /** A short note about gifts, shagun or a registry. */
  giftsNote: string;
  additionalEvents: { title: string; date: string; time: string; venue: string; address: string }[];
  groomPhoto: string | null;
  bridePhoto: string | null;
  theme: InvitationTheme;
  framework: InvitationFramework;
  elements: InvitationElements;
};

export type PublishedInvitation = {
  id: string;
  title: string;
  slug: string;
  content: unknown;
  published_at: string | null;
  expires_at: string | null;
};

// Accepted uploads are converted to small JPEG data URLs in the browser. Never render
// arbitrary image URIs (particularly SVG or remote URLs) from public card JSON.
export function isSafePortrait(value: string): boolean {
  return (
    value.length <= 240_000 && /^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(value)
  );
}

/**
 * Only absolute web links belong on a public card. This keeps a mistyped or
 * hostile value out of `href` and out of the map iframe.
 */
export function isSafeWebUrl(value: string): boolean {
  return /^https?:\/\/[^\s"'<>]{4,500}$/i.test(value.trim());
}

function safeWebUrl(value: string): string {
  return isSafeWebUrl(value) ? value.trim() : "";
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

type DateParts = { year: number; month: number; day: number };

function stringField(content: Record<string, unknown>, field: string): string {
  return typeof content[field] === "string" ? content[field].trim() : "";
}

/** Existing cards stay readable without filling in somebody else's wedding details. */
export function getInvitationDetails(content: unknown): InvitationDetails {
  const data =
    content && typeof content === "object" && !Array.isArray(content)
      ? (content as Record<string, unknown>)
      : {};
  const elements =
    data.elements && typeof data.elements === "object" && !Array.isArray(data.elements)
      ? (data.elements as Record<string, unknown>)
      : {};
  const rawEvents = Array.isArray(data.additionalEvents) ? data.additionalEvents : [];
  const groomPhoto = stringField(data, "groomPhoto");
  const bridePhoto = stringField(data, "bridePhoto");
  return {
    groomName: stringField(data, "groomName") || "Groom",
    brideName: stringField(data, "brideName") || "Bride",
    date: stringField(data, "date"),
    time: stringField(data, "time"),
    venue: stringField(data, "venue"),
    address: stringField(data, "address"),
    eventType: stringField(data, "eventType") || "Wedding celebration",
    message: stringField(data, "message"),
    story: stringField(data, "story"),
    hosts: stringField(data, "hosts"),
    hostName: stringField(data, "hostName"),
    riteLine: stringField(data, "riteLine"),
    songs: sanitizeInvitationSongs(data.songs),
    dressCode: stringField(data, "dressCode"),
    contactName: stringField(data, "contactName"),
    contactPhone: stringField(data, "contactPhone"),
    arrivalNotes: stringField(data, "arrivalNotes"),
    rsvpDeadline: stringField(data, "rsvpDeadline"),
    endTime: stringField(data, "endTime"),
    mapUrl: safeWebUrl(stringField(data, "mapUrl")),
    livestreamUrl: safeWebUrl(stringField(data, "livestreamUrl")),
    hashtag: stringField(data, "hashtag").slice(0, 60),
    giftsNote: stringField(data, "giftsNote"),
    additionalEvents: rawEvents
      .filter(
        (value): value is Record<string, unknown> =>
          !!value && typeof value === "object" && !Array.isArray(value),
      )
      .map((value) => ({
        title: stringField(value, "title"),
        date: stringField(value, "date"),
        time: stringField(value, "time"),
        venue: stringField(value, "venue"),
        address: stringField(value, "address"),
      }))
      .filter((event) => event.title && event.date && event.venue)
      .slice(0, 4),
    groomPhoto: groomPhoto && isSafePortrait(groomPhoto) ? groomPhoto : null,
    bridePhoto: bridePhoto && isSafePortrait(bridePhoto) ? bridePhoto : null,
    theme:
      typeof data.theme === "string" &&
      (invitationThemeIds as readonly string[]).includes(data.theme)
        ? (data.theme as InvitationTheme)
        : "eid",
    framework:
      typeof data.framework === "string" &&
      (invitationFrameworkIds as readonly string[]).includes(data.framework)
        ? (data.framework as InvitationFramework)
        : "moonlit",
    elements: Object.fromEntries(
      Object.entries(defaultInvitationElements).map(([key, defaultValue]) => [
        key,
        typeof elements[key] === "boolean" ? elements[key] : defaultValue,
      ]),
    ) as InvitationElements,
  };
}

const GENERIC_HOST_LABELS =
  /^(together with (our|their) families?|our families?|the family|family|host|the host|groom|bride|couple|the couple)$/i;

/**
 * Every invitation has its own host-named assistant. Prefer the explicit host name,
 * then the host contact, then the hosting family line, then the creator's name.
 */
export function getInvitationAssistantName(
  details: Pick<InvitationDetails, "hostName" | "contactName" | "hosts" | "groomName">,
): string {
  const candidates = [details.hostName, details.contactName, details.hosts, details.groomName];
  for (const candidate of candidates) {
    const value = candidate
      .replace(/^together with\s+/i, "")
      .replace(/^the\s+/i, "")
      .trim();
    if (!value || GENERIC_HOST_LABELS.test(candidate.trim()) || GENERIC_HOST_LABELS.test(value)) {
      continue;
    }
    return value
      .replace(/[\r\n\t]+/g, " ")
      .replace(/[^\p{L}\p{N}' .&-]/gu, "")
      .replace(/\s+/g, " ")
      .trim()
      .split(" ")
      .slice(0, 2)
      .join(" ")
      .slice(0, 32);
  }
  return "Your Host";
}

/** A tiny monogram for seals, navigation and the back of the card. */
export function getInvitationMonogram(
  details: Pick<InvitationDetails, "groomName" | "brideName">,
): {
  left: string;
  right: string;
} {
  const initial = (value: string) => (value.trim()[0] ?? "?").toUpperCase();
  return { left: initial(details.groomName), right: initial(details.brideName) };
}

export const INVITATION_DATE_FORMAT_ERROR = "Use DD/MM/YYYY format (e.g. 26/11/2029)";
export const INVITATION_PAST_DATE_ERROR = "Past dates are not allowed";

/** Strictly parse only `xx/xx/xxxx` (`DD/MM/YYYY`) calendar dates. */
export function parseStrictDdMmYyyy(value: string): DateParts | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (year < 1000 || year > 9999 || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? { year, month, day }
    : null;
}

export function isPastDateParts(parts: DateParts, now: Date = new Date()): boolean {
  const target = Date.UTC(parts.year, parts.month - 1, parts.day);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return target < today;
}

/**
 * Validate a required/filled editor date:
 * - must be exact `DD/MM/YYYY` (`xx/xx/xxxx`)
 * - must be a real calendar date
 * - must not be in the past (today and future dates are accepted)
 */
export function validateInvitationFormDate(value: string, now: Date = new Date()): string | null {
  const parsed = parseStrictDdMmYyyy(value);
  if (!parsed) return INVITATION_DATE_FORMAT_ERROR;
  if (isPastDateParts(parsed, now)) return INVITATION_PAST_DATE_ERROR;
  return null;
}

export function formatDdMmYyyy(parts: DateParts): string {
  return `${String(parts.day).padStart(2, "0")}/${String(parts.month).padStart(2, "0")}/${String(parts.year).padStart(4, "0")}`;
}

export function toDdMmYyyyIfPossible(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  const parts = parseInvitationDate(trimmed);
  return parts ? formatDdMmYyyy(parts) : trimmed;
}

/**
 * Auto-insert `/` while typing digits forward into a `DD/MM/YYYY` input,
 * without blocking backspace or hiding pasted invalid strings from validation.
 */
export function formatDdMmYyyyTyping(next: string, prev: string = ""): string {
  if (!/^[\d/]*$/.test(next)) {
    return next.slice(0, 100);
  }
  if (next.length <= prev.length) {
    return next;
  }
  const digits = next.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 2) {
    return next.endsWith("/") && digits.length === 2 ? `${digits}/` : digits;
  }
  if (digits.length <= 4) {
    const base = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return next.endsWith("/") && digits.length === 4 ? `${base}/` : base;
  }
  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
}

/**
 * Best-effort calendar parser for countdowns, date plates, Google Calendar links,
 * and legacy saved cards. Supports `DD/MM/YYYY` ("26/11/2029") as well as older
 * saved ISO and written dates.
 */
export function parseInvitationDate(value: string): DateParts | null {
  const input = value
    .trim()
    .replace(
      /^(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[,.\s-]+/i,
      "",
    )
    .trim();
  let year: number;
  let month: number;
  let day: number;
  const iso = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/.exec(input);
  const numericDayFirst = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/.exec(input);
  const dayFirst =
    /^(\d{1,2})(?:st|nd|rd|th)?(?:\s+of)?[\s/-]+([a-z]+)[,.\s/-]+(\d{2}|\d{4})$/i.exec(input);
  const monthFirst = /^([a-z]+)[\s/-]+(\d{1,2})(?:st|nd|rd|th)?[,.\s/-]+(\d{2}|\d{4})$/i.exec(
    input,
  );

  const normalizeYear = (raw: string) => {
    const n = Number(raw);
    return raw.length === 2 ? 2000 + n : n;
  };
  const lookupMonth = (raw: string) => {
    const clean = raw.toLowerCase().replace(/\.$/, "");
    if (clean === "sept") return 9;
    return MONTHS.findIndex((item) => item === clean || item.slice(0, 3) === clean) + 1;
  };

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (numericDayFirst) {
    day = Number(numericDayFirst[1]);
    month = Number(numericDayFirst[2]);
    year = normalizeYear(numericDayFirst[3]);
  } else if (dayFirst || monthFirst) {
    const name = dayFirst?.[2] ?? monthFirst?.[1] ?? "";
    month = lookupMonth(name);
    day = Number(dayFirst?.[1] ?? monthFirst?.[2]);
    year = normalizeYear((dayFirst?.[3] ?? monthFirst?.[3])!);
  } else {
    return null;
  }

  if (year < 1000 || year > 9999 || month < 1 || month > 12) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? { year, month, day }
    : null;
}

type ParsedTime = { hour: number; minute: number; zone: "IST" | "UTC" | null };

function parseInvitationTime(value: string): ParsedTime | null {
  const match = /^(\d{1,2})(?::([0-5]\d))?\s*(am|pm)?(?:\s+(IST|UTC|GMT))?$/i.exec(value.trim());
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? 0);
  const meridian = match[3]?.toLowerCase();
  if (meridian) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (meridian === "pm" ? 12 : 0);
  } else if (hour > 23) {
    return null;
  }
  return {
    hour,
    minute,
    zone: match[4]?.toUpperCase() === "IST" ? "IST" : match[4] ? "UTC" : null,
  };
}

function eventInstant(date: DateParts, time: ParsedTime): Date {
  if (time.zone) {
    // UTC timestamps for explicit time zones. Never substitute Mohsin & Simran's date.
    const offsetMinutes = time.zone === "IST" ? 330 : 0;
    return new Date(
      Date.UTC(date.year, date.month - 1, date.day, time.hour, time.minute - offsetMinutes),
    );
  }
  return new Date(date.year, date.month - 1, date.day, time.hour, time.minute);
}

export function getInvitationCountdownDate(details: InvitationDetails): Date | null {
  const date = parseInvitationDate(details.date);
  if (!date) return null;
  const time = parseInvitationTime(details.time);
  return time ? eventInstant(date, time) : new Date(date.year, date.month - 1, date.day);
}

function calendarDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

type CalendarEvent = {
  title: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  notes?: string;
  /** Optional stated end, so the calendar block covers the real ceremony. */
  endTime?: string;
};

function googleCalendarUrl(event: CalendarEvent): string | null {
  const date = parseInvitationDate(event.date);
  if (!date) return null;
  const time = parseInvitationTime(event.time);
  let dates: string;
  if (time?.zone) {
    const start = eventInstant(date, time);
    const statedEnd = event.endTime ? parseInvitationTime(event.endTime) : null;
    const statedInstant = statedEnd ? eventInstant(date, statedEnd) : null;
    const end =
      statedInstant && statedInstant.getTime() > start.getTime()
        ? statedInstant
        : new Date(start.getTime() + 2 * 60 * 60_000);
    dates = `${calendarDate(start)}/${calendarDate(end)}`;
  } else {
    // An unqualified time has no known time zone. Use an all-day event, preserving
    // the host's written time in the details rather than guessing the guest's zone.
    const start = new Date(Date.UTC(date.year, date.month - 1, date.day));
    const end = new Date(Date.UTC(date.year, date.month - 1, date.day + 1));
    dates = `${calendarDate(start).slice(0, 8)}/${calendarDate(end).slice(0, 8)}`;
  }
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates,
    details:
      [event.time && `Time: ${event.time}`, event.notes].filter(Boolean).join("\n") ||
      "Wedding celebration",
    location: [event.venue, event.address].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildInvitationCalendarUrl(details: InvitationDetails): string | null {
  return googleCalendarUrl({
    title: `${details.groomName} & ${details.brideName} — Wedding Celebration`,
    date: details.date,
    time: details.time,
    venue: details.venue,
    address: details.address,
    notes: details.message,
    endTime: details.endTime,
  });
}

/**
 * Every listed function — the main celebration and each extra event — gets its own
 * calendar link, exactly like the main invitation's event cards.
 */
export function buildInvitationEventCalendarUrl(
  details: InvitationDetails,
  event: InvitationDetails["additionalEvents"][number],
): string | null {
  return googleCalendarUrl({
    title: `${event.title || "Wedding event"} — ${details.groomName} & ${details.brideName}`,
    date: event.date,
    time: event.time,
    venue: event.venue,
    address: event.address,
  });
}

/**
 * The embedded map used by the main invitation. An iframe without an API key needs
 * only a query, so the host's own written venue is enough — no demo coordinates.
 */
export function invitationMapEmbedUrl(location: string): string | null {
  const query = location.trim();
  return query ? `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed` : null;
}

/** Retain the card through the day after the wedding. */
export function invitationExpiry(dateText: string): string | null {
  const date = parseInvitationDate(dateText);
  return date
    ? new Date(Date.UTC(date.year, date.month - 1, date.day + 2) - 1).toISOString()
    : null;
}
