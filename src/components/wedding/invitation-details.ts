export type InvitationTheme = "mughal" | "eid" | "classic";

export type InvitationDetails = {
  groomName: string;
  brideName: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  message: string;
  theme: InvitationTheme;
};

export type PublishedInvitation = {
  title: string;
  slug: string;
  content: unknown;
  published_at: string | null;
  expires_at: string | null;
};

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

/** Older cards may have incomplete JSON. Never fill them with Mohsin and Simran's details. */
export function getInvitationDetails(content: unknown): InvitationDetails {
  const data =
    content && typeof content === "object" && !Array.isArray(content)
      ? (content as Record<string, unknown>)
      : {};
  const theme = data.theme;
  return {
    groomName: stringField(data, "groomName") || "Groom",
    brideName: stringField(data, "brideName") || "Bride",
    date: stringField(data, "date"),
    time: stringField(data, "time"),
    venue: stringField(data, "venue"),
    address: stringField(data, "address"),
    message: stringField(data, "message"),
    theme: theme === "mughal" || theme === "classic" || theme === "eid" ? theme : "eid",
  };
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

export function buildInvitationCalendarUrl(details: InvitationDetails): string | null {
  const date = parseInvitationDate(details.date);
  if (!date) return null;
  const time = parseInvitationTime(details.time);
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
    text: `${details.groomName} & ${details.brideName} — Wedding Celebration`,
    dates,
    details:
      [details.time && `Time: ${details.time}`, details.message].filter(Boolean).join("\n") ||
      "Wedding celebration",
    location: [details.venue, details.address].filter(Boolean).join(", "),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Retain the card through the day after the wedding. */
export function invitationExpiry(dateText: string): string | null {
  const date = parseInvitationDate(dateText);
  return date
    ? new Date(Date.UTC(date.year, date.month - 1, date.day + 2) - 1).toISOString()
    : null;
}
