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
  songs: InvitationSong[];
  dressCode: string;
  contactName: string;
  contactPhone: string;
  arrivalNotes: string;
  rsvpDeadline: string;
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
    songs: sanitizeInvitationSongs(data.songs),
    dressCode: stringField(data, "dressCode"),
    contactName: stringField(data, "contactName"),
    contactPhone: stringField(data, "contactPhone"),
    arrivalNotes: stringField(data, "arrivalNotes"),
    rsvpDeadline: stringField(data, "rsvpDeadline"),
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
      .filter((event) => event.title && parseInvitationDate(event.date) && event.venue)
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

/** Accept both the dashboard's displayed date and ISO dates without locale-dependent parsing. */
export function parseInvitationDate(value: string): DateParts | null {
  const input = value.trim();
  let year: number;
  let month: number;
  let day: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(input);
  const dayFirst = /^(\d{1,2})\s+([a-z]+)\s+(\d{4})$/i.exec(input);
  const monthFirst = /^([a-z]+)\s+(\d{1,2}),?\s+(\d{4})$/i.exec(input);

  if (iso) {
    [, year, month, day] = iso.map(Number);
  } else if (dayFirst || monthFirst) {
    const name = (dayFirst?.[2] ?? monthFirst?.[1] ?? "").toLowerCase();
    month = MONTHS.findIndex((item) => item === name || item.slice(0, 3) === name) + 1;
    day = Number(dayFirst?.[1] ?? monthFirst?.[2]);
    year = Number(dayFirst?.[3] ?? monthFirst?.[3]);
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
};

function googleCalendarUrl(event: CalendarEvent): string | null {
  const date = parseInvitationDate(event.date);
  if (!date) return null;
  const time = parseInvitationTime(event.time);
  let dates: string;
  if (time?.zone) {
    const start = eventInstant(date, time);
    dates = `${calendarDate(start)}/${calendarDate(new Date(start.getTime() + 2 * 60 * 60_000))}`;
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
