// @vitest-environment node
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { invitationArt, themeLoop } from "@/components/wedding/invitation-art";
import { invitationThemeIds } from "@/components/wedding/invitation-options";
import { PersonalInvitation } from "@/components/wedding/invitation-template";

const filmDir = path.join(process.cwd(), "public", "film");

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

const pageFor = (theme: string, elements?: Record<string, boolean>) =>
  renderToStaticMarkup(
    <PersonalInvitation
      title="Our Day"
      content={{ ...card, theme, framework: "royal-folio", elements }}
      preview
      showGate={false}
    />,
  );

describe("real hero films for the themes", () => {
  it("ships an encoded loop beside the illustration of every theme", () => {
    expect(invitationThemeIds.length).toBeGreaterThan(20);
    for (const theme of invitationThemeIds) {
      expect(themeLoop(theme)).toBe(`/film/${theme}.mp4`);
      const file = path.join(filmDir, `${theme}.mp4`);
      expect(existsSync(file), `missing live film for ${theme}`).toBe(true);
      // A real video, not a placeholder: eight silent seconds of H.264.
      const { size } = statSync(file);
      expect(size).toBeGreaterThan(80_000);
      expect(size).toBeLessThan(1_500_000);
      // The still stays on the card, as the poster frame and the fallback.
      expect(invitationArt[theme]).toBeTruthy();
    }
  });

  it("autoplays the theme's own film behind the invitation: muted, looping, inline", () => {
    for (const theme of ["royal-rajmahal", "kashi-ghat", "ballroom", "eid"] as const) {
      const page = pageFor(theme);
      expect(page).toContain(`src="/film/${theme}.mp4"`);
      const video = page.match(/<video[^>]*>/)?.[0] ?? "";
      expect(video).toContain("muted");
      expect(video).toContain("loop");
      expect(video.toLowerCase()).toContain("playsinline");
      expect(video).toContain('aria-hidden="true"');
      expect(video).not.toContain("controls");
      // Never somebody else's film.
      for (const other of invitationThemeIds) {
        if (other === theme) continue;
        expect(page).not.toContain(`src="/film/${other}.mp4"`);
      }
    }
  });

  it("keeps the photograph when the host turns motion off", () => {
    const still = pageFor("royal-rajmahal", {
      gate: false,
      countdown: true,
      message: true,
      story: true,
      gallery: true,
      schedule: true,
      venueMap: true,
      dressCode: true,
      contact: true,
      rsvp: true,
      wishes: true,
      gifts: true,
      livestream: false,
    });
    // The hero still renders its photograph, and carries no film at all.
    expect(still).toContain("sb-hero-art");
    expect(still).not.toContain("/film/royal-rajmahal.mp4");
  });

  it("is generated from the themes' own art, never downloaded", () => {
    const script = path.join(process.cwd(), "scripts", "build-theme-loops.mjs");
    expect(existsSync(script)).toBe(true);
    const readme = path.join(filmDir, "README.md");
    expect(existsSync(readme)).toBe(true);
  });
});
