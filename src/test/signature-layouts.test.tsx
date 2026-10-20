// @vitest-environment node
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { invitationArt } from "@/components/wedding/invitation-art";
import {
  invitationThemeIds,
  invitationThemes,
  invitationLayoutFor,
  invitationFrameworkIds,
} from "@/components/wedding/invitation-options";
import { InvitationCover, PersonalInvitation } from "@/components/wedding/invitation-template";
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
  giftsNote: "Your blessings are enough",
  livestreamUrl: "https://example.com/live",
  hashtag: "#AyaanWedsZara",
};

const signatures = {
  "jharokha-dawn": "chhatri-dawn",
  "haldi-baag": "baag",
  "vows-in-ink": "single-stroke",
} as const;

const pageFor = (theme: string, framework = "royal-folio") =>
  renderToStaticMarkup(
    <PersonalInvitation
      title="Our Day"
      content={{ ...card, theme: theme as never, framework: framework as never }}
      preview
      showGate={false}
    />,
  );

const coverFor = (theme: string, framework = "royal-folio") =>
  renderToStaticMarkup(<InvitationCover content={{ ...card, theme, framework }} />);

describe("three signature structures", () => {
  it("registers the three themes, each with its own artwork and print palette", () => {
    expect(invitationThemeIds).toHaveLength(20);
    for (const [theme, layout] of Object.entries(signatures)) {
      expect(invitationThemeIds).toContain(theme);
      expect(invitationArt[theme as keyof typeof invitationArt]).toBeTruthy();
      const entry = invitationThemes.find((value) => value.id === theme);
      expect(entry?.layout).toBe(layout);
      expect(entry?.category).toBe("signature");
      expect(entry?.immersive).toBe(true);
      expect(paletteForTheme(theme).ink).toBeTruthy();
    }
  });

  it("never resolves back to the shared stages", () => {
    const layouts = Object.values(signatures);
    expect(new Set(layouts).size).toBe(3);
    for (const layout of layouts) {
      expect(["moonlit", "curtain-call", "mandap", "folio"]).not.toContain(layout);
    }
    for (const [theme, layout] of Object.entries(signatures)) {
      for (const framework of invitationFrameworkIds) {
        const resolved = invitationLayoutFor(theme as never, framework);
        // The Grand Curtain stays an explicit opt-in on top of every theme.
        expect(resolved).toBe(framework === "curtain-call" ? "curtain-call" : layout);
      }
    }
  });

  it("keeps the older themes on exactly the structure they had", () => {
    for (const theme of invitationThemeIds) {
      if (theme in signatures || theme === "chand-bagh" || theme === "mela-maidan") continue;
      const hindu = ["diya-utsav", "sacred-mandap", "kashi-ghat"].includes(theme);
      expect(invitationLayoutFor(theme, "moonlit")).toBe("moonlit");
      expect(invitationLayoutFor(theme, "curtain-call")).toBe("curtain-call");
      expect(invitationLayoutFor(theme, "royal-folio")).toBe(hindu ? "mandap" : "folio");
      expect(invitationLayoutFor(theme, "modern-mosaic")).toBe(hindu ? "mandap" : "folio");
    }
  });

  it("renders three structurally different openings, never two at once", () => {
    const dawn = pageFor("jharokha-dawn");
    const baag = pageFor("haldi-baag");
    const ink = pageFor("vows-in-ink");

    expect(dawn).toContain('data-layout="chhatri-dawn"');
    expect(dawn).toContain("dawn-stage");
    expect(dawn).toContain("dawn-window");
    expect(dawn).not.toContain("invitation-stage");
    expect(dawn).not.toContain("eid-hero");
    expect(dawn).not.toContain("mandap-stage");

    expect(baag).toContain('data-layout="baag"');
    expect(baag).toContain("baag-stage");
    expect(baag).toContain("baag-garland");
    expect(baag).not.toContain("invitation-stage");
    expect(baag).not.toContain("dawn-stage");

    expect(ink).toContain('data-layout="single-stroke"');
    expect(ink).toContain("ink-stage");
    expect(ink).toContain("ink-thread");
    expect(ink).not.toContain("invitation-stage");
    expect(ink).not.toContain("baag-stage");
    for (const page of [dawn, baag, ink]) {
      expect(page).not.toContain("curtain-stage");
      expect(page).not.toContain("<video");
    }
  });

  it("says the same true things on every structure", () => {
    for (const theme of Object.keys(signatures)) {
      const page = pageFor(theme);
      expect(page).toContain("Ayaan");
      expect(page).toContain("Zara");
      expect(page).toContain("Garden Pavilion");
      expect(page).toContain("Patna, Bihar");
      expect(page).toContain("15 December 2030");
      expect(page).toContain("4:00 PM");
      expect(page).toContain('id="celebration"');
      expect(page).toContain('id="rsvp"');
      expect(page).toContain('id="gifts"');
      expect(page).toContain('id="livestream"');
      expect(page).toContain("#AyaanWedsZara");
    }
  });

  it("gives each theme its own cover frame, not the shared tombstone", () => {
    expect(coverFor("jharokha-dawn")).toContain("dawn-cover");
    expect(coverFor("haldi-baag")).toContain("baag-cover");
    expect(coverFor("vows-in-ink")).toContain("ink-cover");
    expect(coverFor("jharokha-dawn")).toContain('data-layout="chhatri-dawn"');
    expect(coverFor("haldi-baag")).toContain('data-layout="baag"');
    expect(coverFor("vows-in-ink")).toContain('data-layout="single-stroke"');
    expect(coverFor("vows-in-ink")).not.toContain("cover-date-plate");
    for (const theme of Object.keys(signatures)) {
      const cover = coverFor(theme);
      expect(cover).toContain("Ayaan");
      expect(cover).toContain("Zara");
    }
  });

  it("carries each structure past the hero with its own interlude", () => {
    expect(pageFor("jharokha-dawn")).toContain("dawn-interlude");
    expect(pageFor("haldi-baag")).toContain("baag-interlude");
    expect(pageFor("vows-in-ink")).toContain("ink-interlude");
  });

  it("uses three different typefaces and palettes in the stylesheet", () => {
    const css = readFileSync(new URL("../styles.css", import.meta.url), "utf8");
    for (const face of ["Fraunces", "Bricolage Grotesque", "Instrument Serif"]) {
      expect(css).toContain(face);
    }
    const backgrounds = ["jharokha-dawn", "haldi-baag", "vows-in-ink"].map((theme) => {
      const at = css.indexOf(`[data-theme="${theme}"]`);
      const block = css.slice(at);
      return block.split("--background:")[1]?.split(";")[0]?.trim();
    });
    expect(new Set(backgrounds).size).toBe(3);
    for (const value of backgrounds) expect(value).toBeTruthy();
    // The quiet paper theme must not paint fireworks, sparks or diyas on top.
    expect(css).toContain('[data-theme="vows-in-ink"] .living-fireworks');
  });
});
