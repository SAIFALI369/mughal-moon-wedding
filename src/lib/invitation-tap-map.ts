import type { InvitationEditorSection } from "@/components/wedding/invitation-form";

/**
 * Which editor section a tap inside the live invitation belongs to.
 *
 * The published invitation is built from a handful of `invite-suite-*` blocks
 * plus the hero and the RSVP shell. Mapping those to the form's sections is what
 * makes "tap the invitation, edit that text" possible without instrumenting
 * every heading in the template.
 */
const TAP_MAP: ReadonlyArray<{ token: string; section: InvitationEditorSection }> = [
  { token: "invite-hero-wrap", section: "essentials" },
  { token: "invite-guest-ribbon", section: "essentials" },
  { token: "invite-countdown-wrap", section: "essentials" },
  { token: "invite-suite-celebration", section: "essentials" },
  { token: "invite-suite-venue", section: "essentials" },
  { token: "invite-suite-note", section: "details" },
  { token: "invite-suite-story", section: "details" },
  { token: "invite-suite-dress", section: "details" },
  { token: "invite-suite-gifts", section: "details" },
  { token: "invite-suite-live", section: "details" },
  { token: "invite-suite-contact", section: "details" },
  { token: "invite-suite-schedule", section: "events" },
  { token: "invite-timeline", section: "events" },
  { token: "invite-suite-gallery", section: "photos" },
  { token: "invite-gallery", section: "photos" },
  { token: "invite-portrait", section: "photos" },
  { token: "invite-rsvp-shell", section: "elements" },
  { token: "invite-suite-wishes", section: "elements" },
  { token: "invite-suite-share", section: "elements" },
  { token: "invite-music", section: "songs" },
  { token: "invite-backdrop", section: "design" },
];

/** Returns the section to open, or null when the tap is not editable content. */
export function sectionForInviteTap(target: Element | null): InvitationEditorSection | null {
  if (!target || typeof target.closest !== "function") return null;
  let node: Element | null = target;
  let depth = 0;
  while (node && depth < 12) {
    const className = typeof node.className === "string" ? node.className : "";
    if (className) {
      for (const entry of TAP_MAP) {
        if (className.includes(entry.token)) return entry.section;
      }
    }
    node = node.parentElement;
    depth += 1;
  }
  return null;
}
