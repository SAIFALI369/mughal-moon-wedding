import type { CardConciergeFacts } from "./concierge-personality.ts";

/**
 * The card facts the Edge Function grounds its answers in. This mirrors
 * `getInvitationDetails` in the app so a card assistant never borrows the
 * homepage couple's names, dates or story, and never trusts a guest's claim.
 */
type UnknownRecord = Record<string, unknown>;

const GENERIC_HOST_LABELS =
  /^(together with (our|their) families?|our families?|the family|family|host|the host|groom|bride|couple|the couple)$/i;

function record(value: unknown): UnknownRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function text(source: UnknownRecord, key: string): string {
  return typeof source[key] === "string" ? source[key].trim() : "";
}

function assistantNameFor(facts: {
  hostName: string;
  contactName: string;
  hosts: string;
  groomName: string;
}): string {
  const candidates = [facts.hostName, facts.contactName, facts.hosts, facts.groomName];
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

export function cardConciergeFacts(content: unknown): CardConciergeFacts {
  const data = record(content);
  const groomName = text(data, "groomName") || "Groom";
  const brideName = text(data, "brideName") || "Bride";
  const hostName = text(data, "hostName");
  const contactName = text(data, "contactName");
  const hosts = text(data, "hosts");
  const rawEvents = Array.isArray(data.additionalEvents) ? data.additionalEvents : [];
  const rawSongs = Array.isArray(data.songs) ? data.songs : [];
  return {
    assistantName: assistantNameFor({ hostName, contactName, hosts, groomName }),
    hostName: hostName || assistantNameFor({ hostName, contactName, hosts, groomName }),
    hostLine: hosts,
    couple: `${groomName} & ${brideName}`,
    eventType: text(data, "eventType") || "Wedding celebration",
    date: text(data, "date"),
    time: text(data, "time"),
    venue: text(data, "venue"),
    address: text(data, "address"),
    message: text(data, "message"),
    story: text(data, "story"),
    dressCode: text(data, "dressCode"),
    contactName,
    contactPhone: text(data, "contactPhone"),
    arrivalNotes: text(data, "arrivalNotes"),
    rsvpDeadline: text(data, "rsvpDeadline"),
    extraEvents: rawEvents
      .map(record)
      .map((event) => ({
        title: text(event, "title"),
        date: text(event, "date"),
        time: text(event, "time"),
        venue: text(event, "venue"),
        address: text(event, "address"),
      }))
      .filter((event) => event.title && event.venue)
      .slice(0, 4),
    songs: rawSongs
      .map(record)
      .map((song) => ({ title: text(song, "title") }))
      .filter((song) => song.title)
      .slice(0, 5),
  };
}
