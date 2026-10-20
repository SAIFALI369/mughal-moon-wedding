// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { invitationArt } from "@/components/wedding/invitation-art";
import {
  invitationThemeCategories,
  invitationThemeIds,
  invitationThemes,
} from "@/components/wedding/invitation-options";
import { paletteForTheme } from "@/lib/print-sheets";
import { PersonalInvitation } from "@/components/wedding/invitation-template";

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

const newThemes = ["riad-noor", "kashi-ghat", "mehndi-night"] as const;

describe("three more themes", () => {
  it("registers Riad Noor, Kashi Ghat and Mehndi Night with full artwork", () => {
    expect(invitationThemeIds).toHaveLength(18);
    const labels = invitationThemes.map((theme) => theme.label);
    for (const label of ["Riad Noor", "Kashi Ghat", "Mehndi Night"]) {
      expect(labels).toContain(label);
    }
    for (const theme of newThemes) {
      expect(invitationThemeIds).toContain(theme);
      expect(invitationArt[theme]).toBeTruthy();
    }
  });

  it("keeps a distinct description and swatch for every theme", () => {
    const descriptions = invitationThemes.map((theme) => theme.description);
    const swatches = invitationThemes.map((theme) => theme.swatch);
    expect(new Set(descriptions).size).toBe(invitationThemes.length);
    expect(new Set(swatches).size).toBeGreaterThanOrEqual(12);
  });

  it("gives each new theme a printable palette that is not a copy of an existing one", () => {
    const palettes = invitationThemeIds.map((theme) => paletteForTheme(theme));
    for (const theme of newThemes) {
      const palette = paletteForTheme(theme);
      expect(palette.ink).toBeTruthy();
      expect(palette.paper).toBeTruthy();
    }
    const inks = palettes.map((palette) => palette.ink.toLowerCase());
    expect(new Set(inks).size).toBe(invitationThemeIds.length);
  });
});

describe("theme categories", () => {
  it("groups all eighteen themes into seven labelled groups with no orphan", () => {
    expect(invitationThemeCategories).toHaveLength(7);
    const grouped = invitationThemeCategories.flatMap((category) =>
      invitationThemes.filter((theme) => theme.category === category.id),
    );
    expect(grouped).toHaveLength(invitationThemes.length);
    expect(grouped.map((theme) => theme.id).sort()).toEqual([...invitationThemeIds].sort());
    for (const category of invitationThemeCategories) {
      expect(category.label.length).toBeGreaterThan(0);
      expect(category.description.length).toBeGreaterThan(0);
    }
  });

  it("keeps every group small enough to scan without endless scrolling", () => {
    for (const category of invitationThemeCategories) {
      const size = invitationThemes.filter((theme) => theme.category === category.id).length;
      expect(size).toBeGreaterThan(0);
      expect(size).toBeLessThanOrEqual(5);
    }
  });

  it("places each new theme with its tradition", () => {
    const categoryOf = (id: string) => invitationThemes.find((theme) => theme.id === id)?.category;
    expect(categoryOf("riad-noor")).toBe("islamic");
    expect(categoryOf("kashi-ghat")).toBe("hindu");
    expect(categoryOf("mehndi-night")).toBe("festive");
  });
});

describe("living page", () => {
  it("keeps the artwork behind every section, not just the hero", () => {
    for (const theme of newThemes) {
      const page = pageFor(theme);
      expect(page).toContain('class="invite-backdrop"');
      expect(page).toContain(`data-theme="${theme}"`);
      expect(page).toContain("living-scene living-page");
      expect(page).toContain("living-drapes");
      expect(page).not.toContain("<video");
    }
  });

  it("gives each new theme its own signature living layer, twice over", () => {
    expect(pageFor("riad-noor").match(/living-lanterns/g)).toHaveLength(2);
    expect(pageFor("kashi-ghat").match(/living-river-diyas/g)).toHaveLength(2);
    expect(pageFor("mehndi-night").match(/living-petals/g)).toHaveLength(2);
  });

  it("shows the whole photograph rather than cropping it", () => {
    const page = pageFor("kashi-ghat");
    expect(page).toContain("full-art-fill");
    expect(page).toContain("full-art-image");
    expect(page).not.toMatch(/object-cover[^"]*mandap-scene-art/);
  });
});
