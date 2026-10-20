// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { invitationContentSchema } from "@/components/wedding/invitation-schema";
import { InvitationCover, PersonalInvitation } from "@/components/wedding/invitation-template";
import {
  invitationThemeIds,
  invitationFrameworkIds,
  defaultInvitationElements,
} from "@/components/wedding/invitation-options";
import {
  invitationFormForCard,
  emptyInvitationForm,
} from "@/components/wedding/invitation-form-data";
import {
  buildInvitationEventCalendarUrl,
  getInvitationDetails,
  invitationMapEmbedUrl,
  isSafePortrait,
} from "@/components/wedding/invitation-details";
import {
  guestNameError,
  invitationRsvpSchema,
  normalizeGuestName,
} from "@/components/wedding/invitation-rsvp-schema";

const basics = {
  groomName: "Ayaan",
  brideName: "Zara",
  date: "15 December 2030",
  time: "4:00 PM IST",
  venue: "Garden Pavilion",
  address: "Patna, Bihar",
  eventType: "Nikah ceremony",
  hosts: "Our families",
  message: "Join us for this joyful day",
};

describe("creator invitation design and input", () => {
  it("renders every theme with every independently chosen framework, never the homepage couple's details", () => {
    for (const theme of invitationThemeIds) {
      for (const framework of invitationFrameworkIds) {
        const card = { ...basics, theme, framework };
        const cover = renderToStaticMarkup(<InvitationCover content={card} />);
        const page = renderToStaticMarkup(
          <PersonalInvitation title="Our Day" content={card} preview showGate={false} />,
        );
        expect(cover).toContain(`data-theme="${theme}"`);
        expect(cover).toContain(`data-framework="${framework}"`);
        expect(page).toContain(`data-theme="${theme}"`);
        expect(page).toContain(`data-framework="${framework}"`);
        expect(page).toContain("Ayaan");
        expect(page).toContain("Zara");
        expect(page).toContain("Patna, Bihar");
        expect(page).toContain('id="celebration"');
        expect(page).not.toContain("Mohsin");
        expect(page).not.toContain("Simran");
        if (framework === "moonlit") expect(page).toContain("eid-hero");
        else if (framework === "curtain-call") expect(page).toContain("curtain-stage");
        else expect(page).toContain("invitation-stage");
      }
    }
  });

  it("always keeps essential wedding details but honours every optional visibility choice", () => {
    const jpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64")}`;
    const extra = [
      {
        title: "Sangeet",
        date: "14 December 2030",
        time: "6:00 PM IST",
        venue: "City Hall",
        address: "East Wing",
      },
    ];
    const content = {
      ...basics,
      theme: "aladin",
      framework: "cinematic-stage",
      story: "We met at sunrise",
      groomPhoto: jpeg,
      bridePhoto: jpeg,
      additionalEvents: extra,
      dressCode: "Festive gold",
      contactName: "Host A",
      contactPhone: "+91 90000 00000",
      arrivalNotes: "Use the front gate",
      elements: Object.fromEntries(
        Object.keys(defaultInvitationElements).map((key) => [key, false]),
      ),
    };
    const hidden = renderToStaticMarkup(
      <PersonalInvitation
        title="Our Day"
        content={content}
        cardId="c0000000-0000-4000-8000-000000000001"
      />,
    );
    for (const section of [
      "gate-title",
      "countdown",
      "message",
      "story",
      "gallery",
      "schedule",
      "venue",
      "dress-code",
      "contact",
      "rsvp",
      "wishes",
    ]) {
      expect(hidden).not.toContain(`id="${section}"`);
    }
    expect(hidden).not.toContain("Portrait of Ayaan");
    for (const required of [
      "Ayaan",
      "Zara",
      "15 December 2030",
      "4:00 PM IST",
      "Garden Pavilion",
      "Patna, Bihar",
    ]) {
      expect(hidden).toContain(required);
    }

    const shown = renderToStaticMarkup(
      <PersonalInvitation
        title="Our Day"
        content={{ ...content, elements: defaultInvitationElements }}
        preview
        showGate={false}
      />,
    );
    for (const section of [
      "countdown",
      "message",
      "story",
      "gallery",
      "schedule",
      "venue",
      "dress-code",
      "contact",
      "rsvp",
      "wishes",
    ]) {
      expect(shown).toContain(`id="${section}"`);
    }
    expect(shown).toContain("Portrait of Ayaan");
    expect(shown).toContain("Portrait of Zara");
    expect(shown).toContain("This is a private preview");
    expect(shown).not.toContain("guest-name"); // a draft preview cannot write RSVPs
    // The card carries the main invitation's celebration features, not just text.
    expect(shown).toContain("output=embed");
    expect(shown).toContain("invite-map-tabs");
    expect(shown).toContain("Add to calendar");
    expect(shown).toContain("Wishes open once this invitation is published.");
  });

  it("gives every theme and framework the same gallery, map, wishes and sharing features", () => {
    const jpeg = `data:image/jpeg;base64,${Buffer.from([0xff, 0xd8, 0xff, 0xd9]).toString("base64")}`;
    for (const theme of invitationThemeIds) {
      for (const framework of invitationFrameworkIds) {
        const card = {
          ...basics,
          theme,
          framework,
          story: "We met at sunrise",
          groomPhoto: jpeg,
          bridePhoto: jpeg,
          dressCode: "Festive gold",
          additionalEvents: [
            {
              title: "Sangeet",
              date: "14 December 2030",
              time: "6:00 PM IST",
              venue: "City Hall",
              address: "East Wing",
            },
          ],
        };
        const markup = renderToStaticMarkup(
          <PersonalInvitation
            title="Our Day"
            content={card}
            showGate={false}
            slug="ayaan-weds-zara"
            cardId="c0000000-0000-4000-8000-000000000001"
          />,
        );
        expect(markup).toContain('id="gallery"');
        expect(markup).toContain('id="wishes"');
        expect(markup).toContain('id="share"');
        expect(markup).toContain('id="venue"');
        expect(markup).toContain("invite-gallery-tile");
        expect(markup).toContain("invite-map-frame");
        expect(markup).toContain("https://www.google.com/maps?q=Garden%20Pavilion");
        expect(markup).toContain("output=embed");
        expect(markup).toContain("/invite/ayaan-weds-zara");
        expect(markup).toContain("City Hall");
        // Guests may look at the gallery, never upload to it.
        expect(markup).not.toContain("invite-gallery-add");
        expect(markup).not.toContain('type="file"');
        expect(markup).toContain("View only");
        expect(markup).not.toContain("Mohsin");
        expect(markup).not.toContain("Simran");
        expect(markup).not.toContain("20261122");
      }
    }
  });

  it("requires all essentials, real dates, safe portraits and valid event details", () => {
    const complete = { ...emptyInvitationForm(), ...basics };
    expect(invitationContentSchema.safeParse(complete).success).toBe(true);
    for (const key of [
      "groomName",
      "brideName",
      "date",
      "time",
      "venue",
      "address",
      "eventType",
    ] as const) {
      expect(invitationContentSchema.safeParse({ ...complete, [key]: " " }).success).toBe(false);
    }
    expect(invitationContentSchema.safeParse({ ...complete, date: "2030-02-30" }).success).toBe(
      false,
    );
    expect(
      invitationContentSchema.safeParse({ ...complete, rsvpDeadline: "tomorrow" }).success,
    ).toBe(false);
    expect(
      invitationContentSchema.safeParse({
        ...complete,
        additionalEvents: [{ title: "Party", date: "", time: "", venue: "" }],
      }).success,
    ).toBe(false);
    expect(
      invitationContentSchema.safeParse({
        ...complete,
        groomPhoto: "data:image/svg+xml;base64,PHN2Zz4=",
      }).success,
    ).toBe(false);
    expect(isSafePortrait("data:image/jpeg;base64,/9j/2Q==")).toBe(true);
    expect(isSafePortrait("https://example.invalid/portrait.jpg")).toBe(false);
  });

  it("loads existing cards with safe defaults while preserving their theme, layout and toggles", () => {
    const form = invitationFormForCard("Old Card", {
      theme: "futuristic",
      framework: "modern-mosaic",
      elements: { rsvp: false },
      groomName: "G",
    });
    expect(form.theme).toBe("futuristic");
    expect(form.framework).toBe("modern-mosaic");
    expect(form.elements.rsvp).toBe(false);
    expect(form.elements.countdown).toBe(true);
    expect(form.brideName).toBe("");
    expect(
      getInvitationDetails({
        theme: "not-a-theme",
        framework: "unknown",
        groomPhoto: "javascript:alert(1)",
      }).groomPhoto,
    ).toBeNull();
  });

  it("builds per-event calendar links and an embedded map from the card's own venues", () => {
    const details = getInvitationDetails({
      ...basics,
      additionalEvents: [
        {
          title: "Sangeet",
          date: "14 December 2030",
          time: "6:00 PM IST",
          venue: "City Hall",
          address: "East Wing",
        },
      ],
    });
    const calendar = new URL(
      buildInvitationEventCalendarUrl(details, details.additionalEvents[0])!,
    );
    expect(calendar.searchParams.get("text")).toContain("Sangeet");
    expect(calendar.searchParams.get("location")).toBe("City Hall, East Wing");
    expect(calendar.searchParams.get("dates")).toBe("20301214T123000Z/20301214T143000Z");
    expect(invitationMapEmbedUrl("Garden Pavilion, Patna, Bihar")).toBe(
      "https://www.google.com/maps?q=Garden%20Pavilion%2C%20Patna%2C%20Bihar&output=embed",
    );
    expect(invitationMapEmbedUrl("  ")).toBeNull();
  });

  it("requires a real guest name and rejects placeholders, numbers and initials", () => {
    expect(normalizeGuestName("  Ayesha\u00A0  Khan  ")).toBe("Ayesha Khan");
    for (const good of [
      "Ayesha Khan",
      "Mohammad Obaidullah",
      "A. R. Rahman",
      "Jean-Luc Picard",
      "O'Brien",
      "रेशम बेगम",
    ]) {
      expect(guestNameError(good)).toBeNull();
    }
    for (const bad of [
      "",
      "   ",
      "A",
      "1234",
      "A2",
      "test",
      "guest",
      "a guest",
      "A B",
      "aaaaaaaa",
      "someone@example.com",
      "https://example.com",
      "Ahmed 😀",
      "Ahmed 2",
    ]) {
      expect(guestNameError(bad)).not.toBeNull();
    }
    const base = {
      card_id: "c0000000-0000-4000-8000-000000000001",
      attending: true,
      guests: 1,
      contact: "",
      dietary: "",
      message: "",
    };
    expect(invitationRsvpSchema.safeParse({ ...base, name: "  Ayesha   Khan " }).success).toBe(
      true,
    );
    expect(invitationRsvpSchema.parse({ ...base, name: "  Ayesha   Khan " }).name).toBe(
      "Ayesha Khan",
    );
    for (const bad of ["", "A", "1234", "test"]) {
      expect(invitationRsvpSchema.safeParse({ ...base, name: bad }).success).toBe(false);
    }
  });

  it("validates the insert-only RSVP payload, including attendance and guest count", () => {
    const reply = {
      card_id: "c0000000-0000-4000-8000-000000000001",
      name: " Ayesha Khan ",
      attending: true,
      guests: 2,
      contact: "",
      dietary: "",
      message: "",
    };
    expect(invitationRsvpSchema.parse(reply).name).toBe("Ayesha Khan");
    expect(invitationRsvpSchema.safeParse({ ...reply, guests: 11 }).success).toBe(false);
    expect(invitationRsvpSchema.safeParse({ ...reply, attending: false, guests: 1 }).success).toBe(
      false,
    );
    expect(invitationRsvpSchema.safeParse({ ...reply, card_id: "not-an-id" }).success).toBe(false);
    expect(invitationRsvpSchema.safeParse({ ...reply, name: " " }).success).toBe(false);
  });
});
