// @vitest-environment node
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getInvitationDetails } from "@/components/wedding/invitation-details";
import { invitationThemeIds } from "@/components/wedding/invitation-options";
import {
  buildCardUnavailableMeta,
  buildInvitationSocialMeta,
  buildSiteSocialMeta,
  demoEidDetails,
  themeOgImage,
} from "@/lib/social-preview";

function metaMap(tags: Array<Record<string, string | undefined>>) {
  const byKey = new Map<string, string>();
  for (const tag of tags) {
    if (tag.title) byKey.set("title", tag.title);
    const key = tag.property ?? tag.name;
    if (key && tag.content !== undefined) byKey.set(key, tag.content);
  }
  return byKey;
}

describe("WhatsApp & Instagram entrance-door link previews", () => {
  it("ships a crisp 1200x630 JPEG entrance-door image for every one of the 22 themes", () => {
    for (const theme of invitationThemeIds) {
      const file = path.join(process.cwd(), "public", "og", "themes", `${theme}.jpg`);
      expect(existsSync(file), `missing public/og/themes/${theme}.jpg`).toBe(true);
      expect(statSync(file).size).toBeGreaterThan(10_000);
    }
  });

  it("uses each card's own entrance-door JPEG as absolute og:image and twitter:image", () => {
    const details = getInvitationDetails({
      groomName: "Ayaan",
      brideName: "Zara",
      eventType: "Nikah ceremony",
      date: "22/11/2029",
      time: "4:00 PM IST",
      venue: "Patna Club",
      theme: "royal-rajmahal",
    });

    const tags = metaMap(
      buildInvitationSocialMeta({
        details,
        path: "/invite/ayaan-zara",
        origin: "https://invitingyou.vercel.app",
      }),
    );

    expect(tags.get("og:image")).toBe(
      "https://invitingyou.vercel.app/og/themes/royal-rajmahal.jpg",
    );
    expect(tags.get("twitter:image")).toBe(
      "https://invitingyou.vercel.app/og/themes/royal-rajmahal.jpg",
    );
    expect(tags.get("og:image:type")).toBe("image/jpeg");
    expect(tags.get("og:image:width")).toBe("1200");
    expect(tags.get("og:image:height")).toBe("630");
    expect(tags.get("twitter:card")).toBe("summary_large_image");
    expect(tags.get("title")).toBe("Ayaan & Zara — Nikah Ceremony");
    expect(tags.get("og:title")).toBe("Ayaan & Zara — Nikah Ceremony");
    expect(tags.get("og:description")).toContain("Ayaan & Zara");
    expect(tags.get("og:url")).toBe("https://invitingyou.vercel.app/invite/ayaan-zara");
  });

  it("uses the Eid Noor Arch entrance door for eid links on both Lovable and custom hosts", () => {
    expect(themeOgImage("eid", "https://mughal-moon-wedding.lovable.app").url).toBe(
      "https://mughal-moon-wedding.lovable.app/__l5e/assets-v1/6b3af34a-3e2b-49b9-bb30-166aa75d3dc4/noor-arch-cover.jpg",
    );
    expect(themeOgImage("eid", "https://invitingyou.vercel.app").url).toBe(
      "https://invitingyou.vercel.app/og/eid-door.jpg",
    );
  });

  it("shows personalized guest invitation text when a personal ?guest= link is shared", () => {
    const details = getInvitationDetails({
      groomName: "Ayaan",
      brideName: "Zara",
      eventType: "Wedding ceremony",
      date: "26/11/2029",
      time: "7:00 PM IST",
      venue: "Maurya Palace",
      theme: "fairytale",
    });

    const tags = metaMap(
      buildInvitationSocialMeta({
        details,
        path: "/invite/ayaan-zara",
        guest: "  Uncle Ahmed &\n Family  ",
        origin: "https://mughal-moon-wedding.lovable.app",
      }),
    );

    expect(tags.get("title")).toBe(
      "Uncle Ahmed & Family is invited to Ayaan & Zara's Wedding Ceremony",
    );
    expect(tags.get("og:title")).toBe(
      "Uncle Ahmed & Family is invited to Ayaan & Zara's Wedding Ceremony",
    );
    expect(tags.get("og:description")).toContain(
      "Uncle Ahmed & Family is warmly invited to Ayaan & Zara's Wedding Ceremony",
    );
    expect(tags.get("og:description")).toContain("Maurya Palace");
    expect(tags.get("og:image")).toBe(
      "https://mughal-moon-wedding.lovable.app/og/themes/fairytale.jpg",
    );
    expect(tags.get("og:url")).toBe(
      "https://mughal-moon-wedding.lovable.app/invite/ayaan-zara?guest=Uncle%20Ahmed%20%26%20Family",
    );
  });

  it("personalizes the /demo link preview with Mohsin & Simran's Eid entrance door", () => {
    const tags = metaMap(
      buildInvitationSocialMeta({
        details: demoEidDetails(),
        path: "/demo",
        guest: "Sara Khan",
        origin: "https://invitingyou.vercel.app",
      }),
    );

    expect(tags.get("og:title")).toBe(
      "Sara Khan is invited to Mohsin & Simran's Nikah, Barat & Walima",
    );
    expect(tags.get("og:image")).toBe("https://invitingyou.vercel.app/og/eid-door.jpg");
    expect(tags.get("og:url")).toBe("https://invitingyou.vercel.app/demo?guest=Sara%20Khan");
  });

  it("always emits a site-wide social preview image for general pages and unavailable cards", () => {
    const unavailable = metaMap(buildCardUnavailableMeta("https://invitingyou.vercel.app"));
    expect(unavailable.get("robots")).toBe("noindex");
    expect(unavailable.get("og:image")).toBe("https://invitingyou.vercel.app/social-preview.jpg");

    const home = metaMap(
      buildSiteSocialMeta({
        title: "InvitingYou",
        description: "Digital wedding invitations",
        origin: "https://invitingyou.vercel.app",
        path: "/",
      }),
    );
    expect(home.get("og:image")).toBe("https://invitingyou.vercel.app/social-preview.jpg");
    expect(home.get("twitter:image")).toBe("https://invitingyou.vercel.app/social-preview.jpg");
    expect(home.get("og:image:type")).toBe("image/jpeg");
  });
});
