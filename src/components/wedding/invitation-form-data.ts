import type { InvitationContent } from "./invitation-schema";
import { getInvitationDetails } from "./invitation-details";
import { defaultInvitationElements } from "./invitation-options";

export type InvitationForm = InvitationContent & { title: string };
export function emptyInvitationForm(): InvitationForm {
  return {
    title: "",
    groomName: "",
    brideName: "",
    date: "",
    time: "",
    venue: "",
    address: "",
    eventType: "Wedding celebration",
    message: "",
    story: "",
    hosts: "",
    hostName: "",
    riteLine: "",
    dressCode: "",
    contactName: "",
    contactPhone: "",
    arrivalNotes: "",
    rsvpDeadline: "",
    endTime: "",
    mapUrl: "",
    livestreamUrl: "",
    hashtag: "",
    giftsNote: "",
    additionalEvents: [],
    songs: [],
    groomPhoto: null,
    bridePhoto: null,
    theme: "eid",
    framework: "moonlit",
    elements: { ...defaultInvitationElements },
  };
}

/** Load old cards without giving missing required fields fake values. */
export function invitationFormForCard(title: string, content: unknown): InvitationForm {
  const details = getInvitationDetails(content);
  const c =
    content && typeof content === "object" && !Array.isArray(content)
      ? (content as Record<string, unknown>)
      : {};
  const field = (key: string) => (typeof c[key] === "string" ? (c[key] as string) : "");
  return {
    ...emptyInvitationForm(),
    ...details,
    title,
    groomName: field("groomName"),
    brideName: field("brideName"),
    date: field("date"),
    time: field("time"),
    venue: field("venue"),
    address: field("address"),
  };
}

/**
 * Once a card has been published (even if later paused back to draft),
 * its couple identity (title, groomName, brideName) is permanently locked so a
 * single partner card credit cannot be repurposed for another couple.
 */
export function isCardCoupleLocked(
  card: { status?: string | null; published_at?: string | null } | null | undefined,
): boolean {
  return Boolean(card && (card.status === "published" || Boolean(card.published_at)));
}

export function preserveLockedCoupleIdentity(
  nextTitle: string,
  nextContent: InvitationContent,
  card: {
    status?: string | null;
    published_at?: string | null;
    title: string;
    content: unknown;
  },
): { title: string; content: InvitationContent } {
  if (!isCardCoupleLocked(card)) {
    return { title: nextTitle, content: nextContent };
  }
  const existing =
    card.content && typeof card.content === "object" && !Array.isArray(card.content)
      ? (card.content as Record<string, unknown>)
      : {};
  const lockedGroom =
    typeof existing.groomName === "string" && existing.groomName.trim()
      ? existing.groomName.trim()
      : nextContent.groomName;
  const lockedBride =
    typeof existing.brideName === "string" && existing.brideName.trim()
      ? existing.brideName.trim()
      : nextContent.brideName;
  return {
    title: card.title.trim() || nextTitle,
    content: {
      ...nextContent,
      groomName: lockedGroom,
      brideName: lockedBride,
    },
  };
}
