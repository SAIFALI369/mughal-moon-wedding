// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  buildInvitationCalendarUrl,
  getInvitationDetails,
  invitationExpiry,
  parseInvitationDate,
} from "@/components/wedding/invitation-details";
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

  it("parses ISO and written dates without accepting nonexistent dates", () => {
    expect(parseInvitationDate("15 December 2026")).toEqual({ year: 2026, month: 12, day: 15 });
    expect(parseInvitationDate("December 15, 2026")).toEqual({ year: 2026, month: 12, day: 15 });
    expect(parseInvitationDate("2026-12-15")).toEqual({ year: 2026, month: 12, day: 15 });
    expect(parseInvitationDate("2026-02-30")).toBeNull();
    expect(parseInvitationDate("unknown day")).toBeNull();
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

  it("gives a live card its own assistant named after the host, and its own songs, never Simran", () => {
    const markup = renderToStaticMarkup(
      <PersonalInvitation
        title="Our Day"
        content={{
          ...content,
          hostName: "Farah Khan",
          songs: [
            {
              id: "s1",
              title: "Rosewater",
              path: "11111111-2222-4333-8444-555555555555/66666666-7777-4888-8999-aaaaaaaaaaaa.mp3",
            },
          ],
        }}
        showGate={false}
        slug="our-day-a1b2c3d4"
      />,
    );
    expect(markup).toContain("Ask Farah Khan");
    expect(markup).toContain("Your AI assistant");
    expect(markup).toContain("Open songs for this invitation (1)");
    expect(markup).not.toContain("Ask Simran");
    expect(markup).not.toContain("Mohsin");
    expect(markup).not.toContain("Simran");
    expect(markup).not.toContain("Assalamu alaikum");
  });

  it("names a live card's assistant after the contact, then the groom, when no host name was given", () => {
    const withContact = renderToStaticMarkup(
      <PersonalInvitation
        title="Our Day"
        content={{ ...content, contactName: "Imran" }}
        showGate={false}
        slug="our-day-a1b2c3d4"
      />,
    );
    expect(withContact).toContain("Ask Imran");
    const groomOnly = renderToStaticMarkup(
      <PersonalInvitation
        title="Our Day"
        content={content}
        showGate={false}
        slug="our-day-a1b2c3d4"
      />,
    );
    expect(groomOnly).toContain("Ask Ayaan");
    expect(groomOnly).not.toContain("Open songs for this invitation");
  });

  it("keeps the assistant and song player out of the dashboard preview", () => {
    const markup = renderToStaticMarkup(
      <PersonalInvitation
        title="Our Day"
        content={{ ...content, hostName: "Farah Khan" }}
        showGate={false}
        preview
      />,
    );
    expect(markup).not.toContain("Ask Farah Khan");
    expect(markup).not.toContain("Open songs for this invitation");
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
