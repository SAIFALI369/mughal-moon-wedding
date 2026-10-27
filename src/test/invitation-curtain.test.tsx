// @vitest-environment node
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CurtainStage } from "@/components/wedding/invitation-curtain";
import { getInvitationDetails } from "@/components/wedding/invitation-details";
import { Preloader } from "@/components/wedding/sections";
import {
  invitationFrameworkIds,
  invitationThemeIds,
  invitationThemes,
} from "@/components/wedding/invitation-options";
import { invitationArt } from "@/components/wedding/invitation-art";

const details = getInvitationDetails({
  groomName: "Ayaan",
  brideName: "Zara",
  date: "15 December 2030",
  time: "4:00 PM IST",
  venue: "Garden Pavilion",
  address: "Patna, Bihar",
  eventType: "Nikah",
  hosts: "The Khan family",
  theme: "fairytale",
  framework: "curtain-call",
});

const stage = () =>
  renderToStaticMarkup(
    <CurtainStage
      details={details}
      backgroundImage={invitationArt.fairytale}
      actions={<a href="#celebration">See the celebration</a>}
      scrollTo="#countdown"
      entranceDelay={0}
    />,
  );

describe("storybook themes", () => {
  it("adds a fairytale castle and a grand ballroom, each with its own art", () => {
    const labels = invitationThemes.map((theme) => theme.label);
    expect(labels).toContain("Fairytale Castle");
    expect(labels).toContain("Grand Ballroom");
    for (const theme of invitationThemeIds) {
      expect(invitationArt[theme]).toBeTruthy();
    }
    expect(invitationThemeIds).toHaveLength(22);
  });

  it("keeps both new themes light and readable", () => {
    for (const theme of ["fairytale", "ballroom"] as const) {
      const entry = invitationThemes.find((value) => value.id === theme);
      expect(entry?.description.length).toBeGreaterThan(10);
      expect(entry?.swatch).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe("Grand Curtain layout", () => {
  it("is offered as the fifth layout", () => {
    expect(invitationFrameworkIds).toContain("curtain-call");
    expect(invitationFrameworkIds).toHaveLength(5);
  });

  it("stages the names between two velvet curtains in a gilded proscenium", () => {
    const html = stage();
    expect(html).toContain("curtain-stage");
    expect(html).toContain("curtain-panel-left");
    expect(html).toContain("curtain-panel-right");
    expect(html).toContain("curtain-proscenium");
    expect(html).toContain("curtain-arch");
    expect(html).toContain("curtain-valance");
    expect(html).toContain("curtain-rays");
    expect(html).toContain("Enter the celebration");
  });

  it("keeps the couple's own details on the stage", () => {
    const html = stage();
    expect(html).toContain("Ayaan");
    expect(html).toContain("Zara");
    expect(html).toContain("15 December 2030");
    expect(html).toContain("Garden Pavilion");
    expect(html).toContain("The Khan family");
    expect(html).toContain("See the celebration");
    expect(html).toContain('href="#countdown"');
    expect(html).not.toContain("Mohsin");
    expect(html).not.toContain("Simran");
  });

  it("plays the theme's own local film, never a remote asset", () => {
    const html = stage();
    expect(html).toContain("<video");
    expect(html).toContain('src="/film/fairytale.mp4"');
    expect(html).not.toContain("<iframe");
    // The only assets are the card's own bundled artwork (full image plus its
    // blurred fill), never a remote host.
    const sources = [...html.matchAll(/src="([^"]+)"/g)].map((match) => match[1]);
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      expect(source).toMatch(/fairytale/);
      expect(source).not.toMatch(/^https?:/);
    }
  });

  it("opens the gate as velvet curtains for this layout only", () => {
    const curtainGate = renderToStaticMarkup(<Preloader onDone={() => {}} curtain />);
    expect(curtainGate).toContain("is-curtain");
    expect(curtainGate).toContain("gate-left");
    expect(curtainGate).toContain("gate-right");

    const plainGate = renderToStaticMarkup(<Preloader onDone={() => {}} />);
    expect(plainGate).not.toContain("is-curtain");
  });
});
