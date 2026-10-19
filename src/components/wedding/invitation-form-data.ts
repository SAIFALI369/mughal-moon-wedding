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
    dressCode: "",
    contactName: "",
    contactPhone: "",
    arrivalNotes: "",
    rsvpDeadline: "",
    additionalEvents: [],
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
