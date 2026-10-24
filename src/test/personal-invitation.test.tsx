// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  buildInvitationCalendarUrl,
  formatDdMmYyyyTyping,
  getInvitationDetails,
  INVITATION_DATE_FORMAT_ERROR,
  INVITATION_PAST_DATE_ERROR,
  invitationExpiry,
  parseInvitationDate,
  parseStrictDdMmYyyy,
  validateInvitationFormDate,
} from "@/components/wedding/invitation-details";
import { invitationContentSchema } from "@/components/wedding/invitation-schema";
import { InvitationCover, PersonalInvitation } from "@/components/wedding/invitation-template";

const content = {
  groomName: "Ayaan",
  brideName: "Zara",
  date: "15 December 2026",
  time: "4:00 PM IST",
  venue: "Garden Pavilion",
  address: "Patna, Bihar",
  message: "Come celebrate with us!",
  theme: "eid",
};

describe("personal invitation details", () => {
  it("never fills an incomplete card with the main couple's details", () => {
    const details = getInvitationDetails({ date: "2030-01-02", theme: "invalid" });
    expect(details.groomName).toBe("Groom");
    expect(details.brideName).toBe("Bride");
    expect(details.theme).toBe("eid");
  });

  it("accepts only future or today DD/MM/YYYY dates in the form schema and rejects past or non-DD/MM/YYYY dates", () => {
    expect(parseStrictDdMmYyyy("26/11/2029")).toEqual({ year: 2029, month: 11, day: 26 });
    expect(parseStrictDdMmYyyy("05/12/2029")).toEqual({ year: 2029, month: 12, day: 5 });
    expect(parseStrictDdMmYyyy("5/12/2029")).toBeNull();
    expect(parseStrictDdMmYyyy("26-11-2029")).toBeNull();
    expect(parseStrictDdMmYyyy("2029-11-26")).toBeNull();
    expect(parseStrictDdMmYyyy("26th November 2029")).toBeNull();
    expect(parseStrictDdMmYyyy("31/02/2029")).toBeNull();

    const fixedNow = new Date(2026, 9, 24, 15, 0, 0); // 24/10/2026 local
    expect(validateInvitationFormDate("24/10/2026", fixedNow)).toBeNull();
    expect(validateInvitationFormDate("25/10/2026", fixedNow)).toBeNull();
    expect(validateInvitationFormDate("23/10/2026", fixedNow)).toBe(INVITATION_PAST_DATE_ERROR);
    expect(validateInvitationFormDate("26-11-2029", fixedNow)).toBe(INVITATION_DATE_FORMAT_ERROR);

    expect(formatDdMmYyyyTyping("26112029", "")).toBe("26/11/2029");
    expect(formatDdMmYyyyTyping("261", "26")).toBe("26/1");

    expect(
      invitationContentSchema.safeParse({
        ...content,
        date: "26/11/2029",
        rsvpDeadline: "10/11/2029",
        additionalEvents: [
          { title: "Mehndi", date: "25/11/2029", time: "6 PM", venue: "Lawn", address: "" },
        ],
      }).success,
    ).toBe(true);

    for (const wrongFormat of [
      "26-11-2029",
      "2029-11-26",
      "26th November 2029",
      "6/11/2029",
      "31/02/2029",
    ]) {
      const parsed = invitationContentSchema.safeParse({ ...content, date: wrongFormat });
      expect(parsed.success).toBe(false);
      if (!parsed.success) {
        expect(parsed.error.issues[0]?.message).toBe(INVITATION_DATE_FORMAT_ERROR);
      }
    }

    const pastMain = invitationContentSchema.safeParse({ ...content, date: "01/01/2025" });
    expect(pastMain.success).toBe(false);
    if (!pastMain.success) {
      expect(pastMain.error.issues[0]?.message).toBe(INVITATION_PAST_DATE_ERROR);
    }

    // Legacy saved cards still parse for countdowns & date plates on the invitation itself
    expect(parseInvitationDate("15 December 2026")).toEqual({ year: 2026, month: 12, day: 15 });
    expect(parseInvitationDate("26/11/2029")).toEqual({ year: 2029, month: 11, day: 26 });
  });

  it("uses this card's date, time, venue and message in the calendar, not the homepage event", () => {
    const url = buildInvitationCalendarUrl(getInvitationDetails(content));
    const params = new URL(url!).searchParams;
    expect(params.get("dates")).toBe("20261215T103000Z/20261215T123000Z");
    expect(params.get("text")).toContain("Ayaan & Zara");
    expect(params.get("location")).toBe("Garden Pavilion, Patna, Bihar");
    expect(params.get("details")).toContain(content.message);
    expect(url).not.toContain("20261122");
    expect(invitationExpiry("15 December 2026")).toBe("2026-12-16T23:59:59.999Z");
  });

  it("doesn't guess a time zone for a host's unqualified time", () => {
    const url = buildInvitationCalendarUrl(getInvitationDetails({ ...content, time: "4:00 PM" }));
    expect(new URL(url!).searchParams.get("dates")).toBe("20261215/20261216");
    expect(new URL(url!).searchParams.get("details")).toContain("4:00 PM");
    expect(
      buildInvitationCalendarUrl(getInvitationDetails({ ...content, date: "invalid" })),
    ).toBeNull();
  });
});

describe("personal invitation design", () => {
  it("puts the creator's names, date and venue on the same celestial cover as the main invitation", () => {
    const markup = renderToStaticMarkup(<InvitationCover content={content} />);
    expect(markup).toContain("personal-invite-cover");
    expect(markup).toContain("eid-sky");
    expect(markup).toContain("Ayaan");
    expect(markup).toContain("Zara");
    expect(markup).toContain("15 December 2026");
    expect(markup).toContain("Garden Pavilion");
    expect(markup).not.toContain("Mohsin");
    expect(markup).not.toContain("Simran");
  });

  it("opens with a personalized version of the homepage gate without playing the homepage music", () => {
    const markup = renderToStaticMarkup(<PersonalInvitation title="Our Day" content={content} />);
    expect(markup).toContain('id="gate-title"');
    expect(markup).toContain("Open the gates");
    expect(markup).toContain("Ayaan");
    expect(markup).toContain("Zara");
    expect(markup).toContain("Garden Pavilion");
    expect(markup).not.toContain("Enter with music");
  });

  it("renders the full wedding page with the couple's own details, not the homepage story or calendar", () => {
    const markup = renderToStaticMarkup(
      <PersonalInvitation title="Our Day" content={content} showGate={false} preview />,
    );
    expect(markup).toContain("eid-hero");
    expect(markup).toContain("Ayaan");
    expect(markup).toContain("Zara");
    expect(markup).toContain(content.message);
    expect(markup).toContain("Garden Pavilion");
    expect(markup).toContain("Patna, Bihar");
    expect(markup).toContain("20261215T103000Z");
    expect(markup).not.toContain("Ask Simran");
    expect(markup).not.toContain("Mohsin");
    expect(markup).not.toContain("20261122");
  });

  it("keeps unknown dates visible as written without inserting the main event's countdown", () => {
    const markup = renderToStaticMarkup(
      <PersonalInvitation
        title="Our Day"
        content={{ ...content, date: "To be announced" }}
        showGate={false}
        preview
      />,
    );
    expect(markup).toContain("To be announced");
    expect(markup).not.toContain('id="countdown"');
    expect(markup).not.toContain("Save the Date");
  });
});
