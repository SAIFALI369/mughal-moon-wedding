// @vitest-environment node
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  invitationThemeIds,
  invitationThemeCategories,
  invitationThemes,
  invitationMascots,
  isInteractiveLayout,
  playfulCopy,
} from "@/components/wedding/invitation-options";
import { invitationArt } from "@/components/wedding/invitation-art";
import { PersonalInvitation } from "@/components/wedding/invitation-template";
import { paletteForTheme } from "@/lib/print-sheets";

const card = {
  groomName: "Ayaan",
  brideName: "Zara",
  date: "15 December 2030",
  time: "4:00 PM IST",
  venue: "Garden Pavilion",
  address: "Patna, Bihar",
  eventType: "Wedding",
  hosts: "Our families",
  message: "Join us for this joyful day",
  story: "We met at sunrise",
  dressCode: "Festive gold",
  rsvpDeadline: "1 December 2030",
  contactName: "Imran",
  contactPhone: "+91 98765 43210",
  giftsNote: "Your blessings are enough",
  hashtag: "#AyaanWedsZara",
  additionalEvents: [
    {
      title: "Sangeet",
      date: "14 December 2030",
      time: "7:00 PM",
      venue: "Khan House",
      address: "Fraser Road, Patna",
    },
  ],
};

const pageFor = (theme: string) =>
  renderToStaticMarkup(
    <PersonalInvitation
      title="Our Day"
      content={{ ...card, theme: theme as never, framework: "royal-folio" as never }}
      preview
      showGate={false}
    />,
  );

describe("two interactive worlds", () => {
  it("adds Chand Bagh and Mela Maidan as signature themes with artwork and print palettes", () => {
    expect(invitationThemeIds).toHaveLength(23);
    for (const [theme, layout] of [
      ["chand-bagh", "chand-bagh"],
      ["mela-maidan", "mela-maidan"],
    ] as const) {
      const entry = invitationThemes.find((value) => value.id === theme);
      expect(entry).toBeTruthy();
      expect(entry?.layout).toBe(layout);
      expect(entry?.category).toBe("signature");
      expect(invitationArt[theme]).toBeTruthy();
      expect(paletteForTheme(theme).ink).toBeTruthy();
      expect(isInteractiveLayout(layout)).toBe(true);
    }
    const signatureThemes = invitationThemes.filter((theme) => theme.category === "signature");
    expect(signatureThemes).toHaveLength(5);
    expect(invitationThemeCategories).toHaveLength(8);
  });

  it("keeps a cat and a squirrel with names, one pair per world", () => {
    expect(invitationMascots["chand-bagh"].cat).toBe("Noor");
    expect(invitationMascots["chand-bagh"].squirrel).toBe("Gul");
    expect(invitationMascots["mela-maidan"].cat).toBe("Mithai");
    expect(invitationMascots["mela-maidan"].squirrel).toBe("Chintu");
  });

  it("speaks like a game only inside the two worlds", () => {
    expect(playfulCopy("chand-bagh", "rsvp")?.title).toMatch(/walk with us/i);
    expect(playfulCopy("mela-maidan", "wishes")?.title).toMatch(/wish tent/i);
    for (const layout of [
      "moonlit",
      "curtain-call",
      "mandap",
      "folio",
      "chhatri-dawn",
      "baag",
      "single-stroke",
    ] as const) {
      expect(playfulCopy(layout, "rsvp")).toBeNull();
    }
  });

  it("renders the world, the game room and every collectible star", () => {
    for (const [theme, stage, hooks] of [
      ["chand-bagh", "chand-stage", ["chand-names", "chand-constellation", "chand-bubble"]],
      ["mela-maidan", "mela-stage", ["mela-names", "mela-bunting", "mela-bubble"]],
    ] as const) {
      const page = pageFor(theme);
      expect(page).toContain(`data-layout="${theme}"`);
      expect(page).toContain('data-interactive="true"');
      expect(page).toContain(stage);
      expect(page).toContain("invite-world");
      expect(page).toContain("invite-world-dock");
      expect(page).toContain('id="play"');
      expect(page).toContain("play-moon");
      expect(page).toContain("play-riddle");
      expect(page).toContain("play-treasure");
      expect(page).toContain("play-lantern");
      for (const hook of hooks) expect(page).toContain(hook);
      // Nine stars, one per section, each labelled for screen readers.
      expect(page.match(/world-sparkle/g)?.length).toBe(9);
      expect(page).toContain("Collect star 1 of 9");
      // Game copy replaces the plain headings in this world only.
      expect(page).toContain(
        theme === "mela-maidan" ? "Chintu has a ticket for you" : "Noor is waiting",
      );
      expect(page).not.toContain("<video");
      // Every required section still exists.
      for (const id of ["celebration", "schedule", "venue", "gallery", "rsvp", "wishes"]) {
        expect(page).toContain(`id="${id}"`);
      }
      expect(page).toContain("Ayaan");
      expect(page).toContain("Zara");
      expect(page).toContain("#AyaanWedsZara");
    }
  });

  it("leaves every other theme exactly as it was: no world, no game, plain headings", () => {
    for (const theme of invitationThemeIds) {
      if (theme === "chand-bagh" || theme === "mela-maidan") continue;
      const page = pageFor(theme);
      expect(page).not.toContain('data-interactive="true"');
      expect(page).not.toContain("invite-world-dock");
      expect(page).not.toContain('id="play"');
      expect(page).not.toContain("world-sparkle");
      expect(page).toContain("Kindly RSVP");
      expect(page).not.toContain("Chintu has a ticket for you");
    }
  });

  it("styles both worlds, their mascots and a reduced-motion fallback", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    for (const token of [
      '[data-theme="chand-bagh"]',
      '[data-theme="mela-maidan"]',
      ".world-sparkle",
      ".invite-world-dock",
      ".invite-play-grid",
      ".play-moon-disc",
      ".moon-phase-7",
      "prefers-reduced-motion",
      "env(safe-area-inset-bottom)",
    ]) {
      expect(css).toContain(token);
    }
    // A phone must get a single-column game grid and no hover-only affordance.
    expect(css).toContain("@media (max-width: 719px)");
    expect(css).toContain("min-height: 44px");
  });
});
